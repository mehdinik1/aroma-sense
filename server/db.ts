import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { env } from './env.ts'
import { WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PCT } from './loyalty.ts'

const DATA_DIR = path.resolve(import.meta.dirname, 'data')
const DB_PATH = process.env.DB_PATH || path.resolve(import.meta.dirname, 'data.db')

export const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_overrides (
    handle TEXT PRIMARY KEY,
    price_cents INTEGER,
    compare_at_cents INTEGER,
    stock INTEGER NOT NULL DEFAULT 25,
    visible INTEGER NOT NULL DEFAULT 1,
    featured INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    email TEXT,
    customer_name TEXT,
    shipping_address TEXT,
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL,
    tracking_number TEXT,
    stripe_session_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_handle TEXT NOT NULL,
    variant_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    variant_title TEXT,
    price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    handled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    phone TEXT,
    is_default INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS points_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    order_reference TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    product_handle TEXT NOT NULL,
    variant_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    variant_title TEXT,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    interval TEXT NOT NULL DEFAULT 'month',
    current_period_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wishlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_handle TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(customer_id, product_handle)
  );

  CREATE TABLE IF NOT EXISTS discount_codes (
    code TEXT PRIMARY KEY,
    percent_off INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    max_redemptions INTEGER,
    redeemed_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// --- lightweight migrations (add columns to pre-existing tables) ----------
function addColumn(table: string, column: string, decl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`)
  }
}
addColumn('orders', 'customer_id', 'INTEGER')
addColumn('orders', 'points_earned', 'INTEGER NOT NULL DEFAULT 0')
addColumn('orders', 'points_redeemed', 'INTEGER NOT NULL DEFAULT 0')
addColumn('orders', 'discount_cents', 'INTEGER NOT NULL DEFAULT 0')
addColumn('orders', 'is_subscription', 'INTEGER NOT NULL DEFAULT 0')
addColumn('orders', 'discount_code', 'TEXT')

// ---- raw catalog (source of truth for product content) --------------------

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

const readJson = <T>(file: string, fallback: T): T => {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8')) as T
  } catch {
    return fallback
  }
}

export const rawProducts = readJson<RawProduct[]>('catalog.json', [])
export const rawCollections = readJson<RawCollection[]>('collections.json', [])
export const rawPages = readJson<RawPage[]>('pages.json', [])

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
export const rawArticles = readJson<RawArticle[]>('blog.json', []).map((a) => ({
  ...a,
  bodyHtml: cleanArticleBody(a.bodyHtml),
}))

export const productByHandle = new Map(rawProducts.map((p) => [p.handle, p]))

// ---- seed ---------------------------------------------------------------

const FEATURED = new Set([
  'as-luxe',
  'wall-mounted-vitamin-c-shower-head',
  'prestige-handheld-vitamin-c-shower-head',
  'large-handheld-vitamin-c-shower-head',
])

function seed() {
  const seededVersion = db.prepare('SELECT value FROM meta WHERE key = ?').get('seed_version') as
    | { value: string }
    | undefined

  // (re)seed override rows — insert missing, never clobber admin edits
  const insertOverride = db.prepare(`
    INSERT INTO product_overrides (handle, stock, visible, featured)
    VALUES (?, 25, 1, ?)
    ON CONFLICT(handle) DO NOTHING
  `)
  for (const p of rawProducts) {
    const featured =
      FEATURED.has(p.handle) || (p.productType === 'Shower Heads' ? 1 : 0)
    insertOverride.run(p.handle, featured ? 1 : 0)
  }

  // admin user
  const existing = db.prepare('SELECT email FROM admin_users WHERE email = ?').get(env.adminEmail)
  if (!existing) {
    db.prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)').run(
      env.adminEmail,
      bcrypt.hashSync(env.adminPassword, 10),
    )
    console.log(`[db] created admin user ${env.adminEmail}`)
  }

  if (!seededVersion) {
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('seed_version', '1')
    console.log(`[db] seeded ${rawProducts.length} products, ${rawCollections.length} collections`)
  }

  // one-time (tracked separately so it also backfills a pre-existing dev database): a real,
  // working first-order incentive for the newsletter signup. Safe to disable/delete from the
  // admin Discounts tab afterward — it will not be recreated.
  const welcomeCodeSeeded = db.prepare('SELECT value FROM meta WHERE key = ?').get('welcome_code_seeded')
  if (!welcomeCodeSeeded) {
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('welcome_code_seeded', '1')
    db.prepare(
      'INSERT INTO discount_codes (code, percent_off) VALUES (?, ?) ON CONFLICT(code) DO NOTHING',
    ).run(WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PCT)
    console.log(`[db] seeded welcome discount code ${WELCOME_DISCOUNT_CODE}`)
  }
}

seed()

// ---- helpers ----------------------------------------------------------

export type Override = {
  handle: string
  price_cents: number | null
  compare_at_cents: number | null
  stock: number
  visible: number
  featured: number
}

export const getOverride = (handle: string) =>
  db.prepare('SELECT * FROM product_overrides WHERE handle = ?').get(handle) as Override | undefined

export const allOverrides = () =>
  new Map(
    (db.prepare('SELECT * FROM product_overrides').all() as Override[]).map((o) => [o.handle, o]),
  )

export function newOrderReference() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `AS-${Date.now().toString().slice(-6)}-${n}`
}
