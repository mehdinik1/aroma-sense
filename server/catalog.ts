import {
  allOverrides,
  getOverride,
  productByHandle,
  rawCollections,
  rawProducts,
  type Override,
  type RawProduct,
} from './db.ts'

export type ApiVariant = {
  id: number
  title: string | null
  sku: string | null
  priceCents: number
  compareAtCents: number
  available: boolean
}

export type ApiProduct = {
  id: number
  handle: string
  title: string
  description: string
  bodyHtml: string
  vendor: string
  productType: string
  tags: string[]
  images: string[]
  variants: ApiVariant[]
  featured: boolean
  visible: boolean
  stock: number
  priceFromCents: number
  compareAtCents: number
}

function applyOverride(p: RawProduct, o: Override | undefined): ApiProduct {
  const priceDelta =
    o?.price_cents != null && p.variants.length
      ? o.price_cents - Math.min(...p.variants.map((v) => v.priceCents))
      : 0

  const variants: ApiVariant[] = p.variants.map((v) => ({
    id: v.id,
    title: v.title,
    sku: v.sku,
    priceCents: Math.max(0, v.priceCents + priceDelta),
    compareAtCents:
      o?.compare_at_cents != null && p.variants.length === 1 ? o.compare_at_cents : v.compareAtCents,
    available: v.available && (o?.stock ?? 25) > 0,
  }))

  const priceFromCents = variants.length ? Math.min(...variants.map((v) => v.priceCents)) : 0
  const compareAtCents = variants.length
    ? Math.max(...variants.map((v) => v.compareAtCents), 0)
    : 0

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    bodyHtml: p.bodyHtml,
    vendor: p.vendor,
    productType: p.productType,
    tags: p.tags,
    images: p.images,
    variants,
    featured: !!o?.featured,
    visible: o ? !!o.visible : true,
    stock: o?.stock ?? 25,
    priceFromCents,
    compareAtCents,
  }
}

export async function listProducts({ includeHidden = false } = {}): Promise<ApiProduct[]> {
  const overrides = await allOverrides()
  return rawProducts
    .map((p) => applyOverride(p, overrides.get(p.handle)))
    .filter((p) => includeHidden || p.visible)
}

export async function getProduct(
  handle: string,
  { includeHidden = false } = {},
): Promise<ApiProduct | null> {
  const raw = productByHandle.get(handle)
  if (!raw) return null
  const p = applyOverride(raw, await getOverride(handle))
  if (!p.visible && !includeHidden) return null
  return p
}

export async function getVariant(
  variantId: number,
): Promise<{ product: ApiProduct; variant: ApiVariant } | null> {
  // batch-fetch all overrides once rather than one D1 round trip per candidate product
  const overrides = await allOverrides()
  for (const raw of rawProducts) {
    if (!raw.variants.some((v) => v.id === variantId)) continue
    const product = applyOverride(raw, overrides.get(raw.handle))
    const variant = product.variants.find((v) => v.id === variantId)
    if (variant) return { product, variant }
  }
  return null
}

export async function listCollections() {
  const visible = new Set((await listProducts()).map((p) => p.handle))
  return rawCollections
    .map((c) => ({
      handle: c.handle,
      title: c.title,
      description: c.description,
      productHandles: c.productHandles.filter((h) => visible.has(h)),
    }))
    .filter((c) => c.productHandles.length > 0)
}

export async function getCollection(handle: string) {
  const c = rawCollections.find((x) => x.handle === handle)
  if (!c) return null
  const products = (await listProducts()).filter((p) => c.productHandles.includes(p.handle))
  return {
    collection: { handle: c.handle, title: c.title, description: c.description, productHandles: products.map((p) => p.handle) },
    products,
  }
}
