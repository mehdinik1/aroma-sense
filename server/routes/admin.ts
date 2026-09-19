import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db, productByHandle } from '../db.ts'
import { getProduct, listProducts } from '../catalog.ts'
import { clearSession, currentAdmin, issueSession, requireAdmin } from '../auth.ts'
import type { OrderItem } from '../../src/lib/types.ts'
import { sendShippingEmail } from '../email.ts'

export const adminRouter = Router()

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) })

adminRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid email and password.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const row = await db.prepare('SELECT password_hash FROM admin_users WHERE email = ?').bind(email).first<{ password_hash: string }>()
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

adminRouter.get('/stats', async (_req, res) => {
  const [revenue, orderCount, pending, unread, newsletterCount] = await Promise.all([
    db.prepare("SELECT COALESCE(SUM(total_cents), 0) AS c FROM orders WHERE status IN ('paid','fulfilled')").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status IN ('paid','fulfilled')").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'paid'").first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM contact_messages WHERE handled = 0').first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM newsletter_subscribers').first<{ c: number }>(),
  ])
  const lowStock = (await listProducts({ includeHidden: true }))
    .filter((p) => p.stock <= 5)
    .map((p) => ({ handle: p.handle, title: p.title, stock: p.stock }))
    .sort((a, b) => a.stock - b.stock)

  res.json({
    revenueCents: revenue!.c,
    orderCount: orderCount!.c,
    pendingCount: pending!.c,
    unreadMessages: unread!.c,
    newsletterSubscribers: newsletterCount!.c,
    lowStock,
  })
})

adminRouter.get('/products', async (_req, res) => {
  res.json(await listProducts({ includeHidden: true }))
})

const productPatch = z.object({
  priceCents: z.number().int().min(0).optional(),
  compareAtCents: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  featured: z.boolean().optional(),
})

adminRouter.patch('/products/:handle', async (req, res) => {
  const parsed = productPatch.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const existing = await db.prepare('SELECT handle FROM product_overrides WHERE handle = ?').bind(req.params.handle).first()
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
    await db
      .prepare(`UPDATE product_overrides SET ${sets.join(', ')} WHERE handle = ?`)
      .bind(...vals, req.params.handle)
      .run()
  }
  res.json(await getProduct(req.params.handle, { includeHidden: true }))
})

async function hydrateOrder(row: Record<string, unknown>) {
  const { results: items } = await db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .bind(row.id as number)
    .all<Record<string, unknown>>()
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

adminRouter.get('/orders', async (_req, res) => {
  const { results: rows } = await db.prepare('SELECT * FROM orders ORDER BY id DESC').all<Record<string, unknown>>()
  res.json(await Promise.all(rows.map(hydrateOrder)))
})

const orderPatch = z.object({
  status: z.enum(['pending', 'paid', 'fulfilled', 'cancelled']).optional(),
  trackingNumber: z.string().trim().max(120).optional(),
})

adminRouter.patch('/orders/:id', async (req, res) => {
  const parsed = orderPatch.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const id = Number(req.params.id)
  const row = await db
    .prepare('SELECT id, status, tracking_number FROM orders WHERE id = ?')
    .bind(id)
    .first<{ id: number; status: string; tracking_number: string | null }>()
  if (!row) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }
  const { status, trackingNumber } = parsed.data
  if (status) await db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, id).run()
  if (status === 'fulfilled') await db.prepare("UPDATE orders SET fulfilled_at = COALESCE(fulfilled_at, datetime('now')) WHERE id = ?").bind(id).run()
  if (trackingNumber !== undefined) await db.prepare('UPDATE orders SET tracking_number = ? WHERE id = ?').bind(trackingNumber || null, id).run()
  const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Record<string, unknown>>()

  const becameFulfilled = updated!.status === 'fulfilled' && row.status !== 'fulfilled'
  const trackingAdded =
    updated!.status === 'fulfilled' && !!updated!.tracking_number && updated!.tracking_number !== row.tracking_number
  if ((becameFulfilled || trackingAdded) && updated!.email) {
    await sendShippingEmail({
      reference: updated!.reference as string,
      email: updated!.email as string,
      name: (updated!.customer_name as string | null) ?? null,
      trackingNumber: (updated!.tracking_number as string | null) ?? null,
      shippingAddress: (updated!.shipping_address as string | null) ?? null,
    })
  }
  res.json(await hydrateOrder(updated!))
})

