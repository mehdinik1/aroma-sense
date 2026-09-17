import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero, Loading, ErrorState } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 12

export function BlogIndex() {
  const { data, loading, error } = useAsync(() => api.blog(), [])
  const [page, setPage] = useState(1)

  const articles = data ?? []
  const shown = articles.slice(0, page * PAGE_SIZE)

  return (
    <>
      <PageHero
        eyebrow="Journal"
        title="The Aroma Sense blog"
        description="Water quality, essential oils, showering habits and small upgrades for a better bathroom."
      />
      <Container className="py-12">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((a) => (
                <Link
                  key={a.handle}
                  to={`/blog/${a.handle}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {a.image && (
                    <div className="aspect-[3/2] overflow-hidden bg-secondary">
                      <img
                        src={a.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    {a.publishedAt && (
                      <span className="text-xs text-muted-foreground">{formatDate(a.publishedAt)}</span>
                    )}
                    <h2 className="mt-1 text-base font-semibold leading-snug group-hover:text-primary">
                      {a.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
            {shown.length < articles.length && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold hover:bg-secondary"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  )
}
