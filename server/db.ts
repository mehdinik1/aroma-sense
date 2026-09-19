import { env as workerEnv } from 'cloudflare:workers'
import bcrypt from 'bcryptjs'
import { env } from './env.ts'
import { WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PCT } from './loyalty.ts'
import catalogJson from './data/catalog.json' with { type: 'json' }
import collectionsJson from './data/collections.json' with { type: 'json' }
import pagesJson from './data/pages.json' with { type: 'json' }
import blogJson from './data/blog.json' with { type: 'json' }

// D1 binding — see wrangler.toml `[[d1_databases]]`. Table schema lives in
// migrations/0001_init.sql (`wrangler d1 migrations apply`), not created at runtime.
export const db: D1Database = workerEnv.DB

// ---- raw catalog (source of truth for product content) --------------------
// Bundled at build time (Wrangler/esbuild resolves JSON imports) — Workers has no
// filesystem to `readFileSync` from at request time.

type RawVariant = {
  id: number
  title: string | null
  sku: string | null
  priceCents: number
  compareAtCents: number
  available: boolean
}
export type RawProduct = {
  id: number
  handle: string
  title: string
  description: string
  bodyHtml: string
  vendor: string
  productType: string
  tags: string[]
  images: string[]
  variants: RawVariant[]
  publishedAt: string | null
}
export type RawCollection = {
  handle: string
  title: string
  description: string
  productHandles: string[]
}
export type RawArticle = {
  handle: string
  title: string
  excerpt: string
  image: string | null
  author: string
  publishedAt: string | null
  bodyHtml: string
}
export type RawPage = { slug: string; title: string; bodyHtml: string; text: string }

export const rawProducts = catalogJson as unknown as RawProduct[]
export const rawCollections = collectionsJson as unknown as RawCollection[]
export const rawPages = pagesJson as unknown as RawPage[]

// Blog bodies come straight from the old theme's <article> markup, which repeats the
// title and a "Posted by … on …" byline that we already render in the page header.
function cleanArticleBody(html: string): string {
  return html
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '')
    .replace(/<(p|div|span)[^>]*>\s*Posted by[\s\S]{0,160}?<\/\1>/i, '')
    .replace(/Posted by [^<]{0,120}?\d{4}/i, '')
    .replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '') // drop blank paragraphs
    .replace(/^\s*(<div>\s*)+/i, '') // leading now-empty div wrappers
    .replace(/(\s*<\/div>)+\s*$/i, '')
    .trim()
}
export const rawArticles = (blogJson as unknown as RawArticle[]).map((a) => ({
  ...a,
  bodyHtml: cleanArticleBody(a.bodyHtml),
}))

export const productByHandle = new Map(rawProducts.map((p) => [p.handle, p]))

// ---- one-time seed (idempotent, memoized per isolate) ----------------------

const FEATURED = new Set([
  'as-luxe',
  'wall-mounted-vitamin-c-shower-head',
  'prestige-handheld-vitamin-c-shower-head',
  'large-handheld-vitamin-c-shower-head',
])

let seeded: Promise<void> | null = null

/** Call at the top of every request (cheap after the first call in this isolate). */
export function ensureSeeded(): Promise<void> {
  // a failed seed must not be cached, or one transient error would 503 every request until restart
  if (!seeded) seeded = doSeed().catch((err) => { seeded = null; throw err })
  return seeded
}

async function doSeed() {
  // (re)seed override rows — insert missing, never clobber admin edits
  const insertOverride = db.prepare(
    `INSERT INTO product_overrides (handle, stock, visible, featured)
     VALUES (?, 25, 1, ?)
     ON CONFLICT(handle) DO NOTHING`,
  )
  await db.batch(
    rawProducts.map((p) => {
      const featured = FEATURED.has(p.handle) || p.productType === 'Shower Heads'
      return insertOverride.bind(p.handle, featured ? 1 : 0)
    }),
  )

  const existingAdmin = await db
    .prepare('SELECT email FROM admin_users WHERE email = ?')
    .bind(env.adminEmail)
    .first()
  if (!existingAdmin) {
    await db
      .prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)')
      .bind(env.adminEmail, bcrypt.hashSync(env.adminPassword, 10))
      .run()
    console.log(`[db] created admin user ${env.adminEmail}`)
  }

  const seedVersion = await db.prepare('SELECT value FROM meta WHERE key = ?').bind('seed_version').first()
  if (!seedVersion) {
    await db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').bind('seed_version', '1').run()
    console.log(`[db] seeded ${rawProducts.length} products, ${rawCollections.length} collections`)
  }

  // one-time (tracked separately so it also backfills a pre-existing database): a real,
  // working first-order incentive for the newsletter signup. Safe to disable/delete from the
  // admin Discounts tab afterward — it will not be recreated.
  const welcomeSeeded = await db
    .prepare('SELECT value FROM meta WHERE key = ?')
    .bind('welcome_code_seeded')
    .first()
  if (!welcomeSeeded) {
    await db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').bind('welcome_code_seeded', '1').run()
    await db
      .prepare('INSERT INTO discount_codes (code, percent_off) VALUES (?, ?) ON CONFLICT(code) DO NOTHING')
      .bind(WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PCT)
      .run()
    console.log(`[db] seeded welcome discount code ${WELCOME_DISCOUNT_CODE}`)
  }
}

// ---- product override helpers ----------------------------------------------

export type Override = {
  handle: string
  price_cents: number | null
  compare_at_cents: number | null
  stock: number
  visible: number
  featured: number
}

export async function getOverride(handle: string): Promise<Override | undefined> {
  const row = await db.prepare('SELECT * FROM product_overrides WHERE handle = ?').bind(handle).first<Override>()
  return row ?? undefined
}

export async function allOverrides(): Promise<Map<string, Override>> {
  const { results } = await db.prepare('SELECT * FROM product_overrides').all<Override>()
  return new Map(results.map((o) => [o.handle, o]))
}

export function newOrderReference() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `AS-${Date.now().toString().slice(-6)}-${n}`
}