// ---- customers ----------------------------------------------------------

adminRouter.get('/customers', async (_req, res) => {
  const { results: rows } = await db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid','fulfilled')) AS order_count,
              (SELECT COALESCE(SUM(o.total_cents), 0) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid','fulfilled')) AS total_spent_cents
       FROM customers c
       ORDER BY c.id DESC`,
    )
    .all<Record<string, unknown>>()
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

adminRouter.get('/customers/:id', async (req, res) => {
  const id = Number(req.params.id)
  const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!customer) {
    res.status(404).json({ error: 'Customer not found.' })
    return
  }
  const [{ results: orderRows }, { results: addresses }, { results: ledgerRows }] = await Promise.all([
    db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC').bind(id).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC').bind(id).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM points_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 50').bind(id).all<Record<string, unknown>>(),
  ])
  const orders = await Promise.all(orderRows.map(hydrateOrder))
  const ledger = ledgerRows.map((r) => ({ delta: r.delta, reason: r.reason, orderReference: r.order_reference, createdAt: r.created_at }))

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

adminRouter.post('/customers/:id/points', async (req, res) => {
  const id = Number(req.params.id)
  const parsed = pointsAdjustSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid values.' })
    return
  }
  const customer = await db.prepare('SELECT id, points FROM customers WHERE id = ?').bind(id).first<{ id: number; points: number }>()
  if (!customer) {
    res.status(404).json({ error: 'Customer not found.' })
    return
  }
  const nextBalance = Math.max(0, customer.points + parsed.data.delta)
  const applied = nextBalance - customer.points
  await db.batch([
    db.prepare('UPDATE customers SET points = ? WHERE id = ?').bind(nextBalance, id),
    db.prepare('INSERT INTO points_ledger (customer_id, delta, reason) VALUES (?, ?, ?)').bind(id, applied, parsed.data.reason),
  ])
  res.json({ points: nextBalance })
})

// ---- admin password -----------------------------------------------------

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

adminRouter.patch('/me/password', async (req, res) => {
  const email = currentAdmin(req)!
  const parsed = passwordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter your current password and a new password of at least 8 characters.' })
    return
  }
  const row = await db.prepare('SELECT password_hash FROM admin_users WHERE email = ?').bind(email).first<{ password_hash: string }>()
  if (!row || !bcrypt.compareSync(parsed.data.currentPassword, row.password_hash)) {
    res.status(401).json({ error: 'Current password is incorrect.' })
    return
  }
  await db.prepare('UPDATE admin_users SET password_hash = ? WHERE email = ?').bind(bcrypt.hashSync(parsed.data.newPassword, 10), email).run()
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

adminRouter.get('/discount-codes', async (_req, res) => {
  const { results } = await db.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all<Record<string, unknown>>()
  res.json(results.map(hydrateDiscountCode))
})

const discountCreateSchema = z.object({
  code: z.string().trim().min(2).max(40),
  percentOff: z.number().int().min(1).max(100),
  maxRedemptions: z.number().int().min(1).optional(),
})

adminRouter.post('/discount-codes', async (req, res) => {
  const parsed = discountCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a code and a percentage between 1 and 100.' })
    return
  }
  const code = parsed.data.code.toUpperCase().replace(/\s+/g, '')
  const exists = await db.prepare('SELECT code FROM discount_codes WHERE code = ?').bind(code).first()
  if (exists) {
    res.status(409).json({ error: 'That code already exists.' })
    return
  }
  await db
    .prepare('INSERT INTO discount_codes (code, percent_off, max_redemptions) VALUES (?, ?, ?)')
    .bind(code, parsed.data.percentOff, parsed.data.maxRedemptions ?? null)
    .run()
  const row = await db.prepare('SELECT * FROM discount_codes WHERE code = ?').bind(code).first<Record<string, unknown>>()
  res.json(hydrateDiscountCode(row!))
})

adminRouter.patch('/discount-codes/:code', async (req, res) => {
  const parsed = z.object({ active: z.boolean() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const code = req.params.code.toUpperCase()
  const existing = await db.prepare('SELECT code FROM discount_codes WHERE code = ?').bind(code).first()
  if (!existing) {
    res.status(404).json({ error: 'Code not found.' })
    return
  }
  await db.prepare('UPDATE discount_codes SET active = ? WHERE code = ?').bind(parsed.data.active ? 1 : 0, code).run()
  const row = await db.prepare('SELECT * FROM discount_codes WHERE code = ?').bind(code).first<Record<string, unknown>>()
  res.json(hydrateDiscountCode(row!))
})

adminRouter.delete('/discount-codes/:code', async (req, res) => {
  await db.prepare('DELETE FROM discount_codes WHERE code = ?').bind(req.params.code.toUpperCase()).run()
  res.json({ ok: true })
})

adminRouter.get('/newsletter-subscribers', async (_req, res) => {
  const { results } = await db.prepare('SELECT * FROM newsletter_subscribers ORDER BY id DESC').all<Record<string, unknown>>()
  res.json(results.map((r) => ({ email: r.email, createdAt: r.created_at })))
})

adminRouter.get('/contact-messages', async (_req, res) => {
  const { results } = await db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all<Record<string, unknown>>()
  res.json(
    results.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      message: r.message,
      topic: r.topic ?? 'other',
      orderReference: r.order_reference ?? null,
      company: r.company ?? null,
      quantity: r.quantity ?? null,
      handled: r.handled,
      createdAt: r.created_at,
    })),
  )
})

adminRouter.patch('/contact-messages/:id', async (req, res) => {
  const handled = z.object({ handled: z.boolean() }).safeParse(req.body)
  if (!handled.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  const id = Number(req.params.id)
  await db.prepare('UPDATE contact_messages SET handled = ? WHERE id = ?').bind(handled.data.handled ? 1 : 0, id).run()
  const r = await db.prepare('SELECT * FROM contact_messages WHERE id = ?').bind(id).first<Record<string, unknown>>()
  res.json({
    id: r!.id,
    name: r!.name,
    email: r!.email,
    message: r!.message,
    topic: r!.topic ?? 'other',
    orderReference: r!.order_reference ?? null,
    company: r!.company ?? null,
    quantity: r!.quantity ?? null,
    handled: r!.handled,
    createdAt: r!.created_at,
  })
})

adminRouter.get('/reviews', async (_req, res) => {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.product_handle, r.rating, r.title, r.body, r.name, r.status, r.created_at, o.reference, o.email
         FROM reviews r JOIN orders o ON o.id = r.order_id
        ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.id DESC`,
    )
    .all<Record<string, unknown>>()
  res.json(
    results.map((r) => ({
      id: r.id,
      handle: r.product_handle,
      product: productByHandle.get(r.product_handle as string)?.title ?? r.product_handle,
      rating: r.rating,
      title: r.title,
      body: r.body,
      name: r.name,
      status: r.status,
      createdAt: r.created_at,
      orderReference: r.reference,
      email: r.email,
    })),
  )
})

adminRouter.patch('/reviews/:id', async (req, res) => {
  const parsed = z.object({ status: z.enum(['pending', 'approved', 'rejected']) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid values.' })
    return
  }
  await db
    .prepare("UPDATE reviews SET status = ?, moderated_at = datetime('now') WHERE id = ?")
    .bind(parsed.data.status, Number(req.params.id))
    .run()
  res.json({ ok: true })
})

adminRouter.delete('/reviews/:id', async (req, res) => {
  await db.prepare('DELETE FROM reviews WHERE id = ?').bind(Number(req.params.id)).run()
  res.json({ ok: true })
})
