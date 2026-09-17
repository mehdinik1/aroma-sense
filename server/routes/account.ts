import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db.ts'
import {
  clearCustomerSession,
  currentCustomer,
  issueCustomerSession,
  publicCustomer,
  requireCustomer,
  type CustomerRow,
} from '../customerAuth.ts'
import { loyalty, pointsForSpend } from '../loyalty.ts'
import { stripe } from '../stripe.ts'
import { env } from '../env.ts'
import type { OrderItem } from '../../src/lib/types.ts'

export const accountRouter = Router()

const creds = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120).optional(),
})

accountRouter.post('/register', (req, res) => {
  const parsed = creds.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Use a valid email and a password of at least 8 characters.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const exists = db.prepare('SELECT id FROM customers WHERE email = ?').get(email)
  if (exists) {
    res.status(409).json({ error: 'An account with that email already exists.' })
    return
  }
  const id = db
    .prepare('INSERT INTO customers (email, password_hash, name) VALUES (?, ?, ?)')
    .run(email, bcrypt.hashSync(parsed.data.password, 10), parsed.data.name ?? null)
    .lastInsertRowid as number

  // link any past guest orders with this email + award their points
  linkGuestOrders(id, email)

  issueCustomerSession(res, id)
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow
  res.json({ customer: publicCustomer(customer) })
})

accountRouter.post('/login', (req, res) => {
  const parsed = z
    .object({ email: z.string().trim().email(), password: z.string().min(1) })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter your email and password.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const row = db.prepare('SELECT * FROM customers WHERE email = ?').get(email) as CustomerRow | undefined
  if (!row || !bcrypt.compareSync(parsed.data.password, row.password_hash)) {
    res.status(401).json({ error: 'Incorrect email or password.' })
    return
  }
  issueCustomerSession(res, row.id)
  res.json({ customer: publicCustomer(row) })
})

accountRouter.post('/logout', (_req, res) => {
  clearCustomerSession(res)
  res.json({ ok: true })
})

accountRouter.get('/me', (req, res) => {
  const c = currentCustomer(req)
  if (!c) {
    res.status(401).json({ error: 'Not signed in', code: 'unauthenticated' })
    return
  }
  res.json({
    customer: publicCustomer(c),
    rewards: {
      points: c.points,
      valueCents: (c.points / loyalty.redeemStep) * loyalty.redeemValueCents,
      pointsPerDollar: loyalty.pointsPerDollar,
      redeemStep: loyalty.redeemStep,
      redeemValueCents: loyalty.redeemValueCents,
    },
  })
})

// ---- orders --------------------------------------------------------------

function hydrateOrder(row: Record<string, unknown>) {
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .all(row.id as number) as Record<string, unknown>[]
  return {
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    discountCents: row.discount_cents,
    discountCode: row.discount_code,
    totalCents: row.total_cents,
    pointsEarned: row.points_earned,
    pointsRedeemed: row.points_redeemed,
    trackingNumber: row.tracking_number,
    shippingAddress: row.shipping_address,
    isSubscription: !!row.is_subscription,
    items: items.map<OrderItem>((it) => ({
      productHandle: it.product_handle as string,
      variantId: it.variant_id as number,
      title: it.title as string,
      variantTitle: it.variant_title as string | null,
      priceCents: it.price_cents as number,
      quantity: it.quantity as number,
      image: it.image as string | null,
    })),
  }
}

accountRouter.use(requireCustomer)

function reqCustomer(req: import('express').Request) {
  return (req as import('express').Request & { customer: CustomerRow }).customer
}

// ---- profile --------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(200).optional(),
})

accountRouter.patch('/me', (req, res) => {
  const c = reqCustomer(req)
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Please check the form and try again.' })
    return
  }
  const { name, email, currentPassword, newPassword } = parsed.data

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, c.password_hash)) {
      res.status(401).json({ error: 'Current password is incorrect.' })
      return
    }
    db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').run(
      bcrypt.hashSync(newPassword, 10),
      c.id,
    )
  }

  if (email !== undefined) {
    const normalized = email.toLowerCase()
    if (normalized !== c.email) {
      const exists = db.prepare('SELECT id FROM customers WHERE email = ? AND id != ?').get(normalized, c.id)
      if (exists) {
        res.status(409).json({ error: 'An account with that email already exists.' })
        return
      }
      db.prepare('UPDATE customers SET email = ? WHERE id = ?').run(normalized, c.id)
    }
  }

  if (name !== undefined) {
    db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name || null, c.id)
  }

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(c.id) as CustomerRow
  res.json({ customer: publicCustomer(updated) })
})

