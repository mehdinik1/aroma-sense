import { useParams } from 'react-router-dom'
import { PageHero, Loading, ErrorState } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { ProductCard } from '@/components/shop/ProductCard'
import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'

export function CollectionPage() {
  const { handle = '' } = useParams()
  const { data, loading, error } = useAsync(() => api.collection(handle), [handle])

  return (
    <>
      <PageHero
        eyebrow="Collection"
        title={data?.collection.title ?? 'Collection'}
        description={data?.collection.description || undefined}
      />
      <Container className="py-10">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message="This collection could not be found." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {data!.products.map((p) => (
                <ProductCard key={p.handle} product={p} />
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{data!.products.length} products</p>
          </>
        )}
      </Container>
    </>
  )
}
