import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db.ts'
import { getProduct, listProducts } from '../catalog.ts'
import { clearSession, currentAdmin, issueSession, requireAdmin } from '../auth.ts'
import type { OrderItem } from '../../src/lib/types.ts'

export const adminRouter = Router()

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) })

adminRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid email and password.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const row = db.prepare('SELECT password_hash FROM admin_users WHERE email = ?').get(email) as
    | { password_hash: string }
    | undefined
  if (!row || !bcrypt.compareSync(parsed.data.password, row.password_hash)) {
    res.status(401).json({ error: 'Incorrect email or password.' })
    return
  }
  issueSession(res, email)
  res.json({ email })
})

adminRouter.post('/logout', (_req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

adminRouter.get('/me', (req, res) => {
  const email = currentAdmin(req)
  if (!email) {
    res.status(401).json({ error: 'Not authenticated', code: 'unauthenticated' })
    return
  }
  res.json({ email })
})

adminRouter.use(requireAdmin)

adminRouter.get('/stats', (_req, res) => {
  const revenue = db
    .prepare("SELECT COALESCE(SUM(total_cents), 0) AS c FROM orders WHERE status IN ('paid','fulfilled')")
    .get() as { c: number }
  const orderCount = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE status IN ('paid','fulfilled')")
    .get() as { c: number }
  const pending = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'paid'").get() as {
    c: number
  }
  const unread = db.prepare('SELECT COUNT(*) AS c FROM contact_messages WHERE handled = 0').get() as {
    c: number
  }
  const newsletterCount = db.prepare('SELECT COUNT(*) AS c FROM newsletter_subscribers').get() as {
    c: number
  }
  const lowStock = listProducts({ includeHidden: true })
    .filter((p) => p.stock <= 5)
    .map((p) => ({ handle: p.handle, title: p.title, stock: p.stock }))
    .sort((a, b) => a.stock - b.stock)

  res.json({
    revenueCents: revenue.c,
    orderCount: orderCount.c,
    pendingCount: pending.c,
    unreadMessages: unread.c,
    newsletterSubscribers: newsletterCount.c,
    lowStock,
  })
})

adminRouter.get('/products', (_req, res) => {
  res.json(listProducts({ includeHidden: true }))
})

const productPatch = z.object({
  priceCents: z.number().int().min(0).optional(),
  compareAtCents: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  featured: z.boolean().optional(),
})

adminRouter.patch('/products/:handle', (req, res) => {
  const parsed = productPatch.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const existing = db.prepare('SELECT handle FROM product_overrides WHERE handle = ?').get(req.params.handle)
  if (!existing) {
    res.status(404).json({ error: 'Unknown product.' })
    return
  }
  const p = parsed.data
  const sets: string[] = []
  const vals: (number | null)[] = []
  if (p.priceCents !== undefined) { sets.push('price_cents = ?'); vals.push(p.priceCents || null) }
  if (p.compareAtCents !== undefined) { sets.push('compare_at_cents = ?'); vals.push(p.compareAtCents || null) }
  if (p.stock !== undefined) { sets.push('stock = ?'); vals.push(p.stock) }
  if (p.visible !== undefined) { sets.push('visible = ?'); vals.push(p.visible ? 1 : 0) }
  if (p.featured !== undefined) { sets.push('featured = ?'); vals.push(p.featured ? 1 : 0) }
  if (sets.length) {
    db.prepare(`UPDATE product_overrides SET ${sets.join(', ')} WHERE handle = ?`).run(
      ...vals,
      req.params.handle,
    )
  }
  res.json(getProduct(req.params.handle, { includeHidden: true }))
})

function hydrateOrder(row: Record<string, unknown>) {
  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .all(row.id as number) as Record<string, unknown>[]
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    email: row.email,
    customerName: row.customer_name,
    shippingAddress: row.shipping_address,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    trackingNumber: row.tracking_number,
    stripeSessionId: row.stripe_session_id,
    createdAt: row.created_at,
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

adminRouter.get('/orders', (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Record<string, unknown>[]
  res.json(rows.map(hydrateOrder))
})

const orderPatch = z.object({
  status: z.enum(['pending', 'paid', 'fulfilled', 'cancelled']).optional(),
  trackingNumber: z.string().trim().max(120).optional(),
})

adminRouter.patch('/orders/:id', (req, res) => {
  const parsed = orderPatch.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const row = db.prepare('SELECT id FROM orders WHERE id = ?').get(Number(req.params.id))
  if (!row) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }
  const { status, trackingNumber } = parsed.data
  if (status) db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, Number(req.params.id))
  if (trackingNumber !== undefined)
    db.prepare('UPDATE orders SET tracking_number = ? WHERE id = ?').run(
      trackingNumber || null,
      Number(req.params.id),
    )
  res.json(hydrateOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id)) as Record<string, unknown>))
})

// ---- customers ----------------------------------------------------------

