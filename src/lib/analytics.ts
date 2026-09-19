import type { CartLine } from './cart'
import type { Product, Variant } from './types'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export type GaItem = {
  item_id: string
  item_name: string
  item_variant?: string
  item_category?: string
  price: number
  quantity: number
}

const dollars = (cents: number) => Math.round(cents) / 100

/** Fire-and-forget GA4 event. Silent if gtag is blocked, and never runs in the admin area. */
export function track(event: string, params: Record<string, unknown> = {}) {
  try {
    if (location.pathname.startsWith('/admin')) return
    if (window.__analytics?.decision() !== 'granted') return // no consent, no events
    window.gtag?.('event', event, params)
  } catch {
    /* analytics must never break the store */
  }
}

export const lineToItem = (l: CartLine): GaItem => ({
  item_id: l.handle,
  item_name: l.title,
  ...(l.variantTitle ? { item_variant: l.variantTitle } : {}),
  item_category: l.productType,
  price: dollars(l.priceCents),
  quantity: l.quantity,
})

export const productToItem = (p: Product, v?: Variant, quantity = 1): GaItem => ({
  item_id: p.handle,
  item_name: p.title,
  ...(v?.title ? { item_variant: v.title } : {}),
  item_category: p.productType,
  price: dollars(v?.priceCents ?? p.priceFromCents),
  quantity,
})

export const itemsValue = (items: GaItem[]) => Math.round(items.reduce((n, i) => n + i.price * i.quantity, 0) * 100) / 100

// The success page can't see the cart (it's cleared) or the final total, so the cart page
// leaves a snapshot here right before redirecting to Stripe.
const SNAPSHOT_KEY = 'aroma-sense-ga-checkout-v1'

export type CheckoutSnapshot = { items: GaItem[]; value: number; shipping?: number; coupon?: string }

export function saveCheckoutSnapshot(s: CheckoutSnapshot) {
  try {
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

/** Fires GA4 `purchase` once per order reference; a refresh or revisit never double-counts. */
export function trackPurchaseOnce(ref: string) {
  try {
    const doneKey = `aroma-sense-ga-purchased-${ref}`
    if (localStorage.getItem(doneKey)) return
    const raw = sessionStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as CheckoutSnapshot
    track('purchase', {
      transaction_id: ref,
      currency: 'USD',
      value: s.value,
      shipping: s.shipping ?? 0,
      ...(s.coupon ? { coupon: s.coupon } : {}),
      items: s.items,
    })
    localStorage.setItem(doneKey, '1')
    sessionStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    /* ignore */
  }
}
