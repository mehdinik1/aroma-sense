import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/site/Container'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'

export function Unsubscribe() {
  const [params] = useSearchParams()
  const email = params.get('e') || ''
  const token = params.get('t') || ''
  const [status, setStatus] = useState<'idle' | 'working' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setStatus('working')
    setError(null)
    try {
      await api.unsubscribe(email, token)
      setStatus('done')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        {status === 'done' ? (
          <>
            <h1 className="text-2xl font-semibold">You&rsquo;re unsubscribed</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              <strong className="text-foreground">{email}</strong> will no longer receive marketing emails from us. You&rsquo;ll still get
              order confirmations and shipping updates for anything you buy.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
              Back to the store
            </Link>
          </>
        ) : !email || !token ? (
          <>
            <h1 className="text-2xl font-semibold">Link not valid</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This unsubscribe link is incomplete. Please use the link from the email, or{' '}
              <Link to="/contact" className="font-semibold text-primary hover:underline">
                contact us
              </Link>{' '}
              and we&rsquo;ll remove you.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Unsubscribe from marketing emails?</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We&rsquo;ll stop sending promotional emails to <strong className="text-foreground">{email}</strong>. Order confirmations and
              shipping updates aren&rsquo;t affected.
            </p>
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-400">
                {error}
              </p>
            )}
            <Button className="mt-6" onClick={confirm} disabled={status === 'working'}>
              {status === 'working' ? 'One moment…' : 'Yes, unsubscribe me'}
            </Button>
          </>
        )}
      </div>
    </Container>
  )
}
