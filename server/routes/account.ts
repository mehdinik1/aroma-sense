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
import { sendPasswordResetEmail } from '../email.ts'
import type { OrderItem } from '../../src/lib/types.ts'

export const accountRouter = Router()

const creds = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120).optional(),
})

accountRouter.post('/register', async (req, res) => {
  const parsed = creds.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Use a valid email and a password of at least 8 characters.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const exists = await db.prepare('SELECT id FROM customers WHERE email = ?').bind(email).first()
  if (exists) {
    res.status(409).json({ error: 'An account with that email already exists.' })
    return
  }
  const inserted = await db
    .prepare('INSERT INTO customers (email, password_hash, name) VALUES (?, ?, ?)')
    .bind(email, bcrypt.hashSync(parsed.data.password, 10), parsed.data.name ?? null)
    .run()
  const id = inserted.meta.last_row_id

  // link any past guest orders with this email + award their points
  await linkGuestOrders(id, email)

  issueCustomerSession(res, id)
  const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<CustomerRow>()
  res.json({ customer: publicCustomer(customer!) })
})

accountRouter.post('/login', async (req, res) => {
  const parsed = z
    .object({ email: z.string().trim().email(), password: z.string().min(1) })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter your email and password.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const row = await db.prepare('SELECT * FROM customers WHERE email = ?').bind(email).first<CustomerRow>()
  if (!row || !bcrypt.compareSync(parsed.data.password, row.password_hash)) {
    res.status(401).json({ error: 'Incorrect email or password.' })
    return
  }
  issueCustomerSession(res, row.id)
  res.json({ customer: publicCustomer(row) })
})

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Always answers the same way so it can't be used to discover which emails have accounts.
accountRouter.post('/forgot', async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const customer = await db.prepare('SELECT id FROM customers WHERE email = ?').bind(email).first<{ id: number }>()
  if (customer) {
    const recent = await db
      .prepare("SELECT id FROM password_resets WHERE customer_id = ? AND created_at > datetime('now', '-1 minute')")
      .bind(customer.id)
      .first()
    if (!recent) {
      const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
      await db
        .prepare("INSERT INTO password_resets (customer_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 hour'))")
        .bind(customer.id, await sha256Hex(token))
        .run()
      await sendPasswordResetEmail(email, `${env.appUrl}/account/reset?token=${token}`)
    }
  }
  res.json({ ok: true })
})

accountRouter.post('/reset', async (req, res) => {
  const parsed = z
    .object({ token: z.string().length(64), password: z.string().min(8).max(200) })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Use a password of at least 8 characters.' })
    return
  }
  const row = await db
    .prepare("SELECT customer_id FROM password_resets WHERE token_hash = ? AND expires_at > datetime('now')")
    .bind(await sha256Hex(parsed.data.token))
    .first<{ customer_id: number }>()
  if (!row) {
    res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' })
    return
  }
  await db.batch([
    db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').bind(bcrypt.hashSync(parsed.data.password, 10), row.customer_id),
    db.prepare('DELETE FROM password_resets WHERE customer_id = ?').bind(row.customer_id),
  ])
  res.json({ ok: true })
})

accountRouter.post('/logout', (_req, res) => {
  clearCustomerSession(res)
  res.json({ ok: true })
})

