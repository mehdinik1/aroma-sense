import { Link } from 'react-router-dom'
import { useAsync, loadProducts } from '@/lib/store'
import { useWishlist } from '@/lib/wishlist'
import { ProductCard } from '@/components/shop/ProductCard'

export function AccountWishlist() {
  const { data: products, loading } = useAsync(loadProducts, [])
  const { handles, loading: wishlistLoading } = useWishlist()

  const saved = (products ?? []).filter((p) => handles.has(p.handle))

  return (
    <div>
      <h1 className="text-xl font-semibold">Saved items</h1>
      {loading || wishlistLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tap the heart on any product to save it here for later.
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {saved.map((p) => (
            <ProductCard key={p.handle} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
