import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { PageHero, Loading, ErrorState } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { Input } from '@/components/ui/field'
import { ProductCard } from '@/components/shop/ProductCard'
import { useAsync, loadProducts } from '@/lib/store'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const { data, loading, error } = useAsync(loadProducts, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term || !data) return []
    const words = term.split(/\s+/)
    return data
      .map((p) => {
        const hay = `${p.title} ${p.productType} ${p.tags.join(' ')} ${p.description}`.toLowerCase()
        const score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0)
        return { p, score }
      })
      .filter((x) => x.score === words.length)
      .sort((a, b) => Number(b.p.featured) - Number(a.p.featured))
      .map((x) => x.p)
  }, [q, data])

  return (
    <>
      <PageHero eyebrow="Search" title={q ? `Results for “${q}”` : 'Search'} />
      <Container className="py-10">
        <div className="relative mb-8 max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search products…"
            value={q}
            onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
            className="pl-9"
          />
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} />
        ) : !q.trim() ? (
          <p className="text-sm text-muted-foreground">Type to search the full catalog.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products match “{q}”.{' '}
            <Link to="/shop" className="font-semibold text-primary hover:underline">
              Browse all products
            </Link>
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} product{results.length === 1 ? '' : 's'}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.handle} product={p} />
              ))}
            </div>
          </>
        )}
      </Container>
    </>
  )
}