accountRouter.get('/me', async (req, res) => {
  const c = await currentCustomer(req)
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

async function hydrateOrder(row: Record<string, unknown>) {
  const { results: items } = await db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .bind(row.id as number)
    .all<Record<string, unknown>>()
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

accountRouter.patch('/me', async (req, res) => {
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
    await db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?').bind(bcrypt.hashSync(newPassword, 10), c.id).run()
  }

  if (email !== undefined) {
    const normalized = email.toLowerCase()
    if (normalized !== c.email) {
      const exists = await db.prepare('SELECT id FROM customers WHERE email = ? AND id != ?').bind(normalized, c.id).first()
      if (exists) {
        res.status(409).json({ error: 'An account with that email already exists.' })
        return
      }
      await db.prepare('UPDATE customers SET email = ? WHERE id = ?').bind(normalized, c.id).run()
    }
  }

  if (name !== undefined) {
    await db.prepare('UPDATE customers SET name = ? WHERE id = ?').bind(name || null, c.id).run()
  }

  const updated = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(c.id).first<CustomerRow>()
  res.json({ customer: publicCustomer(updated!) })
})

// ---- wishlist ---------------------------------------------------------

async function listWishlist(customerId: number): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT product_handle FROM wishlist_items WHERE customer_id = ? ORDER BY id DESC')
    .bind(customerId)
    .all<{ product_handle: string }>()
  return results.map((r) => r.product_handle)
}

accountRouter.get('/wishlist', async (req, res) => {
  res.json({ handles: await listWishlist(reqCustomer(req).id) })
})

accountRouter.post('/wishlist', async (req, res) => {
  const parsed = z.object({ handle: z.string().trim().min(1).max(200) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid product.' })
    return
  }
  const c = reqCustomer(req)
  await db
    .prepare('INSERT INTO wishlist_items (customer_id, product_handle) VALUES (?, ?) ON CONFLICT(customer_id, product_handle) DO NOTHING')
    .bind(c.id, parsed.data.handle)
    .run()
  res.json({ handles: await listWishlist(c.id) })
})

accountRouter.delete('/wishlist/:handle', async (req, res) => {
  const c = reqCustomer(req)
  await db.prepare('DELETE FROM wishlist_items WHERE customer_id = ? AND product_handle = ?').bind(c.id, req.params.handle).run()
  res.json({ handles: await listWishlist(c.id) })
})

accountRouter.get('/orders', async (req, res) => {
  const c = reqCustomer(req)
  const { results: rows } = await db
    .prepare(
      `SELECT * FROM orders
       WHERE (customer_id = ? OR (email IS NOT NULL AND lower(email) = ?))
         AND status IN ('paid','fulfilled','cancelled')
       ORDER BY id DESC`,
    )
    .bind(c.id, c.email)
    .all<Record<string, unknown>>()
  res.json(await Promise.all(rows.map(hydrateOrder)))
})

accountRouter.get('/orders/:reference', async (req, res) => {
  const c = reqCustomer(req)
  const row = await db
    .prepare('SELECT * FROM orders WHERE reference = ? AND (customer_id = ? OR lower(email) = ?)')
    .bind(req.params.reference, c.id, c.email)
    .first<Record<string, unknown>>()
  if (!row) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }
  res.json(await hydrateOrder(row))
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

async function listAddresses(customerId: number) {
  const { results } = await db
    .prepare('SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC')
    .bind(customerId)
    .all<Record<string, unknown>>()
  return results.map((a) => ({
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

accountRouter.get('/addresses', async (req, res) => {
  res.json(await listAddresses(reqCustomer(req).id))
})

accountRouter.post('/addresses', async (req, res) => {
  const parsed = addressSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Please complete all required address fields.' })
    return
  }
  const c = reqCustomer(req)
  const d = parsed.data
  const countRow = await db.prepare('SELECT COUNT(*) AS n FROM addresses WHERE customer_id = ?').bind(c.id).first<{ n: number }>()
  const makeDefault = d.isDefault || countRow!.n === 0
  if (makeDefault) await db.prepare('UPDATE addresses SET is_default = 0 WHERE customer_id = ?').bind(c.id).run()
  await db
    .prepare(
      `INSERT INTO addresses (customer_id, name, line1, line2, city, state, postal_code, phone, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(c.id, d.name, d.line1, d.line2 || null, d.city, d.state, d.postalCode, d.phone || null, makeDefault ? 1 : 0)
    .run()
  res.json(await listAddresses(c.id))
})

accountRouter.patch('/addresses/:id', async (req, res) => {
  const parsed = addressSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const c = reqCustomer(req)
  const owned = await db.prepare('SELECT id FROM addresses WHERE id = ? AND customer_id = ?').bind(Number(req.params.id), c.id).first()
  if (!owned) {
    res.status(404).json({ error: 'Address not found.' })
    return
  }
  const d = parsed.data
  if (d.isDefault) {
    await db.prepare('UPDATE addresses SET is_default = 0 WHERE customer_id = ?').bind(c.id).run()
    await db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').bind(Number(req.params.id)).run()
  }
  const map: Record<string, string> = {
    name: 'name', line1: 'line1', line2: 'line2', city: 'city', state: 'state',
    postalCode: 'postal_code', phone: 'phone',
  }
  for (const [k, col] of Object.entries(map)) {
    if (k in d) {
      await db
        .prepare(`UPDATE addresses SET ${col} = ? WHERE id = ?`)
        .bind((d as Record<string, string>)[k] || null, Number(req.params.id))
        .run()
    }
  }
  res.json(await listAddresses(c.id))
})

accountRouter.delete('/addresses/:id', async (req, res) => {
  const c = reqCustomer(req)
  await db.prepare('DELETE FROM addresses WHERE id = ? AND customer_id = ?').bind(Number(req.params.id), c.id).run()
  res.json(await listAddresses(c.id))
})

// ---- points -----------------------------------------------------------

accountRouter.get('/points', async (req, res) => {
  const c = reqCustomer(req)
  const { results } = await db
    .prepare('SELECT * FROM points_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 100')
    .bind(c.id)
    .all<Record<string, unknown>>()
  const ledger = results.map((r) => ({
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

accountRouter.get('/subscriptions', async (req, res) => {
  const c = reqCustomer(req)
  const { results } = await db
    .prepare('SELECT * FROM subscriptions WHERE customer_id = ? ORDER BY id DESC')
    .bind(c.id)
    .all<Record<string, unknown>>()
  res.json(
    results.map((s) => ({
      id: s.id,
      status: s.status,
      productHandle: s.product_handle,
      title: s.title,
      variantTitle: s.variant_title,
      unitPriceCents: s.unit_price_cents,
      quantity: s.quantity,
      interval: s.interval,
      currentPeriodEnd: s.current_period_end,
    })),
  )
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
    await db.prepare('UPDATE customers SET stripe_customer_id = ? WHERE id = ?').bind(customerId, c.id).run()
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

export async function linkGuestOrders(customerId: number, email: string) {
  const { results: orders } = await db
    .prepare(
      `SELECT id, reference, subtotal_cents, points_earned, customer_id
       FROM orders WHERE lower(email) = ? AND status IN ('paid','fulfilled')`,
    )
    .bind(email.toLowerCase())
    .all<{
      id: number
      reference: string
      subtotal_cents: number
      points_earned: number
      customer_id: number | null
    }>()
  for (const o of orders) {
    if (o.customer_id) continue
    const batch = [db.prepare('UPDATE orders SET customer_id = ? WHERE id = ?').bind(customerId, o.id)]
    const alreadyAwarded = o.points_earned > 0
    const pts = alreadyAwarded ? o.points_earned : pointsForSpend(o.subtotal_cents)
    if (pts > 0) {
      batch.push(
        db.prepare('UPDATE orders SET points_earned = ? WHERE id = ?').bind(pts, o.id),
        db
          .prepare('INSERT INTO points_ledger (customer_id, delta, reason, order_reference) VALUES (?, ?, ?, ?)')
          .bind(customerId, pts, 'Order ' + o.reference, o.reference),
        db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').bind(pts, customerId),
      )
    }
    await db.batch(batch)
  }
}