// ---- wishlist ---------------------------------------------------------

function listWishlist(customerId: number): string[] {
  return (
    db
      .prepare('SELECT product_handle FROM wishlist_items WHERE customer_id = ? ORDER BY id DESC')
      .all(customerId) as { product_handle: string }[]
  ).map((r) => r.product_handle)
}

accountRouter.get('/wishlist', (req, res) => {
  res.json({ handles: listWishlist(reqCustomer(req).id) })
})

accountRouter.post('/wishlist', (req, res) => {
  const parsed = z.object({ handle: z.string().trim().min(1).max(200) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid product.' })
    return
  }
  const c = reqCustomer(req)
  db.prepare(
    'INSERT INTO wishlist_items (customer_id, product_handle) VALUES (?, ?) ON CONFLICT(customer_id, product_handle) DO NOTHING',
  ).run(c.id, parsed.data.handle)
  res.json({ handles: listWishlist(c.id) })
})

accountRouter.delete('/wishlist/:handle', (req, res) => {
  const c = reqCustomer(req)
  db.prepare('DELETE FROM wishlist_items WHERE customer_id = ? AND product_handle = ?').run(
    c.id,
    req.params.handle,
  )
  res.json({ handles: listWishlist(c.id) })
})

accountRouter.get('/orders', (req, res) => {
  const c = reqCustomer(req)
  const rows = db
    .prepare(
      `SELECT * FROM orders
       WHERE (customer_id = ? OR (email IS NOT NULL AND lower(email) = ?))
         AND status IN ('paid','fulfilled','cancelled')
       ORDER BY id DESC`,
    )
    .all(c.id, c.email) as Record<string, unknown>[]
  res.json(rows.map(hydrateOrder))
})

accountRouter.get('/orders/:reference', (req, res) => {
  const c = reqCustomer(req)
  const row = db
    .prepare(
      `SELECT * FROM orders WHERE reference = ? AND (customer_id = ? OR lower(email) = ?)`,
    )
    .get(req.params.reference, c.id, c.email) as Record<string, unknown> | undefined
  if (!row) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }
  res.json(hydrateOrder(row))
})

// ---- addresses ----------------------------------------------------------

const addressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().min(3).max(20),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
})

function listAddresses(customerId: number) {
  return (
    db.prepare('SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC').all(
      customerId,
    ) as Record<string, unknown>[]
  ).map((a) => ({
    id: a.id,
    name: a.name,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postalCode: a.postal_code,
    phone: a.phone,
    isDefault: !!a.is_default,
  }))
}

accountRouter.get('/addresses', (req, res) => {
  res.json(listAddresses(reqCustomer(req).id))
})

