import { useMemo, useState } from 'react'
import { PageHero, Loading, ErrorState } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { ProductCard } from '@/components/shop/ProductCard'
import { useAsync, loadProducts } from '@/lib/store'
import { cn } from '@/lib/utils'

type Sort = 'featured' | 'price-asc' | 'price-desc'

export function Shop() {
  const { data, loading, error } = useAsync(loadProducts, [])
  const [type, setType] = useState<string>('All')
  const [sort, setSort] = useState<Sort>('featured')

  const types = useMemo(() => {
    const set = new Set((data ?? []).map((p) => p.productType))
    return ['All', ...[...set].sort()]
  }, [data])

  const products = useMemo(() => {
    let list = [...(data ?? [])]
    if (type !== 'All') list = list.filter((p) => p.productType === type)
    if (sort === 'price-asc') list.sort((a, b) => a.priceFromCents - b.priceFromCents)
    else if (sort === 'price-desc') list.sort((a, b) => b.priceFromCents - a.priceFromCents)
    else list.sort((a, b) => Number(b.featured) - Number(a.featured))
    return list
  }, [data, type, sort])

  return (
    <>
      <PageHero
        eyebrow="Shop"
        title="All products"
        description="Vitamin C aromatherapy shower heads, cartridges, starter kits and spare parts."
      />
      <Container className="py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm transition',
                  type === t
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-secondary',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-full border border-border bg-background px-3 text-sm"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.handle} product={p} />
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{products.length} products</p>
          </>
        )}
      </Container>
    </>
  )
}
