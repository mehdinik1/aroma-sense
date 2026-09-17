// Scrapes the current Shopify store (aromasenseusa.com) into local JSON + images.
// Re-runnable. Run: node scripts/scrape.mjs
//
// Outputs:
//   server/data/catalog.json      products + variants
//   server/data/collections.json  collections + membership (handles)
//   server/data/blog.json         blog articles (sanitized HTML body)
//   server/data/pages.json        static content pages
//   public/products/<handle>/*    downloaded product images

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const SRC = 'https://aromasenseusa.com'
const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, 'server', 'data')
const IMG_DIR = path.join(ROOT, 'public', 'products')

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// The store uses Shopify Markets and geo-redirects non-US visitors to a CAD market.
// Force the US / USD market on every request so scraped prices are in US dollars.
function usUrl(url) {
  return url + (url.includes('?') ? '&' : '?') + 'country=US'
}

async function get(url, { json = false, retries = 3 } = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(usUrl(url), {
        headers: {
          'User-Agent': UA,
          Accept: json ? 'application/json' : 'text/html',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: 'localization=US; cart_currency=USD',
        },
      })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) return null
      return json ? await res.json() : await res.text()
    } catch (e) {
      if (i === retries - 1) { console.warn(`  ! ${url} -> ${e.message}`); return null }
      await sleep(1000 * (i + 1))
    }
  }
}

// ---- text helpers -------------------------------------------------------------

