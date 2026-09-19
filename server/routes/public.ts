import { Router } from 'express'
import { z } from 'zod'
import { db, rawArticles, rawPages } from '../db.ts'
import { getCollection, getProduct, listCollections, listProducts } from '../catalog.ts'
import { env, paymentsEnabled } from '../env.ts'
import { loyalty, SUBSCRIBABLE_TYPES, WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PCT } from '../loyalty.ts'
import { sendContactAlert, sendWelcomeEmail } from '../email.ts'
import { BULK_QUANTITIES, CONTACT_TOPIC_VALUES, TOPICS_WITH_ORDER_REF } from '../../src/lib/contactTopics.ts'

export const publicRouter = Router()

publicRouter.get('/config', (_req, res) => {
  res.json({
    paymentsEnabled: paymentsEnabled(),
    taxEnabled: env.stripeTax,
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

publicRouter.get('/products', async (_req, res) => {
  res.json(await listProducts())
})

publicRouter.get('/products/:handle', async (req, res) => {
  const product = await getProduct(req.params.handle)
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return
  }
  res.json(product)
})

publicRouter.get('/collections', async (_req, res) => {
  res.json(await listCollections())
})

publicRouter.get('/collections/:handle', async (req, res) => {
  const result = await getCollection(req.params.handle)
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

publicRouter.post('/discount/validate', async (req, res) => {
  const parsed = discountValidateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ valid: false, message: 'Enter a code.' })
    return
  }
  const code = parsed.data.code.toUpperCase().replace(/\s+/g, '')
  const row = await db
    .prepare('SELECT * FROM discount_codes WHERE code = ?')
    .bind(code)
    .first<{ code: string; percent_off: number; active: number; max_redemptions: number | null; redeemed_count: number }>()
  if (!row || !row.active || (row.max_redemptions != null && row.redeemed_count >= row.max_redemptions)) {
    res.json({ valid: false, message: 'That code is invalid or has expired.' })
    return
  }
  res.json({ valid: true, code: row.code, percentOff: row.percent_off })
})

const newsletterSchema = z.object({ email: z.string().trim().email().max(200) })

publicRouter.post('/newsletter', async (req, res) => {
  const parsed = newsletterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }
  const email = parsed.data.email.toLowerCase()
  await db.prepare('DELETE FROM email_suppressions WHERE email = ?').bind(email).run() // signing up again is fresh consent
  const inserted = await db
    .prepare('INSERT INTO newsletter_subscribers (email) VALUES (?) ON CONFLICT(email) DO NOTHING')
    .bind(email)
    .run()
  if (inserted.meta.changes > 0) await sendWelcomeEmail(email, WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PCT)
  res.json({ ok: true, code: WELCOME_DISCOUNT_CODE, percentOff: WELCOME_DISCOUNT_PCT })
})

const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    message: z.string().trim().min(1).max(4000),
    topic: z.enum(CONTACT_TOPIC_VALUES).default('other'),
    orderReference: z.string().trim().max(40).optional(),
    company: z.string().trim().max(120).optional(),
    quantity: z.enum(BULK_QUANTITIES).optional(),
    website: z.string().max(200).optional(), // honeypot: real visitors never see or fill this
  })
  .superRefine((v, ctx) => {
    if (v.topic === 'bulk' && !v.company) ctx.addIssue({ code: 'custom', path: ['company'], message: 'Please tell us your organization.' })
    if (v.topic === 'bulk' && !v.quantity) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Please choose roughly how many shower heads you need.' })
  })

publicRouter.post('/contact', async (req, res) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Please check the form and try again.' })
    return
  }
  if (parsed.data.website) {
    res.json({ ok: true }) // bot: pretend success, store and send nothing
    return
  }
  const { name, email, message, topic } = parsed.data
  const orderReference = TOPICS_WITH_ORDER_REF.includes(topic) ? parsed.data.orderReference || null : null
  const company = topic === 'bulk' ? parsed.data.company || null : null
  const quantity = topic === 'bulk' ? parsed.data.quantity || null : null
  await db
    .prepare('INSERT INTO contact_messages (name, email, message, topic, order_reference, company, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(name, email, message, topic, orderReference, company, quantity)
    .run()
  await sendContactAlert({ name, email, message, topic, orderReference, company, quantity })
  res.json({ ok: true })
})
