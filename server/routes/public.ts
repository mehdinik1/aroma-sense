import { Router } from 'express'
import { z } from 'zod'
import { db, rawArticles, rawPages } from '../db.ts'
import { getCollection, getProduct, listCollections, listProducts } from '../catalog.ts'
import { paymentsEnabled } from '../env.ts'
import { loyalty, SUBSCRIBABLE_TYPES, WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PCT } from '../loyalty.ts'

export const publicRouter = Router()

publicRouter.get('/config', (_req, res) => {
  res.json({
    paymentsEnabled: paymentsEnabled(),
    welcomeCode: WELCOME_DISCOUNT_CODE,
    welcomeDiscountPct: WELCOME_DISCOUNT_PCT,
    loyalty: {
      pointsPerDollar: loyalty.pointsPerDollar,
      redeemStep: loyalty.redeemStep,
      redeemValueCents: loyalty.redeemValueCents,
      subscriptionDiscountPct: loyalty.subscriptionDiscountPct,
      subscribableTypes: [...SUBSCRIBABLE_TYPES],
    },
  })
})

publicRouter.get('/products', (_req, res) => {
  res.json(listProducts())
})

publicRouter.get('/products/:handle', (req, res) => {
  const product = getProduct(req.params.handle)
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return
  }
  res.json(product)
})

publicRouter.get('/collections', (_req, res) => {
  res.json(listCollections())
})

publicRouter.get('/collections/:handle', (req, res) => {
  const result = getCollection(req.params.handle)
  if (!result) {
    res.status(404).json({ error: 'Collection not found' })
    return
  }
  res.json(result)
})

publicRouter.get('/blog', (_req, res) => {
  res.json(
    rawArticles
      .filter((a) => a.bodyHtml && a.bodyHtml.length > 120)
      .map(({ bodyHtml: _bodyHtml, ...rest }) => rest),
  )
})

publicRouter.get('/blog/:handle', (req, res) => {
  const article = rawArticles.find((a) => a.handle === req.params.handle)
  if (!article) {
    res.status(404).json({ error: 'Article not found' })
    return
  }
  res.json(article)
})

publicRouter.get('/pages/:slug', (req, res) => {
  const page = rawPages.find((p) => p.slug === req.params.slug && p.bodyHtml)
  if (!page) {
    res.status(404).json({ error: 'Page not found' })
    return
  }
  res.json({ slug: page.slug, title: page.title, bodyHtml: page.bodyHtml })
})

const discountValidateSchema = z.object({ code: z.string().trim().min(1).max(40) })

publicRouter.post('/discount/validate', (req, res) => {
  const parsed = discountValidateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ valid: false, message: 'Enter a code.' })
    return
  }
  const code = parsed.data.code.toUpperCase().replace(/\s+/g, '')
  const row = db.prepare('SELECT * FROM discount_codes WHERE code = ?').get(code) as
    | { code: string; percent_off: number; active: number; max_redemptions: number | null; redeemed_count: number }
    | undefined
  if (!row || !row.active || (row.max_redemptions != null && row.redeemed_count >= row.max_redemptions)) {
    res.json({ valid: false, message: 'That code is invalid or has expired.' })
    return
  }
  res.json({ valid: true, code: row.code, percentOff: row.percent_off })
})

const newsletterSchema = z.object({ email: z.string().trim().email().max(200) })

publicRouter.post('/newsletter', (req, res) => {
  const parsed = newsletterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }
  db.prepare(
    'INSERT INTO newsletter_subscribers (email) VALUES (?) ON CONFLICT(email) DO NOTHING',
  ).run(parsed.data.email.toLowerCase())
  res.json({ ok: true, code: WELCOME_DISCOUNT_CODE, percentOff: WELCOME_DISCOUNT_PCT })
})

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(4000),
})

publicRouter.post('/contact', (req, res) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Please check the form and try again.' })
    return
  }
  const { name, email, message } = parsed.data
  db.prepare('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)').run(
    name,
    email,
    message,
  )
  res.json({ ok: true })
})