adminRouter.get('/customers', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid','fulfilled')) AS order_count,
              (SELECT COALESCE(SUM(o.total_cents), 0) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid','fulfilled')) AS total_spent_cents
       FROM customers c
       ORDER BY c.id DESC`,
    )
    .all() as Record<string, unknown>[]
  res.json(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      points: r.points,
      createdAt: r.created_at,
      orderCount: r.order_count,
      totalSpentCents: r.total_spent_cents,
    })),
  )
})

adminRouter.get('/customers/:id', (req, res) => {
  const id = Number(req.params.id)
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!customer) {
    res.status(404).json({ error: 'Customer not found.' })
    return
  }
  const orders = (db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC').all(id) as Record<string, unknown>[]).map(
    hydrateOrder,
  )
  const addresses = db.prepare('SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC').all(id) as Record<
    string,
    unknown
  >[]
  const ledger = (
    db.prepare('SELECT * FROM points_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 50').all(id) as Record<
      string,
      unknown
    >[]
  ).map((r) => ({ delta: r.delta, reason: r.reason, orderReference: r.order_reference, createdAt: r.created_at }))

  res.json({
    id: customer.id,
    email: customer.email,
    name: customer.name,
    points: customer.points,
    createdAt: customer.created_at,
    orders,
    addresses: addresses.map((a) => ({
      name: a.name,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
      phone: a.phone,
      isDefault: !!a.is_default,
    })),
    pointsLedger: ledger,
  })
})

const pointsAdjustSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, 'Enter a non-zero amount.'),
  reason: z.string().trim().min(1).max(160),
})

adminRouter.post('/customers/:id/points', (req, res) => {
  const id = Number(req.params.id)
  const parsed = pointsAdjustSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid values.' })
    return
  }
  const customer = db.prepare('SELECT id, points FROM customers WHERE id = ?').get(id) as
    | { id: number; points: number }
    | undefined
  if (!customer) {
    res.status(404).json({ error: 'Customer not found.' })
    return
  }
  const nextBalance = Math.max(0, customer.points + parsed.data.delta)
  const applied = nextBalance - customer.points
  db.prepare('UPDATE customers SET points = ? WHERE id = ?').run(nextBalance, id)
  db.prepare('INSERT INTO points_ledger (customer_id, delta, reason) VALUES (?, ?, ?)').run(
    id,
    applied,
    parsed.data.reason,
  )
  res.json({ points: nextBalance })
})

// ---- admin password -----------------------------------------------------

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

adminRouter.patch('/me/password', (req, res) => {
  const email = currentAdmin(req)!
  const parsed = passwordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter your current password and a new password of at least 8 characters.' })
    return
  }
  const row = db.prepare('SELECT password_hash FROM admin_users WHERE email = ?').get(email) as
    | { password_hash: string }
    | undefined
  if (!row || !bcrypt.compareSync(parsed.data.currentPassword, row.password_hash)) {
    res.status(401).json({ error: 'Current password is incorrect.' })
    return
  }
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE email = ?').run(
    bcrypt.hashSync(parsed.data.newPassword, 10),
    email,
  )
  res.json({ ok: true })
})

// ---- discount codes -----------------------------------------------------

function hydrateDiscountCode(row: Record<string, unknown>) {
  return {
    code: row.code,
    percentOff: row.percent_off,
    active: !!row.active,
    maxRedemptions: row.max_redemptions,
    redeemedCount: row.redeemed_count,
    createdAt: row.created_at,
  }
}

adminRouter.get('/discount-codes', (_req, res) => {
  const rows = db.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all() as Record<string, unknown>[]
  res.json(rows.map(hydrateDiscountCode))
})

const discountCreateSchema = z.object({
  code: z.string().trim().min(2).max(40),
  percentOff: z.number().int().min(1).max(100),
  maxRedemptions: z.number().int().min(1).optional(),
})

adminRouter.post('/discount-codes', (req, res) => {
  const parsed = discountCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a code and a percentage between 1 and 100.' })
    return
  }
  const code = parsed.data.code.toUpperCase().replace(/\s+/g, '')
  const exists = db.prepare('SELECT code FROM discount_codes WHERE code = ?').get(code)
  if (exists) {
    res.status(409).json({ error: 'That code already exists.' })
    return
  }
  db.prepare(
    'INSERT INTO discount_codes (code, percent_off, max_redemptions) VALUES (?, ?, ?)',
  ).run(code, parsed.data.percentOff, parsed.data.maxRedemptions ?? null)
  const row = db.prepare('SELECT * FROM discount_codes WHERE code = ?').get(code) as Record<string, unknown>
  res.json(hydrateDiscountCode(row))
})

adminRouter.patch('/discount-codes/:code', (req, res) => {
  const parsed = z.object({ active: z.boolean() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const code = req.params.code.toUpperCase()
  const existing = db.prepare('SELECT code FROM discount_codes WHERE code = ?').get(code)
  if (!existing) {
    res.status(404).json({ error: 'Code not found.' })
    return
  }
  db.prepare('UPDATE discount_codes SET active = ? WHERE code = ?').run(parsed.data.active ? 1 : 0, code)
  const row = db.prepare('SELECT * FROM discount_codes WHERE code = ?').get(code) as Record<string, unknown>
  res.json(hydrateDiscountCode(row))
})

adminRouter.delete('/discount-codes/:code', (req, res) => {
  db.prepare('DELETE FROM discount_codes WHERE code = ?').run(req.params.code.toUpperCase())
  res.json({ ok: true })
})

adminRouter.get('/newsletter-subscribers', (_req, res) => {
  const rows = db.prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC').all() as Record<
    string,
    unknown
  >[]
  res.json(rows.map((r) => ({ email: r.email, createdAt: r.created_at })))
})

adminRouter.get('/contact-messages', (_req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all() as Record<
    string,
    unknown
  >[]
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      message: r.message,
      handled: r.handled,
      createdAt: r.created_at,
    })),
  )
})

adminRouter.patch('/contact-messages/:id', (req, res) => {
  const handled = z.object({ handled: z.boolean() }).safeParse(req.body)
  if (!handled.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  db.prepare('UPDATE contact_messages SET handled = ? WHERE id = ?').run(
    handled.data.handled ? 1 : 0,
    Number(req.params.id),
  )
  const r = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(Number(req.params.id)) as Record<
    string,
    unknown
  >
  res.json({ id: r.id, name: r.name, email: r.email, message: r.message, handled: r.handled, createdAt: r.created_at })
})
