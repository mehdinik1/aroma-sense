// Shared by the browser (src/lib/seo.ts), the edge Worker (server/seo-worker.ts) and the
// build script (scripts/build-seo.ts) so titles, descriptions and structured data can never drift.

export const SITE_URL = 'https://vitamincshower.com'
export const SITE_NAME = 'Aroma Sense'
export const DEFAULT_IMAGE = '/products/as-luxe/0.jpg'
export const HOME_TITLE = 'Aroma Sense — Vitamin C Aromatherapy Shower Heads'
export const HOME_DESCRIPTION =
  'Aroma Sense turns your daily shower into a spa. Vitamin C aromatherapy shower heads, cartridges and starter kits that filter chlorine for healthier hair and skin. Free U.S. shipping.'

export type StaticSeo = { title: string; description: string; canonical?: string }

// Indexable pages with fixed copy (the copy mirrors each page's own hero text).
export const STATIC_SEO: Record<string, StaticSeo> = {
  '/': { title: HOME_TITLE, description: HOME_DESCRIPTION },
  '/shop': {
    title: 'Shop All Products | Aroma Sense',
    description: 'Vitamin C aromatherapy shower heads, cartridges, starter kits and spare parts.',
  },
  '/build': {
    title: 'Build Your Own Shower Kit | Aroma Sense',
    description:
      'Design your Aroma Sense shower: pick a vitamin C aromatherapy shower head, cartridges and filters for a spa-inspired shower at home.',
  },
  '/collections/starter-pack': {
    title: 'Build Your Own Shower Kit | Aroma Sense',
    description:
      'Design your Aroma Sense shower: pick a vitamin C aromatherapy shower head, cartridges and filters for a spa-inspired shower at home.',
    canonical: '/build',
  },
  '/the-buzz': {
    title: 'What People Are Saying | Aroma Sense',
    description:
      "From resort spa directors to first-time buyers — here's the reaction to showering with vitamin C aromatherapy.",
  },
  '/how-it-works': {
    title: 'How It Works | Aroma Sense',
    description:
      'Every Aroma Sense shower head filters water, adds real aromatherapy and boosts pressure, powered by one vitamin C cartridge you swap about once a month.',
  },
  '/installation': {
    title: 'Installation Guide | Aroma Sense',
    description:
      'Installs in about five minutes with no plumber and no tools for most bathrooms. Aroma Sense heads fit the standard ½-inch connection used across North America.',
  },
  '/faq': {
    title: 'FAQ | Aroma Sense',
    description: 'Answers to frequently asked questions about Aroma Sense vitamin C aromatherapy shower heads.',
  },
  '/why-aroma-sense': {
    title: 'Why Aroma Sense | Vitamin C Shower Systems Used in Luxury Hotel Spas',
    description:
      'Aroma Sense makes the vitamin C aromatherapy shower systems used in luxury hotel spas — the same technology, for your bathroom at home.',
  },
  '/rewards': {
    title: 'Aroma Sense Rewards | Earn Points on Every Order',
    description:
      'Earn points on everything you buy and turn them into savings on refills with Aroma Sense Rewards.',
  },
  '/blog': {
    title: 'The Aroma Sense Blog',
    description: 'Water quality, essential oils, showering habits and small upgrades for a better bathroom.',
  },
  '/contact': {
    title: 'Contact Us | Aroma Sense',
    description:
      "Questions about a product, an order, or fitting Aroma Sense to your shower? Send us a note and we'll reply within one business day.",
  },
}

// Private / transactional areas: never indexed.
// /deal-of-the-month is a client-side redirect to the current deal product
export const NOINDEX_PREFIXES = ['/cart', '/checkout', '/account', '/admin', '/search', '/deal-of-the-month']

