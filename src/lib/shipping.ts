// Single source of truth for shipping pricing, used by checkout (server) and the cart (browser).
// Standard shipping is free once the merchandise subtotal, before discounts and taxes, reaches the minimum.
export const FREE_SHIPPING_MIN_CENTS = 10000
export const STANDARD_SHIPPING_CENTS = 800
export const EXPEDITED_SHIPPING_CENTS = 1999

export const standardShippingCents = (subtotalCents: number) =>
  subtotalCents >= FREE_SHIPPING_MIN_CENTS ? 0 : STANDARD_SHIPPING_CENTS
export const amountToFreeShippingCents = (subtotalCents: number) => Math.max(0, FREE_SHIPPING_MIN_CENTS - subtotalCents)
