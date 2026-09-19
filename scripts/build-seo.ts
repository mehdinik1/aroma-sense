// `manifest` (prebuild): slim per-URL metadata the edge Worker injects into the HTML head.
// `sitemap` (postbuild): dist/sitemap.xml. Both derive from the same catalog the site serves.
import fs from 'node:fs'
import catalog from '../server/data/catalog.json' with { type: 'json' }
import collections from '../server/data/collections.json' with { type: 'json' }
import blog from '../server/data/blog.json' with { type: 'json' }
import pages from '../server/data/pages.json' with { type: 'json' }
import { abs, STATIC_SEO, stripHtml, truncate } from '../src/lib/seoShared.ts'

type P = { handle: string; title: string; description: string; bodyHtml: string; images: string[]; variants: { sku: string | null; priceCents: number; available: boolean }[] }
const products = catalog as unknown as P[]
const byHandle = new Map(products.map((p) => [p.handle, p]))

const mode = process.argv[2]
// the API hides blog posts with near-empty bodies — keep the sitemap/manifest consistent with it
const articles = (blog as { handle: string; title: string; excerpt: string; image: string | null; author: string; publishedAt: string | null; bodyHtml: string }[]).filter(
  (a) => a.bodyHtml && a.bodyHtml.length > 120,
)
const cmsPages = (pages as { slug: string; title: string; bodyHtml: string }[]).filter((p) => p.bodyHtml)
const liveCollections = (collections as { handle: string; title: string; description: string; productHandles: string[] }[]).filter(
  (c) => c.productHandles.some((h) => byHandle.has(h)) && c.handle !== 'starter-pack',
)

if (mode === 'manifest') {
  const manifest = {
    products: Object.fromEntries(
      products.map((p) => {
        const prices = p.variants.map((v) => v.priceCents)
        return [
          p.handle,
          {
            t: p.title,
            d: truncate(p.description || stripHtml(p.bodyHtml)),
            i: p.images,
            sku: p.variants[0]?.sku ?? null,
            lo: Math.min(...prices),
            hi: Math.max(...prices),
            n: p.variants.length,
            a: p.variants.some((v) => v.available),
          },
        ]
      }),
    ),
    collections: Object.fromEntries(
      liveCollections.map((c) => [
        c.handle,
        { t: c.title, d: c.description ? stripHtml(c.description) : '', i: byHandle.get(c.productHandles.find((h) => byHandle.has(h))!)?.images[0] ?? null },
      ]),
    ),
    blog: Object.fromEntries(
      articles.map((a) => [a.handle, { t: a.title, d: a.excerpt ? stripHtml(a.excerpt) : stripHtml(a.bodyHtml).slice(0, 400), i: a.image, au: a.author, p: a.publishedAt }]),
    ),
    pages: Object.fromEntries(cmsPages.map((p) => [p.slug, { t: p.title, d: stripHtml(p.bodyHtml).slice(0, 400) }])),
  }
  fs.writeFileSync(new URL('../server/seo-manifest.generated.json', import.meta.url), JSON.stringify(manifest))
  console.log(`[seo] manifest: ${products.length} products, ${liveCollections.length} collections, ${articles.length} articles, ${cmsPages.length} pages`)
} else if (mode === 'sitemap') {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const url = (path: string, extra = '') => `<url><loc>${esc(abs(path))}</loc>${extra}</url>`
  const staticPaths = Object.entries(STATIC_SEO).filter(([, s]) => !s.canonical).map(([p]) => p)
  const entries = [
    ...staticPaths.map((p) => url(p)),
    ...liveCollections.map((c) => url(`/collections/${c.handle}`)),
    ...products.map((p) => url(`/products/${p.handle}`, p.images[0] ? `<image:image><image:loc>${esc(abs(p.images[0]))}</image:loc><image:title>${esc(p.title)}</image:title></image:image>` : '')),
    ...articles.map((a) => url(`/blog/${a.handle}`, a.publishedAt ? `<lastmod>${a.publishedAt.slice(0, 10)}</lastmod>` : '')),
    ...cmsPages.map((p) => url(`/pages/${p.slug}`)),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`
  fs.mkdirSync(new URL('../dist/', import.meta.url), { recursive: true })
  fs.writeFileSync(new URL('../dist/sitemap.xml', import.meta.url), xml)
  console.log(`[seo] sitemap: ${entries.length} URLs`)
} else {
  throw new Error('usage: build-seo.ts <manifest|sitemap>')
}