export const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/'
export const isNoindexPath = (p: string) => NOINDEX_PREFIXES.some((x) => p === x || p.startsWith(x + '/'))
export const abs = (u: string) => (/^https?:\/\//.test(u) ? u : SITE_URL + (u.startsWith('/') ? u : '/' + u))

export const withBrand = (t: string) => (t.toLowerCase().includes(SITE_NAME.toLowerCase()) ? t : `${t} | ${SITE_NAME}`)
// Social scrapers can't render SVG, so fall back to a product photo for those.
export const ogImage = (img?: string | null) => abs(img && !/\.svg(\?|$)/i.test(img) ? img : DEFAULT_IMAGE)

export function truncate(text: string, max = 158) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return cut.slice(0, cut.lastIndexOf(' ') > 90 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:.\-–—\s]+$/, '') + '…'
}

export const stripHtml = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

export type SeoInput = {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'product' | 'article'
  noindex?: boolean
  jsonLd?: object[]
}

// ---- structured data -------------------------------------------------------

export const organizationLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: abs('/favicon.svg'),
  description: HOME_DESCRIPTION,
})

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
})

export const breadcrumbLd = (crumbs: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: abs(c.path),
  })),
})

export type ProductSeoData = {
  handle: string
  title: string
  description: string
  images: string[]
  sku: string | null
  lowCents: number
  highCents: number
  offerCount: number
  available: boolean
}

export function productSeo(p: ProductSeoData): SeoInput {
  const path = `/products/${p.handle}`
  const availability = p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const price = (c: number) => (c / 100).toFixed(2)
  const offers =
    p.offerCount > 1
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: price(p.lowCents),
          highPrice: price(p.highCents),
          offerCount: p.offerCount,
          availability,
          url: abs(path),
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: price(p.lowCents),
          availability,
          itemCondition: 'https://schema.org/NewCondition',
          url: abs(path),
        }
  // many product descriptions open with a contents list ("Includes 1 shower head…"); lead with the name
  const raw = p.description.replace(/&amp;/g, '&')
  const description = truncate(!raw ? `${p.title} from ${SITE_NAME}.` : /^includes/i.test(raw) ? `${p.title}. ${raw}` : raw)
  return {
    title: withBrand(p.title),
    description,
    path,
    image: p.images[0],
    type: 'product',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.title,
        description,
        image: p.images.slice(0, 5).map(abs),
        ...(p.sku ? { sku: p.sku } : {}),
        brand: { '@type': 'Brand', name: SITE_NAME },
        offers,
      },
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
        { name: p.title, path },
      ]),
    ],
  }
}

export type ArticleSeoData = {
  handle: string
  title: string
  description: string
  image: string | null
  author: string
  publishedAt: string | null
}

export function articleSeo(a: ArticleSeoData): SeoInput {
  const path = `/blog/${a.handle}`
  return {
    title: withBrand(a.title),
    description: truncate(a.description || a.title),
    path,
    image: a.image ?? undefined,
    type: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title.slice(0, 110),
        ...(a.image ? { image: [abs(a.image)] } : {}),
        ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
        author: { '@type': 'Organization', name: SITE_NAME },
        publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: abs('/favicon.svg') } },
        mainEntityOfPage: abs(path),
      },
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: a.title, path },
      ]),
    ],
  }
}

export function collectionSeo(c: { handle: string; title: string; description: string; image?: string }): SeoInput {
  const path = `/collections/${c.handle}`
  return {
    title: withBrand(c.title),
    description: truncate(c.description || `Shop ${c.title} from ${SITE_NAME} — vitamin C aromatherapy shower systems.`),
    path,
    image: c.image,
    jsonLd: [
      breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
        { name: c.title, path },
      ]),
    ],
  }
}

export const cmsSeo = (p: { slug: string; title: string; description: string }): SeoInput => ({
  title: withBrand(p.title),
  description: truncate(p.description || `${p.title} — ${SITE_NAME}.`),
  path: `/pages/${p.slug}`,
})

export function staticSeo(path: string): SeoInput | null {
  const s = STATIC_SEO[path]
  if (!s) return null
  return {
    title: s.title,
    description: s.description,
    path: s.canonical ?? path,
    ...(path === '/' ? { jsonLd: [organizationLd(), websiteLd()] } : {}),
  }
}
