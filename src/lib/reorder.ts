import { api } from './api'
import type { OrderItem, Product, Variant } from './types'

export type ReorderResult = { added: number; skipped: number }

/**
 * "Buy again" — re-adds a past order's line items to the cart using today's
 * catalog (current price + stock), not the historical order data. Items that
 * are no longer visible or in stock are silently skipped and counted.
 */
export async function buyAgainItems(
  items: OrderItem[],
  add: (product: Product, variant: Variant, quantity: number, subscribe: boolean) => void,
): Promise<ReorderResult> {
  let added = 0
  let skipped = 0
  for (const it of items) {
    try {
      const product = await api.product(it.productHandle)
      const variant = product.variants.find((v) => v.id === it.variantId) ?? product.variants[0]
      if (!product.visible || !variant || !variant.available || product.stock <= 0) {
        skipped++
        continue
      }
      add(product, variant, it.quantity, false)
      added++
    } catch {
      skipped++
    }
  }
  return { added, skipped }
}
