import { Router } from 'express'
import { listProducts } from '../catalog.ts'
import { abs, SITE_NAME, SITE_URL, stripHtml, truncate } from '../../src/lib/seoShared.ts'

export const feedsRouter = Router()

// Google product taxonomy ids (from google.com/basepages/producttype/taxonomy-with-ids.en-US.txt)
const SHOWER_HEADS = '581'
const SHOWER_WATER_FILTERS = '5048'
const SHOWER_PARTS = '2206'
const CATEGORY: Record<string, string> = {
  'Shower Heads': SHOWER_HEADS,
  'Starter Kits': SHOWER_HEADS,
  'Vitamin C Cartridges': SHOWER_WATER_FILTERS,
  'Microfiber filters': SHOWER_WATER_FILTERS,
  'Hose & Bracket': SHOWER_PARTS,
  'Spare Parts': SHOWER_PARTS,
}

const FEED_EXTRA: Record<string, string> = {
  'Shower Heads': 'Microfiber filters trap rust, dirt and sediment from your pipes. Fits the standard ½-inch shower connection.',
  'Starter Kits':
    'The vitamin C cartridge neutralizes chlorine and adds aromatherapy, and the microfiber filters trap rust, dirt and sediment from your pipes. Fits the standard ½-inch shower connection.',
  'Vitamin C Cartridges': 'Replace within 30 to 45 days depending on usage.',
  'Microfiber filters': 'Replace when the filter changes color, typically every 2 to 3 months depending on your water.',
  'Hose & Bracket': 'Genuine Aroma Sense accessory.',
  'Spare Parts': 'Genuine Aroma Sense replacement part.',
}

// characters that are illegal in XML 1.0 (control characters other than tab, newline, carriage return)
// oxlint-disable-next-line no-control-regex
const ILLEGAL_XML = new RegExp('[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', 'g')
const xml = (s: string) =>
  s
    .replace(ILLEGAL_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
const tag = (name: string, value: string | number) => `<g:${name}>${xml(String(value))}</g:${name}>`
// Merchant Center accepts JPEG/PNG; the animated WebP demos in our galleries are left out
const usable = (u: string) => /\.(jpe?g|png)$/i.test(u)

feedsRouter.get('/feeds/google-products.xml', async (_req, res) => {
  const products = await listProducts() // live: includes admin price/stock/visibility overrides
  const items: string[] = []

  for (const p of products) {
    const images = p.images.filter(usable)
    if (!images.length) continue
    // Deliberately not the storefront copy: Merchant Center disapproves unsupported health claims
    // ("promotes healthier skin", "scientifically proven to aid breathing"), so the feed sticks to
    // plain product facts drawn from the same verified data as the SEO descriptions.
    const base = p.metaDescription || truncate(stripHtml(p.description) || p.title, 300)
    const extra = FEED_EXTRA[p.productType] ?? ''
    const description = truncate(`${base}${extra ? ' ' + extra : ''}`, 4900)
    const multi = p.variants.length > 1

    for (const v of p.variants) {
      const title = multi && v.title ? `${p.title} - ${v.title}` : p.title
      items.push(
        '<item>' +
          tag('id', v.id) +
          `<title>${xml(truncate(title, 150))}</title>` +
          `<description>${xml(description)}</description>` +
          `<link>${xml(`${SITE_URL}/products/${p.handle}`)}</link>` +
          tag('image_link', abs(images[0])) +
          images
            .slice(1, 11)
            .map((i) => tag('additional_image_link', abs(i)))
            .join('') +
          tag('availability', v.available ? 'in_stock' : 'out_of_stock') +
          tag('price', `${(v.priceCents / 100).toFixed(2)} USD`) +
          tag('condition', 'new') +
          tag('brand', SITE_NAME) +
          (v.sku ? tag('mpn', v.sku) : tag('identifier_exists', 'no')) +
          tag('product_type', p.productType) +
          (CATEGORY[p.productType] ? tag('google_product_category', CATEGORY[p.productType]) : '') +
          (multi ? tag('item_group_id', p.id) : '') +
          (p.productType === 'Starter Kits' ? tag('is_bundle', 'yes') : '') +
          '<g:shipping>' +
          tag('country', 'US') +
          tag('service', 'Standard') +
          tag('price', '0.00 USD') +
          '</g:shipping>' +
          '</item>',
      )
    }
  }

  res
    .type('application/xml; charset=utf-8')
    .set({ 'Cache-Control': 'public, max-age=1800', 'X-Robots-Tag': 'noindex' })
    .send(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>' +
        `<title>${xml(SITE_NAME)}</title><link>${SITE_URL}</link>` +
        `<description>${xml('Vitamin C aromatherapy shower heads, cartridges and starter kits')}</description>` +
        items.join('\n') +
        '</channel></rss>\n',
    )
})
