import { useParams } from 'react-router-dom'
import { PageHero, Loading, ErrorState } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'

export function CmsPage() {
  const { slug = '' } = useParams()
  const { data, loading, error } = useAsync(() => api.page(slug), [slug])

  if (loading) return <Loading />
  if (error || !data) return <ErrorState message="This page could not be found." />

  return (
    <>
      <PageHero title={data.title} />
      <Container className="py-12">
        <div
          className="prose-cms mx-auto max-w-2xl text-sm"
          dangerouslySetInnerHTML={{ __html: data.bodyHtml }}
        />
      </Container>
    </>
  )
}
