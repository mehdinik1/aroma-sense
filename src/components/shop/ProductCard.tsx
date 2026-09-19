import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import type { Product } from '@/lib/types'
import { formatMoney } from '@/lib/utils'
import { WishlistButton } from './WishlistButton'
import { Stars } from './Stars'
import { loadReviewSummaries, useAsync } from '@/lib/store'

const SUBSCRIBABLE = new Set(['Vitamin C Cartridges', 'Microfiber filters'])

export function ProductCard({ product }: { product: Product }) {
  const summaries = useAsync(loadReviewSummaries, []).data
  const rating = summaries?.[product.handle]
  const onSale = product.compareAtCents > product.priceFromCents
  const multiPrice = product.variants.length > 1
  const off = onSale
    ? Math.round(((product.compareAtCents - product.priceFromCents) / product.compareAtCents) * 100)
    : 0

  return (
    <Link
      to={`/products/${product.handle}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-primary/50"
    >
      <div className="photo-tile relative aspect-square overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-lg text-[#9b7c3f]">
            Aroma Sense
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              −{off}%
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="rounded-full bg-[#1a1712]/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e7cf9b]">
              Low stock
            </span>
          )}
        </div>
        {SUBSCRIBABLE.has(product.productType) && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#1a1712]/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e7cf9b] backdrop-blur">
            <RefreshCw className="h-3 w-3" /> Subscribe
          </span>
        )}
        <WishlistButton handle={product.handle} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {product.productType}
        </span>
        <h3 className="font-display text-base leading-snug text-foreground transition-colors group-hover:text-primary">
          {product.title}
        </h3>
        {rating && rating.count > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Stars value={rating.average} size={13} />
            <span className="text-[11px] text-muted-foreground">({rating.count})</span>
          </div>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <span className="text-sm font-semibold text-primary">
            {multiPrice && <span className="text-muted-foreground">From </span>}
            {formatMoney(product.priceFromCents)}
          </span>
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatMoney(product.compareAtCents)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