function debrand(s) {
  if (!s) return s
  return s
    // 1. old-store links -> relative paths on this site (BEFORE any brand replacement,
    //    so "aromasenseusa.com" is gone before the "USA" rules run)
    .replace(/https?:\/\/(www\.)?aromasenseusa\.com/gi, '')
    .replace(/\baromasense ?usa\.com\b/gi, 'aromasense.com')
    .replace(/\/collections\/[a-z0-9-]+\/products\//gi, '/products/')
    .replace(/\/blogs\/blog\//gi, '/blog/')
    // 2. brand: drop "USA"
    .replace(/Aroma\s*Sense\s*USA/gi, 'Aroma Sense')
    .replace(/AromaSense\s*USA/gi, 'Aroma Sense')
    .replace(/\bUSA\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim()
}

function stripHtml(html) {
  if (!html) return ''
  return debrand(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
      .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
      .replace(/&hellip;/g, '...')
      .replace(/[^.]*?\bDemo from Aroma Sense on Vimeo\.\s*/gi, '')
      .replace(/\[split\]/gi, '')
      .replace(/\s+/g, ' '),
  )
}

// keep a safe subset of HTML for blog/page bodies
function sanitizeHtml(html) {
  if (!html) return ''
  let out = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/ (class|id|style|data-[\w-]+|srcset|sizes|loading|width|height)="[^"]*"/gi, '')
    .replace(/<\/?(span|font|section|figure|figcaption)[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // drop video embeds + the old theme's "[split]" tab marker
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<iframe\b[^>]*\/?>/gi, '')
    .replace(/<p>[^<]*<a[^>]*vimeo\.com[^>]*>[\s\S]*?<\/p>/gi, '')
    .replace(/<a[^>]*vimeo\.com[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/[^.]*?\bDemo from Aroma Sense on Vimeo\.\s*/gi, '')
    .replace(/<h4>\s*\[split\]\s*<\/h4>|<p>\s*\[split\]\s*<\/p>|\[split\]/gi, '')
    .replace(/﻿/g, '')
    .replace(/<em>\s*<\/em>|<p>\s*(&nbsp;|\s)*<\/p>/gi, '')
    // rewrite old-store links to this site's relative paths
    .replace(/https?:\/\/(www\.)?aromasenseusa\.com/gi, '')
    .replace(/href="\/blogs\/blog\//g, 'href="/blog/')
  return debrand(out).trim()
}

const centsFromPrice = (p) => {
  if (p == null) return 0
  const n = typeof p === 'number' ? p : parseFloat(String(p).replace(/[^0-9.]/g, ''))
  return Math.round((n || 0) * 100)
}

// Product-line cleanup applied on top of debrand(): the live store's "Opus" wall line
// is generic here ("Wall Mounted" / "Wall Fixture" / "Wall Mount Housing Shell").
const RENAMES = [
  [/AS-Opus Housing Shell/gi, 'Wall Mount Housing Shell'],
  [/AS-Opus-Shell/gi, 'AS-WM-Shell'],
  [/as-opus-housing-shell/gi, 'wall-mount-housing-shell'],
  [/Opus Collection/gi, 'Wall Mount Collection'],
  [/OPUS/g, 'WM'],
  [/AS-Opus Demo/gi, 'Aroma Sense Demo'],
  [/\bthe AS-Opus\b/gi, 'the'],
  [/AS-Opus (vitamin|shower|wall)/gi, '$1'],
  [/Opus /g, ''],
  [/opus-wall-/g, 'wall-'],
  [/opus-/g, ''],
  [/\bOpus\b/g, 'Wall Mount'],
]
const rebrand = (s) =>
  typeof s === 'string'
    ? RENAMES.reduce((x, [re, to]) => x.replace(re, to), s).replace(/ {2,}/g, ' ').trim()
    : s

// ---- products ---------------------------------------------------------------

function normalizeProduct(p, tags) {
  return {
    id: p.id,
    handle: rebrand(p.handle),
    title: rebrand(debrand(p.title)),
    description: rebrand(stripHtml(p.body_html)),
    bodyHtml: rebrand(sanitizeHtml(p.body_html)),
    vendor: 'Aroma Sense',
    productType: p.product_type || 'Other',
    tags: (tags || p.tags || []).filter((t) => !/aroma sense usa/i.test(t)).map(rebrand),
    images: (p.images || []).map((im) => im.src),
    variants: (p.variants || []).map((v) => ({
      id: v.id,
      title: v.title === 'Default Title' ? null : rebrand(debrand(v.title)),
      sku: rebrand(v.sku || null),
      priceCents: centsFromPrice(v.price),
      compareAtCents: centsFromPrice(v.compare_at_price),
      available: v.available !== false,
    })),
    publishedAt: p.published_at,
  }
}

// products dropped from this store (rebrand / range decisions)
const SKIP_PRODUCTS = new Set([
  'aroma-sense-luxury-scented-candle-citrus-sage',
  'aroma-sense-luxury-scented-candle-aqua-spa',
  'aroma-sense-luxury-scented-candle',
  'luxury-hand-soap',
  'luxury-bath-towels',
  'luxury-bathmats',
])
// entire product types dropped from this store
const SKIP_TYPES = new Set(['Bath Bomb'])

async function scrapeProducts() {
  console.log('Products...')
  // get() forces the US/USD Shopify market, so the list endpoint returns USD prices.
  const products = []
  for (let page = 1; page < 40; page++) {
    const data = await get(`${SRC}/products.json?limit=250&page=${page}`, { json: true })
    const batch = data?.products ?? []
    if (!batch.length) break
    console.log(`  page ${page}: ${batch.length}`)
    for (const p of batch) {
      if (SKIP_PRODUCTS.has(rebrand(p.handle)) || SKIP_TYPES.has(p.product_type)) continue
      products.push(normalizeProduct(p))
    }
    await sleep(400)
  }
  console.log(`  total: ${products.length}`)
  return products
}

// ---- collections ----------------------------------------------------------

const SKIP_COLLECTIONS = new Set([
  'starter-kits-1', 'subscription', 'starter-pack', 'frontpage', 'luxury-towel-collection',
  'bath-bombs',
])

async function scrapeCollections(products) {
  console.log('Collections...')
  const byHandle = new Map(products.map((p) => [p.handle, p]))
  const list = []
  for (let page = 1; page < 10; page++) {
    const data = await get(`${SRC}/collections.json?limit=250&page=${page}`, { json: true })
    const batch = data?.collections ?? []
    if (!batch.length) break
    for (const c of batch) {
      if (SKIP_COLLECTIONS.has(c.handle)) continue
      list.push({
        handle: rebrand(c.handle),
        title: rebrand(debrand(c.title)),
        description: rebrand(stripHtml(c.body_html)),
        productHandles: [],
        _srcHandle: c.handle,
      })
    }
    await sleep(300)
  }
  for (const c of list) {
    const handles = []
    for (let page = 1; page < 20; page++) {
      const data = await get(`${SRC}/collections/${c._srcHandle}/products.json?limit=250&page=${page}`, { json: true })
      const batch = data?.products ?? []
      if (!batch.length) break
      for (const p of batch) {
        const h = rebrand(p.handle)
        if (byHandle.has(h)) handles.push(h)
      }
      await sleep(250)
    }
    delete c._srcHandle
    c.productHandles = [...new Set(handles)]
    console.log(`  ${c.handle}: ${c.productHandles.length}`)
  }
  return list.filter((c) => c.productHandles.length > 0)
}

// ---- images ---------------------------------------------------------------

async function downloadImages(products) {
  console.log('Images...')
  let ok = 0
  for (const p of products) {
    const local = []
    for (let i = 0; i < p.images.length; i++) {
      const url = p.images[i]
      const ext = (url.split('?')[0].match(/\.(png|jpe?g|webp|avif|gif)$/i)?.[1] || 'jpg').toLowerCase()
      const rel = `products/${p.handle}/${i}.${ext}`
      const dest = path.join(ROOT, 'public', rel)
      if (!existsSync(dest)) {
        const res = await fetch(url, { headers: { 'User-Agent': UA } }).catch(() => null)
        if (res?.ok) {
          await mkdir(path.dirname(dest), { recursive: true })
          await writeFile(dest, Buffer.from(await res.arrayBuffer()))
          ok++
          await sleep(120)
        } else {
          continue
        }
      }
      local.push('/' + rel)
    }
    p.images = local
  }
  console.log(`  downloaded ${ok} new files`)
}

function absUrl(u) {
  if (!u) return null
  if (u.startsWith('//')) return 'https:' + u
  if (u.startsWith('/')) return SRC + u
  return u.replace(/^http:\/\//, 'https://')
}

async function downloadOne(url, destRel) {
  const dest = path.join(ROOT, 'public', destRel)
  if (existsSync(dest)) return '/' + destRel
  const res = await fetch(url, { headers: { 'User-Agent': UA } }).catch(() => null)
  if (!res?.ok) return null
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  await sleep(120)
  return '/' + destRel
}

async function downloadBlogImages() {
  console.log('Blog images...')
  const articles = JSON.parse(await readFile(path.join(DATA, 'blog.json'), 'utf8'))
  let ok = 0
  for (const a of articles) {
    // hero / card image
    const src = absUrl(a.image)
    if (src && !a.image?.startsWith('/blog/')) {
      const ext = (src.split('?')[0].match(/\.(png|jpe?g|webp|avif|gif)$/i)?.[1] || 'jpg').toLowerCase()
      const local = await downloadOne(src, `blog/${a.handle}.${ext}`)
      if (local) {
        a.image = local
        ok++
      } else {
        a.image = null
      }
    }
    // in-body images
    let n = 0
    const imgs = [...a.bodyHtml.matchAll(/(<img[^>]+src=")([^"]+)(")/g)]
    for (const m of imgs) {
      const abs = absUrl(m[2])
      if (!abs || m[2].startsWith('/blog/')) continue
      const ext = (abs.split('?')[0].match(/\.(png|jpe?g|webp|avif|gif)$/i)?.[1] || 'jpg').toLowerCase()
      const local = await downloadOne(abs, `blog/${a.handle}-b${n}.${ext}`)
      n++
      if (local) {
        a.bodyHtml = a.bodyHtml.replace(m[2], local)
        ok++
      }
    }
  }
  await writeFile(path.join(DATA, 'blog.json'), JSON.stringify(articles, null, 2))
  console.log(`  downloaded ${ok} blog image files; ${articles.filter((a) => a.image).length}/${articles.length} have a hero image`)
}

// ---- blog ---------------------------------------------------------------

async function scrapeBlog() {
  console.log('Blog...')
  // gather article URLs from the blog sitemap
  const sm = await get(`${SRC}/sitemap_blogs_1.xml`)
  const urls = [...(sm?.matchAll(/<loc>([^<]+\/blogs\/blog\/[^<]+)<\/loc>/g) ?? [])].map((m) => m[1])
  console.log(`  ${urls.length} article urls`)
  const articles = []
  for (const url of urls) {
    const handle = url.split('/').pop()
    const html = await get(url)
    if (!html) continue
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => { try { return JSON.parse(m[1]) } catch { return null } })
      .filter(Boolean)
      .flatMap((x) => (Array.isArray(x) ? x : x['@graph'] ? x['@graph'] : [x]))
    const article = ld.find((x) => x['@type'] === 'Article' || x['@type'] === 'BlogPosting')
    const bodyMatch =
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      html.match(/<div[^>]+class="[^"]*(rte|article__content|blog__content)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
    const title = debrand(
      article?.headline ||
        html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
        html.match(/<title>([^<]+)<\/title>/)?.[1] ||
        handle,
    )
    const excerpt = stripHtml(html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '').slice(0, 300)
    const image = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || null
    articles.push({
      handle,
      title: rebrand(title),
      excerpt: rebrand(excerpt),
      image,
      author: article?.author?.name || 'Aroma Sense',
      publishedAt: article?.datePublished || null,
      bodyHtml: rebrand(bodyMatch ? sanitizeHtml(bodyMatch[1] || bodyMatch[2] || '') : ''),
    })
    if (articles.length % 20 === 0) console.log(`  ${articles.length}/${urls.length}`)
    await sleep(200)
  }
  articles.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
  console.log(`  ${articles.length} articles`)
  return articles
}

// ---- static pages -------------------------------------------------------

async function scrapePages() {
  console.log('Pages...')
  const slugs = [
    'how-it-works', 'installation', 'faq', 'faqs', 'why-aroma-sense',
    'about-us', 'about', 'shipping-policy', 'refund-policy', 'returns',
    'privacy-policy', 'terms-of-service', 'rewards',
  ]
  const pages = []
  for (const slug of slugs) {
    const html = await get(`${SRC}/pages/${slug}`)
    if (!html) continue
    const body =
      html.match(/<div[^>]+class="[^"]*(rte|page__content|shopify-policy__body)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/(div|main|section)>/i)
    const title = debrand(
      html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') ||
        slug,
    )
    pages.push({
      slug,
      title,
      bodyHtml: rebrand(body ? sanitizeHtml(body[2]) : ''),
      text: body ? stripHtml(body[2]) : '',
    })
    console.log(`  ${slug}: ${body ? 'ok' : 'no content block'}`)
    await sleep(200)
  }
  return pages
}

// ---- main ---------------------------------------------------------------

async function main() {
  await mkdir(DATA, { recursive: true })
  await mkdir(IMG_DIR, { recursive: true })

  const only = process.argv[2] // optional: products|collections|images|blog|blog-retry|pages

  if (only === 'blog-retry') {
    const existing = JSON.parse(await readFile(path.join(DATA, 'blog.json'), 'utf8'))
    const have = new Map(existing.map((a) => [a.handle, a]))
    const sm = await get(`${SRC}/sitemap_blogs_1.xml`)
    const urls = [...(sm?.matchAll(/<loc>([^<]+\/blogs\/blog\/[^<]+)<\/loc>/g) ?? [])].map((m) => m[1])
    const missing = urls.filter((u) => {
      const h = u.split('/').pop()
      const a = have.get(h)
      return !a || !a.bodyHtml || a.bodyHtml.length < 200
    })
    console.log(`retrying ${missing.length} articles`)
    for (const url of missing) {
      const handle = url.split('/').pop()
      let html = null
      for (let i = 0; i < 5 && !html; i++) {
        html = await get(url, { retries: 1 })
        if (!html) await sleep(4000)
      }
      if (!html) { console.log(`  still missing: ${handle}`); continue }
      const bodyMatch =
        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
        html.match(/<div[^>]+class="[^"]*(rte|article__content|blog__content)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
      const title = debrand(
        html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
          html.match(/<title>([^<]+)<\/title>/)?.[1] || handle,
      )
      have.set(handle, {
        handle,
        title: rebrand(title),
        excerpt: rebrand(stripHtml(html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '').slice(0, 300)),
        image: html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || null,
        author: 'Aroma Sense',
        publishedAt:
          [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
            .map((m) => { try { return JSON.parse(m[1]) } catch { return null } })
            .filter(Boolean).flatMap((x) => (x['@graph'] ? x['@graph'] : [x]))
            .find((x) => x['@type'] === 'Article' || x['@type'] === 'BlogPosting')?.datePublished || null,
        bodyHtml: rebrand(bodyMatch ? sanitizeHtml(bodyMatch[1] || bodyMatch[2] || '') : ''),
      })
      console.log(`  ok: ${handle}`)
      await sleep(1500)
    }
    const merged = [...have.values()].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    await writeFile(path.join(DATA, 'blog.json'), JSON.stringify(merged, null, 2))
    console.log(`Done. ${merged.length} articles, ${merged.filter((a) => a.bodyHtml.length > 200).length} with bodies`)
    return
  }

  let products = []
  if (!only || only === 'products' || only === 'collections' || only === 'images') {
    products = await scrapeProducts()
  }

  if (!only || only === 'images') await downloadImages(products)
  if (!only || only === 'products' || only === 'images') {
    await writeFile(path.join(DATA, 'catalog.json'), JSON.stringify(products, null, 2))
  }

  if (!only || only === 'collections') {
    if (!products.length) products = JSON.parse(await readFile(path.join(DATA, 'catalog.json'), 'utf8'))
    const collections = await scrapeCollections(products)
    await writeFile(path.join(DATA, 'collections.json'), JSON.stringify(collections, null, 2))
  }

  if (!only || only === 'blog') {
    const blog = await scrapeBlog()
    // never keep aromasenseusa.com photos — cover art is generated by gen-art.mjs
    for (const a of blog) a.image = null
    await writeFile(path.join(DATA, 'blog.json'), JSON.stringify(blog, null, 2))
  }

  if (only === 'blog-images') {
    // legacy path — download the live photos (not used by the site)
    await downloadBlogImages()
  }

  if (!only || only === 'blog') {
    // regenerate branded cover art + strip any <img> from bodies
    await import('./gen-art.mjs').catch(() => {})
  }

  if (only === 'pages') {
    // The live theme renders page bodies with JS, so scraped content is unreliable.
    // Curated policy/content pages live in server/data/pages.json and are kept by hand.
    const pages = await scrapePages()
    await writeFile(path.join(DATA, 'pages.scraped.json'), JSON.stringify(pages, null, 2))
    console.log('wrote pages.scraped.json (reference only; edit pages.json by hand)')
  }

  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