accountRouter.post('/addresses', (req, res) => {
  const parsed = addressSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Please complete all required address fields.' })
    return
  }
  const c = reqCustomer(req)
  const d = parsed.data
  const count = (db.prepare('SELECT COUNT(*) AS n FROM addresses WHERE customer_id = ?').get(c.id) as { n: number }).n
  const makeDefault = d.isDefault || count === 0
  if (makeDefault) db.prepare('UPDATE addresses SET is_default = 0 WHERE customer_id = ?').run(c.id)
  db.prepare(
    `INSERT INTO addresses (customer_id, name, line1, line2, city, state, postal_code, phone, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(c.id, d.name, d.line1, d.line2 || null, d.city, d.state, d.postalCode, d.phone || null, makeDefault ? 1 : 0)
  res.json(listAddresses(c.id))
})

accountRouter.patch('/addresses/:id', (req, res) => {
  const parsed = addressSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const c = reqCustomer(req)
  const owned = db.prepare('SELECT id FROM addresses WHERE id = ? AND customer_id = ?').get(
    Number(req.params.id),
    c.id,
  )
  if (!owned) {
    res.status(404).json({ error: 'Address not found.' })
    return
  }
  const d = parsed.data
  if (d.isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE customer_id = ?').run(c.id)
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(Number(req.params.id))
  }
  const map: Record<string, string> = {
    name: 'name', line1: 'line1', line2: 'line2', city: 'city', state: 'state',
    postalCode: 'postal_code', phone: 'phone',
  }
  for (const [k, col] of Object.entries(map)) {
    if (k in d) {
      db.prepare(`UPDATE addresses SET ${col} = ? WHERE id = ?`).run(
        (d as Record<string, string>)[k] || null,
        Number(req.params.id),
      )
    }
  }
  res.json(listAddresses(c.id))
})

accountRouter.delete('/addresses/:id', (req, res) => {
  const c = reqCustomer(req)
  db.prepare('DELETE FROM addresses WHERE id = ? AND customer_id = ?').run(Number(req.params.id), c.id)
  res.json(listAddresses(c.id))
})

// ---- points -----------------------------------------------------------

accountRouter.get('/points', (req, res) => {
  const c = reqCustomer(req)
  const ledger = (
    db.prepare('SELECT * FROM points_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 100').all(c.id) as Record<
      string,
      unknown
    >[]
  ).map((r) => ({
    delta: r.delta,
    reason: r.reason,
    orderReference: r.order_reference,
    createdAt: r.created_at,
  }))
  res.json({
    balance: c.points,
    valueCents: (c.points / loyalty.redeemStep) * loyalty.redeemValueCents,
    rules: {
      pointsPerDollar: loyalty.pointsPerDollar,
      redeemStep: loyalty.redeemStep,
      redeemValueCents: loyalty.redeemValueCents,
    },
    ledger,
  })
})

// ---- subscriptions --------------------------------------------------

accountRouter.get('/subscriptions', (req, res) => {
  const c = reqCustomer(req)
  const rows = (
    db.prepare('SELECT * FROM subscriptions WHERE customer_id = ? ORDER BY id DESC').all(c.id) as Record<
      string,
      unknown
    >[]
  ).map((s) => ({
    id: s.id,
    status: s.status,
    productHandle: s.product_handle,
    title: s.title,
    variantTitle: s.variant_title,
    unitPriceCents: s.unit_price_cents,
    quantity: s.quantity,
    interval: s.interval,
    currentPeriodEnd: s.current_period_end,
  }))
  res.json(rows)
})

// ---- Stripe billing portal (saved cards, invoices, cancel subs) --------

accountRouter.post('/billing-portal', async (req, res) => {
  const c = reqCustomer(req)
  let client
  try {
    client = stripe()
  } catch (err) {
    const e = err as { message: string; status?: number; code?: string }
    res.status(e.status || 503).json({ error: e.message, code: e.code || 'payments_disabled' })
    return
  }
  let customerId = c.stripe_customer_id
  if (!customerId) {
    const created = await client.customers.create({ email: c.email, name: c.name ?? undefined })
    customerId = created.id
    db.prepare('UPDATE customers SET stripe_customer_id = ? WHERE id = ?').run(customerId, c.id)
  }
  try {
    const session = await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.appUrl}/account/billing`,
    })
    res.json({ url: session.url })
  } catch {
    res.status(502).json({ error: 'Could not open the billing portal. Try again shortly.' })
  }
})

// ---- helpers --------------------------------------------------------

export function linkGuestOrders(customerId: number, email: string) {
  const orders = db
    .prepare(
      `SELECT id, reference, subtotal_cents, points_earned, customer_id
       FROM orders WHERE lower(email) = ? AND status IN ('paid','fulfilled')`,
    )
    .all(email.toLowerCase()) as {
    id: number
    reference: string
    subtotal_cents: number
    points_earned: number
    customer_id: number | null
  }[]
  for (const o of orders) {
    if (o.customer_id) continue
    db.prepare('UPDATE orders SET customer_id = ? WHERE id = ?').run(customerId, o.id)
    const alreadyAwarded = o.points_earned > 0
    const pts = alreadyAwarded ? o.points_earned : pointsForSpend(o.subtotal_cents)
    if (pts > 0) {
      db.prepare('UPDATE orders SET points_earned = ? WHERE id = ?').run(pts, o.id)
      db.prepare(
        'INSERT INTO points_ledger (customer_id, delta, reason, order_reference) VALUES (?, ?, ?, ?)',
      ).run(customerId, pts, 'Order ' + o.reference, o.reference)
      db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(pts, customerId)
    }
  }
}
