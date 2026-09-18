import { Router } from 'express'
import type Stripe from 'stripe'
import { db, getOverride } from '../db.ts'
import { stripe } from '../stripe.ts'
import { rawBody } from '../bodyParser.ts'
import { env, paymentsEnabled } from '../env.ts'
import { pointsForSpend } from '../loyalty.ts'
import { sendOrderEmails } from '../email.ts'

export const webhookRouter = Router()

webhookRouter.post('/webhooks/stripe', rawBody(), async (req, res) => {
  if (!paymentsEnabled()) {
    res.status(503).end()
    return
  }

  // Stripe's SDK types accept `string | Buffer` — decode once, use the string form
  // throughout, avoiding a Uint8Array/Buffer type mismatch under Workers.
  const rawText = new TextDecoder().decode(req.body as Uint8Array)

  let event: Stripe.Event
  try {
    if (env.stripeWebhookSecret) {
      // constructEvent() is synchronous and relies on Node's sync crypto — the fetch-based
      // HTTP client we use for Workers compatibility (see server/stripe.ts) pairs with an
      // async SubtleCrypto-backed provider instead, so this throws
      // ("SubtleCryptoProvider cannot be used in a synchronous context") unless we await
      // constructEventAsync() here.
      event = await stripe().webhooks.constructEventAsync(
        rawText,
        req.headers['stripe-signature'] as string,
        env.stripeWebhookSecret,
      )
    } else {
      event = JSON.parse(rawText) as Stripe.Event
    }
  } catch (err) {
    console.error('[webhook] signature verification failed', err)
    res.status(400).send('bad signature')
    return
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.created'
    ) {
      await upsertSubscription(event.data.object as Stripe.Subscription)
    }
  } catch (err) {
    console.error('[webhook] handler error', err)
  }

  res.json({ received: true })
})

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const reference = session.client_reference_id || session.metadata?.reference || ''
  const order = await db
    .prepare('SELECT * FROM orders WHERE reference = ? OR stripe_session_id = ?')
    .bind(reference, session.id)
    .first<{
      id: number
      status: string
      customer_id: number | null
      subtotal_cents: number
      is_subscription: number
      discount_code: string | null
    }>()
  if (!order || order.status !== 'pending') return

  const addr = session.customer_details?.address
  const shippingAddress = addr
    ? [
        session.customer_details?.name,
        addr.line1,
        addr.line2,
        [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
        addr.country,
      ]
        .filter(Boolean)
        .join('\n')
    : null

  const pointsEarned = pointsForSpend(order.subtotal_cents)

  const batch = [
    db
      .prepare(
        `UPDATE orders
           SET status = 'paid', email = ?, customer_name = ?, shipping_address = ?,
               shipping_cents = ?, total_cents = ?, points_earned = ?
         WHERE id = ?`,
      )
      .bind(
        session.customer_details?.email ?? null,
        session.customer_details?.name ?? null,
        shippingAddress,
        session.total_details?.amount_shipping ?? 0,
        session.amount_total ?? order.subtotal_cents,
        pointsEarned,
        order.id,
      ),
  ]

  if (order.discount_code) {
    batch.push(
      db
        .prepare('UPDATE discount_codes SET redeemed_count = redeemed_count + 1 WHERE code = ?')
        .bind(order.discount_code),
    )
  }

  // stock
  const { results: items } = await db
    .prepare('SELECT product_handle, quantity, title, variant_title, price_cents FROM order_items WHERE order_id = ?')
    .bind(order.id)
    .all<{ product_handle: string; quantity: number; title: string; variant_title: string | null; price_cents: number }>()
  for (const it of items) {
    if (await getOverride(it.product_handle)) {
      batch.push(
        db
          .prepare('UPDATE product_overrides SET stock = MAX(0, stock - ?) WHERE handle = ?')
          .bind(it.quantity, it.product_handle),
      )
    }
  }

  // loyalty points for signed-in customers
  const customerId =
    order.customer_id ?? (session.metadata?.customerId ? Number(session.metadata.customerId) : null)
  if (customerId && pointsEarned > 0) {
    batch.push(
      db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').bind(pointsEarned, customerId),
      db
        .prepare('INSERT INTO points_ledger (customer_id, delta, reason, order_reference) VALUES (?, ?, ?, ?)')
        .bind(customerId, pointsEarned, 'Order ' + reference, reference),
    )
    if (!order.customer_id) {
      batch.push(db.prepare('UPDATE orders SET customer_id = ? WHERE id = ?').bind(customerId, order.id))
    }
  }

  await db.batch(batch)

  console.log(`[webhook] order ${reference} paid (+${pointsEarned} pts)`)

  await sendOrderEmails({
    reference,
    email: session.customer_details?.email ?? null,
    name: session.customer_details?.name ?? null,
    shippingAddress,
    totalCents: session.amount_total ?? order.subtotal_cents,
    shippingCents: session.total_details?.amount_shipping ?? 0,
    pointsEarned,
    items,
  })
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const customer = await db
    .prepare('SELECT id FROM customers WHERE stripe_customer_id = ?')
    .bind(typeof sub.customer === 'string' ? sub.customer : sub.customer.id)
    .first<{ id: number }>()
  if (!customer) return

  const item = sub.items.data[0]
  const price = item?.price
  const periodEndUnix =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null
  const existing = await db
    .prepare('SELECT id FROM subscriptions WHERE stripe_subscription_id = ?')
    .bind(sub.id)
    .first<{ id: number }>()

  if (existing) {
    await db
      .prepare('UPDATE subscriptions SET status = ?, current_period_end = ?, quantity = ? WHERE stripe_subscription_id = ?')
      .bind(sub.status, periodEnd, item?.quantity ?? 1, sub.id)
      .run()
  } else {
    const name = (price?.nickname || (typeof price?.product === 'string' ? '' : price?.product && 'name' in price.product ? price.product.name : '') || 'Aroma Sense subscription') as string
    await db
      .prepare(
        `INSERT INTO subscriptions
          (customer_id, stripe_subscription_id, status, product_handle, variant_id, title,
           variant_title, unit_price_cents, quantity, interval, current_period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        customer.id,
        sub.id,
        sub.status,
        '',
        0,
        name,
        null,
        price?.unit_amount ?? 0,
        item?.quantity ?? 1,
        price?.recurring?.interval ?? 'month',
        periodEnd,
      )
      .run()
  }
  console.log(`[webhook] subscription ${sub.id} -> ${sub.status}`)
}
