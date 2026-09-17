import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { Check, ChevronLeft, RefreshCw, Sparkles } from 'lucide-react'
import { Container } from '@/components/site/Container'
import { Button } from '@/components/ui/button'
import { Loading, ErrorState } from '@/components/site/PageHero'
import { ProductCard } from '@/components/shop/ProductCard'
import { WishlistButton } from '@/components/shop/WishlistButton'
import { TrustBadges } from '@/components/site/TrustBadges'
import { useAsync, loadProducts, loadConfig } from '@/lib/store'
import { api } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { cn, formatMoney } from '@/lib/utils'
import type { Product } from '@/lib/types'

export function ProductPage() {
  const { handle = '' } = useParams()
  const { openCart } = useOutletContext<{ openCart: () => void }>()
  const { add } = useCart()
  const { data: product, loading, error } = useAsync(() => api.product(handle), [handle])
  const all = useAsync(loadProducts, [])
  const config = useAsync(loadConfig, [])

  const [variantId, setVariantId] = useState<number | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [subscribe, setSubscribe] = useState(false)

  useEffect(() => {
    if (product) {
      setVariantId(product.variants[0]?.id ?? null)
      setActiveImage(0)
    }
  }, [product])

  const variant = useMemo(
    () => product?.variants.find((v) => v.id === variantId) ?? product?.variants[0],
    [product, variantId],
  )

  const related = useMemo<Product[]>(() => {
    if (!product || !all.data) return []
    return all.data
      .filter((p) => p.productType === product.productType && p.handle !== product.handle)
      .slice(0, 4)
  }, [product, all.data])

  if (loading) return <Loading />
  if (error || !product) return <ErrorState message="This product could not be found." />

  const onSale = variant && variant.compareAtCents > variant.priceCents
  const soldOut = product.stock <= 0

  const subDiscount = config.data?.loyalty.subscriptionDiscountPct ?? 15
  const canSubscribe = !!config.data?.loyalty.subscribableTypes.includes(product.productType)
  const basePrice = variant?.priceCents ?? 0
  const effectivePrice =
    subscribe && canSubscribe ? Math.round(basePrice * (1 - subDiscount / 100)) : basePrice
  const pointsPerDollar = config.data?.loyalty.pointsPerDollar ?? 1
  const pointsEarned = Math.floor((effectivePrice / 100) * pointsPerDollar)

  return (
    <Container className="py-10">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="lg:sticky lg:top-28">
          <div className="photo-tile aspect-square overflow-hidden rounded-lg border border-primary/20">
            {product.images[activeImage] ? (
              <img
                src={product.images[activeImage]}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-lg text-[#9b7c3f]">
                Aroma Sense
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'photo-tile h-20 w-20 shrink-0 overflow-hidden rounded-md border transition',
                    i === activeImage ? 'border-primary' : 'border-border hover:border-primary/50',
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.productType}</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{product.title}</h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-semibold">{formatMoney(effectivePrice)}</span>
            {subscribe && canSubscribe ? (
              <span className="text-base text-muted-foreground line-through">{formatMoney(basePrice)}</span>
            ) : (
              onSale && (
                <span className="text-base text-muted-foreground line-through">
                  {formatMoney(variant!.compareAtCents)}
                </span>
              )
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Earn {pointsEarned} reward point{pointsEarned === 1 ? '' : 's'} with this order
          </p>
          {!soldOut && product.stock <= 5 && (
            <p className="mt-1.5 text-xs font-semibold text-accent">
              Only {product.stock} left in stock
            </p>
          )}

          {product.variants.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Option</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-sm transition',
                      v.id === variantId
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-secondary',
                    )}
                  >
                    {v.title ?? 'Default'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canSubscribe && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setSubscribe(false)}
                className={cn(
                  'rounded-xl border p-3 text-left text-sm transition',
                  !subscribe ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary',
                )}
              >
                <span className="font-semibold">One-time purchase</span>
                <span className="mt-0.5 block text-muted-foreground">{formatMoney(basePrice)}</span>
              </button>
              <button
                onClick={() => setSubscribe(true)}
                className={cn(
                  'rounded-xl border p-3 text-left text-sm transition',
                  subscribe ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary',
                )}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <RefreshCw className="h-3.5 w-3.5" /> Subscribe &amp; Save {subDiscount}%
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  {formatMoney(Math.round(basePrice * (1 - subDiscount / 100)))} / month · cancel anytime
                </span>
              </button>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1"
              disabled={soldOut || !variant}
              onClick={() => {
                if (!variant) return
                add(product, variant, 1, subscribe && canSubscribe)
                setAdded(true)
                openCart()
                setTimeout(() => setAdded(false), 2000)
              }}
            >
              {soldOut ? 'Sold out' : added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : subscribe && canSubscribe ? (
                <>
                  <Sparkles className="h-4 w-4" /> Subscribe · {formatMoney(effectivePrice)}/mo
                </>
              ) : (
                `Add to cart · ${formatMoney(effectivePrice)}`
              )}
            </Button>
            <WishlistButton handle={product.handle} variant="inline" />
          </div>

          <TrustBadges compact className="mt-6 border-t border-border pt-6" />

          {product.bodyHtml ? (
            <div
              className="prose-cms mt-8 border-t border-border pt-8 text-sm"
              dangerouslySetInnerHTML={{ __html: product.bodyHtml }}
            />
          ) : (
            <p className="mt-8 border-t border-border pt-8 text-sm text-muted-foreground">
              {product.description}
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-xl font-semibold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.handle} product={p} />
            ))}
          </div>
        </div>
      )}
    </Container>
  )
}
