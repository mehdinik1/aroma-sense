import { Router } from 'express'
import type Stripe from 'stripe'
import { z } from 'zod'
import { db, newOrderReference } from '../db.ts'
import { getVariant } from '../catalog.ts'
import { stripe } from '../stripe.ts'
import { env } from '../env.ts'
import { currentCustomer } from '../customerAuth.ts'
import { loyalty, maxRedeemablePoints, redeemCents, SUBSCRIBABLE_TYPES } from '../loyalty.ts'
import { EXPEDITED_SHIPPING_CENTS, standardShippingCents } from '../../src/lib/shipping.ts'

export const checkoutRouter = Router()

const schema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.number().int(),
        quantity: z.number().int().min(1).max(20),
        subscribe: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(50),
  pointsToRedeem: z.number().int().min(0).optional(),
  /** "Build your kit" bundle — server re-checks the contents before discounting */
  kit: z.boolean().optional(),
  // express consent to ONE cart reminder email if they don't finish (unticked box on the cart page)
  reminderEmail: z.string().trim().email().max(200).optional(),
  discountCode: z.string().trim().max(40).optional(),
})

const KIT_DISCOUNT_PCT = 10

checkoutRouter.post('/checkout', async (req, res) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Your cart looks invalid. Please refresh and try again.' })
    return
  }

  const customer = await currentCustomer(req)

  // Recompute every line from the server catalog — never trust client prices.
  const lineItems: {
    variantId: number
    handle: string
    title: string
    variantTitle: string | null
    productType: string
    priceCents: number
    quantity: number
    image: string | null
    subscribe: boolean
  }[] = []

  for (const item of parsed.data.items) {
    const found = await getVariant(item.variantId)
    if (!found || !found.product.visible) {
      res.status(400).json({ error: 'One of the items in your cart is no longer available.' })
      return
    }
    if (found.product.stock < item.quantity) {
      res.status(400).json({ error: `"${found.product.title}" is low on stock. Please reduce the quantity.` })
      return
    }
    const subscribe = !!item.subscribe && SUBSCRIBABLE_TYPES.has(found.product.productType)
    const unit = subscribe
      ? Math.round(found.variant.priceCents * (1 - loyalty.subscriptionDiscountPct / 100))
      : found.variant.priceCents
    lineItems.push({
      variantId: item.variantId,
      handle: found.product.handle,
      title: found.product.title,
      variantTitle: found.variant.title,
      productType: found.product.productType,
      priceCents: unit,
      quantity: item.quantity,
      image: found.product.images[0] ?? null,
      subscribe,
    })
  }

  const isSubscription = lineItems.every((l) => l.subscribe)
  const hasSubscription = lineItems.some((l) => l.subscribe)
  if (hasSubscription && !isSubscription) {
    res.status(400).json({
      error:
        'Subscribe & Save items must be checked out on their own. Please place your subscription order separately from one-time items.',
    })
    return
  }
  if (isSubscription && !customer) {
    res.status(401).json({ error: 'Please sign in to start a subscription.', code: 'auth_required' })
    return
  }

  const subtotalCents = lineItems.reduce((n, l) => n + l.priceCents * l.quantity, 0)

  // "Build your kit" 10% bundle discount — re-validate contents server-side
  let discountCents = 0
  let kitApplied = false
  if (parsed.data.kit && !isSubscription) {
    const types = new Set(lineItems.map((l) => l.productType))
    const hasHead = types.has('Shower Heads')
    const hasCartridge = lineItems.some((l) => /cartridge/i.test(l.title))
    const hasFilter = lineItems.some((l) => /microfiber|filter/i.test(l.title))
    const hasBeads = lineItems.some((l) => /ceramic bead/i.test(l.title))
    if (hasHead && hasCartridge && hasFilter && hasBeads) {
      kitApplied = true
      discountCents += Math.round(subtotalCents * (KIT_DISCOUNT_PCT / 100))
    }
  }

  // discount code (one-time orders only)
  let appliedCode: string | null = null
  if (parsed.data.discountCode && !isSubscription) {
    const code = parsed.data.discountCode.trim().toUpperCase()
    const row = await db
      .prepare('SELECT * FROM discount_codes WHERE code = ?')
      .bind(code)
      .first<{ code: string; percent_off: number; active: number; max_redemptions: number | null; redeemed_count: number }>()
    if (!row || !row.active || (row.max_redemptions != null && row.redeemed_count >= row.max_redemptions)) {
      res.status(400).json({ error: 'That discount code is not valid.' })
      return
    }
    appliedCode = row.code
    discountCents += Math.round((subtotalCents - discountCents) * (row.percent_off / 100))
  }

  // points redemption (one-time orders only)
  let pointsRedeemed = 0
  if (!isSubscription && customer && parsed.data.pointsToRedeem) {
    const remaining = subtotalCents - discountCents
    const max = maxRedeemablePoints(customer.points, remaining)
    pointsRedeemed = Math.min(parsed.data.pointsToRedeem, max)
    pointsRedeemed = Math.floor(pointsRedeemed / loyalty.redeemStep) * loyalty.redeemStep
    discountCents += redeemCents(pointsRedeemed)
  }

  const reference = newOrderReference()

  let stripeClient
  try {
    stripeClient = stripe()
  } catch (err) {
    const e = err as { message: string; status?: number; code?: string }
    res.status(e.status || 503).json({ error: e.message, code: e.code || 'payments_disabled' })
    return
  }

  try {
    // reuse / create a Stripe customer for logged-in shoppers
    let stripeCustomerId = customer?.stripe_customer_id ?? undefined
    if (customer && !stripeCustomerId) {
      const created = await stripeClient.customers.create({
        email: customer.email,
        name: customer.name ?? undefined,
      })
      stripeCustomerId = created.id
      await db.prepare('UPDATE customers SET stripe_customer_id = ? WHERE id = ?').bind(stripeCustomerId, customer.id).run()
    }

    const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: 'Standard shipping (3–6 business days)',
          fixed_amount: { amount: standardShippingCents(subtotalCents), currency: 'usd' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 6 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: 'Expedited shipping (2 business days)',
          fixed_amount: { amount: EXPEDITED_SHIPPING_CENTS, currency: 'usd' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 1 },
            maximum: { unit: 'business_day', value: 2 },
          },
        },
      },
    ]

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${env.appUrl}/checkout/success?ref=${reference}`,
      cancel_url: `${env.appUrl}/cart?canceled=1`,
      client_reference_id: reference,
      currency: 'usd',
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      metadata: { reference, customerId: customer ? String(customer.id) : '', pointsRedeemed: String(pointsRedeemed) },
      line_items: lineItems.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: l.priceCents,
          ...(isSubscription ? { recurring: { interval: 'month' as const } } : {}),
          product_data: {
            name:
              l.title +
              (l.variantTitle ? ` — ${l.variantTitle}` : '') +
              (l.subscribe ? ' (Subscribe & Save)' : ''),
            images: l.image ? [`${env.appUrl}${l.image}`] : undefined,
          },
        },
      })),
    }

    if (isSubscription) {
      params.customer = stripeCustomerId
    } else {
      params.shipping_options = shippingOptions
      if (stripeCustomerId) params.customer = stripeCustomerId
      else params.customer_creation = 'always'
      if (discountCents > 0) {
        const label = [
          kitApplied ? `Build-your-kit ${KIT_DISCOUNT_PCT}% off` : '',
          appliedCode ? `Code ${appliedCode}` : '',
          pointsRedeemed > 0 ? `${pointsRedeemed} points` : '',
        ]
          .filter(Boolean)
          .join(' + ')
        params.discounts = [
          {
            coupon: (
              await stripeClient.coupons.create({
                amount_off: discountCents,
                currency: 'usd',
                duration: 'once',
                name: label || 'Aroma Sense discount',
              })
            ).id,
          },
        ]
      }
    }

    const session = await stripeClient.checkout.sessions.create(params)

    const orderInsert = await db
      .prepare(
        `INSERT INTO orders
           (reference, status, subtotal_cents, shipping_cents, discount_cents, total_cents,
            stripe_session_id, customer_id, points_redeemed, is_subscription, discount_code,
            checkout_url, reminder_email, reminder_consent_at)
         VALUES (?, 'pending', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        reference,
        subtotalCents,
        discountCents,
        Math.max(0, subtotalCents - discountCents),
        session.id,
        customer?.id ?? null,
        pointsRedeemed,
        isSubscription ? 1 : 0,
        appliedCode,
        session.url ?? null,
        parsed.data.reminderEmail?.toLowerCase() ?? null,
        parsed.data.reminderEmail ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null,
      )
      .run()
    const orderId = orderInsert.meta.last_row_id

    // order items + the points hold (if any) — grouped into one atomic batch
    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_handle, variant_id, title, variant_title, price_cents, quantity, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const batch = lineItems.map((l) =>
      insertItem.bind(orderId, l.handle, l.variantId, l.title, l.variantTitle, l.priceCents, l.quantity, l.image),
    )
    // hold the redeemed points immediately so they can't be double-spent
    if (pointsRedeemed > 0 && customer) {
      batch.push(
        db.prepare('UPDATE customers SET points = points - ? WHERE id = ?').bind(pointsRedeemed, customer.id),
        db
          .prepare('INSERT INTO points_ledger (customer_id, delta, reason, order_reference) VALUES (?, ?, ?, ?)')
          .bind(customer.id, -pointsRedeemed, 'Redeemed at checkout', reference),
      )
    }
    await db.batch(batch)

    res.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] stripe error', err)
    res.status(502).json({ error: 'We could not start checkout. Please try again in a moment.' })
  }
})
