import { Router } from 'express'
import { z } from 'zod'
import { db, productByHandle } from '../db.ts'
import { verifyReviewToken } from '../marketing.ts'
import { sendReviewAlert } from '../email.ts'

export const reviewsRouter = Router()

const cache = (res: import('express').Response, seconds: number) => res.set('Cache-Control', `public, max-age=${seconds}`)

// average + count of APPROVED reviews per product (product cards and rating snippets)
reviewsRouter.get('/reviews/summaries', async (_req, res) => {
  const { results } = await db
    .prepare("SELECT product_handle, COUNT(*) AS c, AVG(rating) AS a FROM reviews WHERE status = 'approved' GROUP BY product_handle")
    .all<{ product_handle: string; c: number; a: number }>()
  cache(res, 120)
  res.json(Object.fromEntries(results.map((r) => [r.product_handle, { count: r.c, average: Math.round(r.a * 10) / 10 }])))
})

reviewsRouter.get('/products/:handle/reviews', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
  const handle = req.params.handle
  const [summary, list] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) AS c, AVG(rating) AS a FROM reviews WHERE product_handle = ? AND status = 'approved'")
      .bind(handle)
      .first<{ c: number; a: number | null }>(),
    db
      .prepare("SELECT id, rating, title, body, name, created_at FROM reviews WHERE product_handle = ? AND status = 'approved' ORDER BY id DESC LIMIT ?")
      .bind(handle, limit)
      .all<{ id: number; rating: number; title: string | null; body: string; name: string; created_at: string }>(),
  ])
  cache(res, 120)
  res.json({
    summary: { count: summary?.c ?? 0, average: summary?.a ? Math.round(summary.a * 10) / 10 : 0 },
    reviews: list.results.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, name: r.name, createdAt: r.created_at })),
  })
})

async function orderFor(ref: string, token: string) {
  if (!ref || !token || !(await verifyReviewToken(ref, token))) return null
  return db
    .prepare("SELECT id, reference, customer_name FROM orders WHERE reference = ? AND status IN ('paid','fulfilled')")
    .bind(ref)
    .first<{ id: number; reference: string; customer_name: string | null }>()
}

// what a shopper can review from their private link
reviewsRouter.get('/review-order', async (req, res) => {
  const order = await orderFor(String(req.query.ref ?? ''), String(req.query.t ?? ''))
  if (!order) {
    res.status(404).json({ error: 'This review link is not valid.' })
    return
  }
  const [{ results: items }, { results: done }] = await Promise.all([
    db.prepare('SELECT product_handle, MIN(title) AS title, MIN(image) AS image FROM order_items WHERE order_id = ? GROUP BY product_handle').bind(order.id).all<{ product_handle: string; title: string; image: string | null }>(),
    db.prepare('SELECT product_handle FROM reviews WHERE order_id = ?').bind(order.id).all<{ product_handle: string }>(),
  ])
  const reviewed = new Set(done.map((d) => d.product_handle))
  const parts = (order.customer_name ?? '').trim().split(/\s+/).filter(Boolean)
  const suggestedName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] ?? ''
  res.json({
    reference: order.reference,
    suggestedName,
    items: items.map((i) => ({ handle: i.product_handle, title: i.title, image: i.image, reviewed: reviewed.has(i.product_handle) })),
  })
})

const reviewSchema = z.object({
  handle: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(10).max(2000),
  name: z.string().trim().min(1).max(40),
})

reviewsRouter.post('/reviews', async (req, res) => {
  const order = await orderFor(String(req.query.ref ?? ''), String(req.query.t ?? ''))
  if (!order) {
    res.status(404).json({ error: 'This review link is not valid.' })
    return
  }
  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Please choose a star rating and write at least a sentence (10+ characters).' })
    return
  }
  const { handle, rating, title, body, name } = parsed.data
  if (/https?:\/\/|www\./i.test(`${title ?? ''} ${body} ${name}`)) {
    res.status(400).json({ error: 'Please leave out links.' })
    return
  }
  const bought = await db.prepare('SELECT 1 FROM order_items WHERE order_id = ? AND product_handle = ?').bind(order.id, handle).first()
  if (!bought) {
    res.status(400).json({ error: 'That product is not part of this order.' })
    return
  }
  try {
    await db
      .prepare("INSERT INTO reviews (product_handle, order_id, rating, title, body, name, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')")
      .bind(handle, order.id, rating, title || null, body, name)
      .run()
  } catch {
    res.status(409).json({ error: 'You have already reviewed this product. Thank you!' })
    return
  }
  await sendReviewAlert({ product: productByHandle.get(handle)?.title ?? handle, rating, name, body })
  res.json({ ok: true })
})
