// Frontend Worker (see wrangler.pages.toml): serves the static site, and for page navigations
// rewrites <head> so crawlers and link-preview bots that don't run JavaScript still see the
// right title, description, canonical, social tags and structured data for each URL.
import manifest from './seo-manifest.generated.json' with { type: 'json' }
import {
  abs,
  articleSeo,
  cmsSeo,
  collectionSeo,
  isNoindexPath,
  normalizePath,
  productSeo,
  SITE_NAME,
  SITE_URL,
  staticSeo,
  ogImage,
  type SeoInput,
} from '../src/lib/seoShared.ts'
import { consentRequired } from '../src/lib/consentRegions.ts'

type Env = { ASSETS: Fetcher; API_BASE?: string }
type Resolved = { status: number; seo: SeoInput; noindex: boolean }

const notFound = (path: string): Resolved => ({
  status: 404,
  noindex: true,
  seo: { title: `Page not found | ${SITE_NAME}`, description: 'This page could not be found.', path, noindex: true },
})

type EdgeReviews = NonNullable<Parameters<typeof productSeo>[0]['reviews']>

function resolve(rawPath: string, reviews?: EdgeReviews): Resolved {
  const path = normalizePath(rawPath)
  const s = staticSeo(path)
  if (s) return { status: 200, noindex: false, seo: s }
  if (isNoindexPath(path)) {
    return { status: 200, noindex: true, seo: { title: SITE_NAME, description: '', path, noindex: true } }
  }

  const [, kind, handle, ...rest] = path.split('/')
  if (rest.length || !handle) return notFound(path)

  if (kind === 'products') {
    const p = manifest.products[handle as keyof typeof manifest.products]
    if (!p) return notFound(path)
    return {
      status: 200,
      noindex: false,
      seo: productSeo({ handle, title: p.t, description: p.d, images: p.i, sku: p.sku, lowCents: p.lo, highCents: p.hi, offerCount: p.n, available: p.a, reviews }),
    }
  }
  if (kind === 'collections') {
    const c = manifest.collections[handle as keyof typeof manifest.collections]
    if (!c) return notFound(path)
    return { status: 200, noindex: false, seo: collectionSeo({ handle, title: c.t, description: c.d, image: c.i ?? undefined }) }
  }
  if (kind === 'blog') {
    const a = manifest.blog[handle as keyof typeof manifest.blog]
    if (!a) return notFound(path)
    return {
      status: 200,
      noindex: false,
      seo: articleSeo({ handle, title: a.t, description: a.d, image: a.i, author: a.au, publishedAt: a.p }),
    }
  }
  if (kind === 'pages') {
    const p = manifest.pages[handle as keyof typeof manifest.pages]
    if (!p) return notFound(path)
    return { status: 200, noindex: false, seo: cmsSeo({ slug: handle, title: p.t, description: p.d }) }
  }
  return notFound(path)
}

// Real, approved reviews for a product page (cached at the edge for 5 minutes). Any problem => no rating markup.
async function edgeReviews(apiBase: string, handle: string): Promise<EdgeReviews | undefined> {
  try {
    const res = await fetch(`${apiBase}/api/products/${encodeURIComponent(handle)}/reviews?limit=5`, {
      signal: AbortSignal.timeout(900),
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit)
    if (!res.ok) return undefined
    const d = (await res.json()) as { summary: { count: number; average: number }; reviews: { name: string; rating: number; title: string | null; body: string; createdAt: string }[] }
    if (!d.summary.count) return undefined
    return {
      count: d.summary.count,
      average: d.summary.average,
      items: d.reviews.map((r) => ({ author: r.name, rating: r.rating, title: r.title, body: r.body, date: r.createdAt.slice(0, 10) })),
    }
  } catch {
    return undefined
  }
}

const attr = (name: string, value: string) => ({
  element(el: Element) {
    el.setAttribute(name, value)
  },
})

function rewrite(res: Response, { seo, noindex }: Resolved, consentNeeded: boolean) {
  const image = ogImage(seo.image)
  const url = abs(seo.path)
  const description = seo.description || undefined
  const r = new HTMLRewriter()
    .on('title', { element: (el) => void el.setInnerContent(seo.title) })
    .on('link[rel="canonical"]', attr('href', url))
    .on('meta[property="og:title"]', attr('content', seo.title))
    .on('meta[property="og:type"]', attr('content', seo.type ?? 'website'))
    .on('meta[property="og:url"]', attr('content', url))
    .on('meta[property="og:image"]', attr('content', image))
    .on('meta[name="twitter:title"]', attr('content', seo.title))
    .on('meta[name="twitter:image"]', attr('content', image))
  if (description) {
    r.on('meta[name="description"]', attr('content', description))
      .on('meta[property="og:description"]', attr('content', description))
      .on('meta[name="twitter:description"]', attr('content', description))
  }
  r.on('head', {
    element(el) {
      // must run before the analytics loader in index.html, so it goes first in <head>
      el.prepend(`<script>window.__geo={r:${consentNeeded}}</script>`, { html: true })
      if (noindex) el.append('<meta name="robots" content="noindex,follow">', { html: true })
      if (seo.jsonLd?.length) {
        const json = JSON.stringify(seo.jsonLd.length === 1 ? seo.jsonLd[0] : seo.jsonLd).replace(/</g, '\\u003c')
        el.append(`<script type="application/ld+json" id="seo-jsonld">${json}</script>`, { html: true })
      }
    },
  })
  return r.transform(res)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // one canonical host: www -> apex (duplicate-content protection)
    if (url.hostname.startsWith('www.')) {
      return Response.redirect(SITE_URL + url.pathname + url.search, 301)
    }

    // product feed for Google Merchant Center, generated live by the API Worker
    if (url.pathname === '/feeds/google-products.xml') {
      const upstream = await fetch('https://api.vitamincshower.com/api/feeds/google-products.xml')
      return new Response(upstream.body, { status: upstream.status, headers: upstream.headers })
    }

    const last = url.pathname.split('/').pop() ?? ''
    if (last.includes('.')) return env.ASSETS.fetch(request) // files: pass straight through (missing ones 404)

    const productMatch = /^\/products\/([^/]+)\/?$/.exec(url.pathname)
    const resolved = resolve(url.pathname, productMatch ? await edgeReviews(env.API_BASE ?? 'https://api.vitamincshower.com', decodeURIComponent(productMatch[1])) : undefined)
    // always serve the app shell (crawlers don't send the navigation headers SPA fallback keys on)
    const shell = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: request.headers }))
    const out = rewrite(shell, resolved, consentRequired(request.cf?.country, request.cf?.isEUCountry))
    const headers = new Headers(out.headers)
    if (resolved.noindex) headers.set('X-Robots-Tag', 'noindex, follow')
    headers.delete('content-length')
    return new Response(out.body, { status: resolved.status, headers })
  },
}
