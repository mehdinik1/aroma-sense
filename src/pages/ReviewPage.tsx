import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Container } from '@/components/site/Container'
import { Loading } from '@/components/site/PageHero'
import { StarInput } from '@/components/shop/Stars'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/field'
import { api, ApiError } from '@/lib/api'
import { useAsync } from '@/lib/store'

type Item = { handle: string; title: string; image: string | null; reviewed: boolean }

function ReviewForm({ item, reference, token, suggestedName }: { item: Item; reference: string; token: string; suggestedName: string }) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [name, setName] = useState(suggestedName)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>(item.reviewed ? 'done' : 'idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return setError('Please choose a star rating.')
    setState('sending')
    setError(null)
    try {
      await api.submitReview(reference, token, { handle: item.handle, rating, title: title || undefined, body, name })
      setState('done')
    } catch (err) {
      setState('idle')
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        {item.image && <img src={item.image} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />}
        <h2 className="font-display text-lg">{item.title}</h2>
      </div>
      {state === 'done' ? (
        <p role="status" className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {item.reviewed ? 'You have already reviewed this product. Thank you!' : 'Thank you! Your review will appear on the site after a quick check.'}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label>Your rating</Label>
            <StarInput value={rating} onChange={setRating} label={`Rating for ${item.title}`} />
          </div>
          <div>
            <Label htmlFor={`t-${item.handle}`}>Headline (optional)</Label>
            <Input id={`t-${item.handle}`} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`b-${item.handle}`}>Your review</Label>
            <Textarea id={`b-${item.handle}`} required minLength={10} maxLength={2000} rows={5} placeholder="What did you like or dislike? How has it worked for you?" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`n-${item.handle}`}>Name shown with your review</Label>
            <Input id={`n-${item.handle}`} required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Your first name and last initial is plenty. We never show your email.</p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Submit review'}
          </Button>
        </form>
      )}
    </section>
  )
}

export function ReviewPage() {
  const [params] = useSearchParams()
  const ref = params.get('ref') || ''
  const token = params.get('t') || ''
  const { data, loading, error } = useAsync(() => api.reviewOrder(ref, token), [ref, token])

  return (
    <Container className="max-w-2xl py-14">
      <h1 className="font-display text-3xl">Share your review</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Thanks for shopping with Aroma Sense. Honest reviews help other shoppers, and reviews are checked before they appear.
      </p>
      <div className="mt-8 space-y-6">
        {loading ? (
          <Loading />
        ) : error || !data ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            This review link is not valid or has expired. Please use the link in your email, or{' '}
            <Link to="/contact" className="font-semibold text-primary hover:underline">
              contact us
            </Link>
            .
          </div>
        ) : (
          data.items.map((item) => <ReviewForm key={item.handle} item={item} reference={data.reference} token={token} suggestedName={data.suggestedName} />)
        )}
      </div>
    </Container>
  )
}
