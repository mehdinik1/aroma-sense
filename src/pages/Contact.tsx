import { useState } from 'react'
import { Mail } from 'lucide-react'
import { PageHero } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/field'
import { api, ApiError } from '@/lib/api'
import { site } from '@/data/site'

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      await api.contact(form)
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
    } catch (err) {
      setStatus('idle')
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about a product, an order, or fitting Aroma Sense to your shower? Send us a note and we'll reply within one business day."
      />
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <Mail className="h-4 w-4" /> {site.email}
            </p>
            <p className="mt-4">
              For order help, include your order reference (from your confirmation email) so we can
              look it up quickly.
            </p>
          </div>

          {status === 'sent' ? (
            <div className="rounded-2xl border border-border bg-secondary/40 p-6 text-sm">
              Thanks — your message is on its way. We'll be in touch soon.
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              <Button type="submit" className="mt-4" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          )}
        </div>
      </Container>
    </>
  )
}
