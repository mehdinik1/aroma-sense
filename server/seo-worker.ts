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

type Env = { ASSETS: Fetcher }
type Resolved = { status: number; seo: SeoInput; noindex: boolean }

const notFound = (path: string): Resolved => ({
  status: 404,
  noindex: true,
  seo: { title: `Page not found | ${SITE_NAME}`, description: 'This page could not be found.', path, noindex: true },
})

function resolve(rawPath: string): Resolved {
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
      seo: productSeo({ handle, title: p.t, description: p.d, images: p.i, sku: p.sku, lowCents: p.lo, highCents: p.hi, offerCount: p.n, available: p.a }),
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

const attr = (name: string, value: string) => ({
  element(el: Element) {
    el.setAttribute(name, value)
  },
})

function rewrite(res: Response, { seo, noindex }: Resolved) {
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

    const last = url.pathname.split('/').pop() ?? ''
    if (last.includes('.')) return env.ASSETS.fetch(request) // files: pass straight through

    const resolved = resolve(url.pathname)
    // always serve the app shell (crawlers don't send the navigation headers SPA fallback keys on)
    const shell = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: request.headers }))
    const out = rewrite(shell, resolved)
    const headers = new Headers(out.headers)
    if (resolved.noindex) headers.set('X-Robots-Tag', 'noindex, follow')
    headers.delete('content-length')
    return new Response(out.body, { status: resolved.status, headers })
  },
}
