import { Router, raw } from 'express'
import type Stripe from 'stripe'
import { db, getOverride } from '../db.ts'
import { stripe } from '../stripe.ts'
import { env, paymentsEnabled } from '../env.ts'
import { pointsForSpend } from '../loyalty.ts'

export const webhookRouter = Router()

webhookRouter.post('/webhooks/stripe', raw({ type: 'application/json' }), (req, res) => {
  if (!paymentsEnabled()) {
    res.status(503).end()
    return
  }

  let event: Stripe.Event
  try {
    if (env.stripeWebhookSecret) {
      event = stripe().webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'] as string,
        env.stripeWebhookSecret,
      )
    } else {
      event = JSON.parse(req.body.toString()) as Stripe.Event
    }
  } catch (err) {
    console.error('[webhook] signature verification failed', err)
    res.status(400).send('bad signature')
    return
  }

  try {
    if (event.type === 'checkout.session.completed') {
      handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.created'
    ) {
      upsertSubscription(event.data.object as Stripe.Subscription)
    }
  } catch (err) {
    console.error('[webhook] handler error', err)
  }

  res.json({ received: true })
})

function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const reference = session.client_reference_id || session.metadata?.reference || ''
  const order = db
    .prepare('SELECT * FROM orders WHERE reference = ? OR stripe_session_id = ?')
    .get(reference, session.id) as
    | {
        id: number
        status: string
        customer_id: number | null
        subtotal_cents: number
        is_subscription: number
        discount_code: string | null
      }
    | undefined
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

  db.prepare(
    `UPDATE orders
       SET status = 'paid', email = ?, customer_name = ?, shipping_address = ?,
           shipping_cents = ?, total_cents = ?, points_earned = ?
     WHERE id = ?`,
  ).run(
    session.customer_details?.email ?? null,
    session.customer_details?.name ?? null,
    shippingAddress,
    session.total_details?.amount_shipping ?? 0,
    session.amount_total ?? order.subtotal_cents,
    pointsEarned,
    order.id,
  )

  if (order.discount_code) {
    db.prepare('UPDATE discount_codes SET redeemed_count = redeemed_count + 1 WHERE code = ?').run(
      order.discount_code,
    )
  }

  // stock
  const items = db
    .prepare('SELECT product_handle, quantity FROM order_items WHERE order_id = ?')
    .all(order.id) as { product_handle: string; quantity: number }[]
  const dec = db.prepare('UPDATE product_overrides SET stock = MAX(0, stock - ?) WHERE handle = ?')
  for (const it of items) if (getOverride(it.product_handle)) dec.run(it.quantity, it.product_handle)

  // loyalty points for signed-in customers
  const customerId =
    order.customer_id ?? (session.metadata?.customerId ? Number(session.metadata.customerId) : null)
  if (customerId && pointsEarned > 0) {
    db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(pointsEarned, customerId)
    db.prepare(
      'INSERT INTO points_ledger (customer_id, delta, reason, order_reference) VALUES (?, ?, ?, ?)',
    ).run(customerId, pointsEarned, 'Order ' + reference, reference)
    if (!order.customer_id) {
      db.prepare('UPDATE orders SET customer_id = ? WHERE id = ?').run(customerId, order.id)
    }
  }

  console.log(`[webhook] order ${reference} paid (+${pointsEarned} pts)`)
}

function upsertSubscription(sub: Stripe.Subscription) {
  const customer = db
    .prepare('SELECT id FROM customers WHERE stripe_customer_id = ?')
    .get(typeof sub.customer === 'string' ? sub.customer : sub.customer.id) as { id: number } | undefined
  if (!customer) return

  const item = sub.items.data[0]
  const price = item?.price
  const periodEndUnix =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null
  const existing = db
    .prepare('SELECT id FROM subscriptions WHERE stripe_subscription_id = ?')
    .get(sub.id) as { id: number } | undefined

  if (existing) {
    db.prepare(
      'UPDATE subscriptions SET status = ?, current_period_end = ?, quantity = ? WHERE stripe_subscription_id = ?',
    ).run(sub.status, periodEnd, item?.quantity ?? 1, sub.id)
  } else {
    const name = (price?.nickname || (typeof price?.product === 'string' ? '' : price?.product && 'name' in price.product ? price.product.name : '') || 'Aroma Sense subscription') as string
    db.prepare(
      `INSERT INTO subscriptions
        (customer_id, stripe_subscription_id, status, product_handle, variant_id, title,
         variant_title, unit_price_cents, quantity, interval, current_period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
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
  }
  console.log(`[webhook] subscription ${sub.id} -> ${sub.status}`)
}
