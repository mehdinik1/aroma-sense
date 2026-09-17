import { Link } from 'react-router-dom'
import { Container } from '@/components/site/Container'

export function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="font-display text-5xl text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
      >
        Back home
      </Link>
    </Container>
  )
}
