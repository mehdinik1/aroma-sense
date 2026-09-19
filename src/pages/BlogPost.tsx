import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PageHero, Loading, ErrorState } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useSeo } from '@/lib/seo'
import { articleSeo, stripHtml } from '@/lib/seoShared'

export function BlogPost() {
  const { handle = '' } = useParams()
  const { data, loading, error } = useAsync(() => api.article(handle), [handle])

  useSeo(
    data
      ? articleSeo({
          handle: data.handle,
          title: data.title,
          description: data.excerpt || stripHtml(data.bodyHtml),
          image: data.image,
          author: data.author,
          publishedAt: data.publishedAt,
        })
      : null,
  )

  if (loading) return <Loading />
  if (error || !data) return <ErrorState message="This article could not be found." />

  return (
    <>
      <PageHero
        eyebrow={data.publishedAt ? formatDate(data.publishedAt) : 'Journal'}
        title={data.title}
      />
      <Container className="py-12">
        <Link
          to="/blog"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All articles
        </Link>
        {data.image && (
          <img
            src={data.image}
            alt=""
            className="mx-auto mb-10 max-h-[420px] w-full max-w-2xl rounded-2xl object-cover"
          />
        )}
        <article
          className="prose-cms mx-auto max-w-2xl"
          dangerouslySetInnerHTML={{ __html: data.bodyHtml }}
        />
      </Container>
    </>
  )
}
