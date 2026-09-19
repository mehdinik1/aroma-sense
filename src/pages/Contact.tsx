import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, CheckCircle2, Clock, Mail, PackageSearch } from 'lucide-react'
import { PageHero } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/field'
import { api, ApiError } from '@/lib/api'
import { site } from '@/data/site'
import { BULK_QUANTITIES, CONTACT_TOPICS, isTopic, TOPICS_WITH_ORDER_REF, topicLabel } from '@/lib/contactTopics'

const empty = { name: '', email: '', message: '', topic: '', orderReference: '', company: '', quantity: '', website: '' }

const helpLinks = [
  { to: '/pages/shipping-policy', label: 'Shipping policy' },
  { to: '/pages/returns-policy', label: 'Returns policy' },
  { to: '/pages/warranty', label: 'Warranty' },
  { to: '/installation', label: 'Installation guide' },
  { to: '/faq', label: 'FAQ' },
]

const placeholders: Record<string, string> = {
  order: 'What would you like to know about your order?',
  bulk: 'Tell us about your property, timeline, and anything else we should know.',
  product: 'What would you like to know?',
  installation: 'Describe your shower setup and what you would like to install.',
  returns: 'What needs to be returned, replaced or repaired?',
  rewards: 'How can we help with your rewards or account?',
  other: 'How can we help?',
}

export function Contact() {
  const [params] = useSearchParams()
  const initialTopic = params.get('topic')
  const [form, setForm] = useState({ ...empty, topic: isTopic(initialTopic) ? initialTopic : '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [sentTopic, setSentTopic] = useState('')
  const [error, setError] = useState<string | null>(null)

  const topic = CONTACT_TOPICS.find((t) => t.value === form.topic)
  const isBulk = form.topic === 'bulk'
  const showOrderRef = TOPICS_WITH_ORDER_REF.includes(form.topic as never)
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const placeholder = useMemo(() => placeholders[form.topic] ?? 'How can we help?', [form.topic])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      await api.contact({
        name: form.name,
        email: form.email,
        message: form.message,
        topic: form.topic,
        orderReference: showOrderRef ? form.orderReference || undefined : undefined,
        company: isBulk ? form.company : undefined,
        quantity: isBulk ? form.quantity : undefined,
        website: form.website || undefined,
      })
      setSentTopic(form.topic)
      setStatus('sent')
      setForm(empty)
    } catch (err) {
      setStatus('idle')
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="How can we help?"
        description="Order questions, bulk and wholesale enquiries, or help choosing and fitting your shower head. Choose a topic and we will reply within one business day."
      />
      <Container className="py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Mail className="h-4 w-4" /> Email us
              </p>
              <a href={`mailto:${site.email}`} className="mt-2 block font-display text-xl text-foreground hover:text-primary">
                {site.email}
              </a>
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Replies within one business day
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Building2 className="h-4 w-4" /> Hotels, gyms &amp; properties
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Outfitting more than a handful of bathrooms? Choose <strong className="text-foreground">Bulk &amp; wholesale order</strong> for
                volume pricing and a rollout plan.{' '}
                <Link to="/pages/bulk-orders" className="font-semibold text-primary hover:underline">
                  Learn more
                </Link>
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <PackageSearch className="h-4 w-4" /> Quick answers
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {helpLinks.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-muted-foreground hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {status === 'sent' ? (
            <div role="status" className="flex flex-col items-start justify-center rounded-2xl border border-primary/30 bg-secondary/40 p-8">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h2 className="mt-4 font-display text-2xl">Thank you. Your message is on its way.</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                We received your <strong className="text-foreground">{topicLabel(sentTopic).toLowerCase()}</strong> and will reply within one
                business day.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => setStatus('idle')}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 sm:p-8" noValidate={false}>
              <div>
                <Label htmlFor="topic">What can we help with?</Label>
                <Select id="topic" required value={form.topic} onChange={set('topic')}>
                  <option value="" disabled>
                    Select a topic…
                  </option>
                  {CONTACT_TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                {topic && <p className="mt-2 text-xs text-muted-foreground">{topic.hint}</p>}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" required autoComplete="name" value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
                </div>
              </div>

              {isBulk && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="company">Organization</Label>
                    <Input id="company" required autoComplete="organization" placeholder="Hotel, gym, property…" value={form.company} onChange={set('company')} />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Shower heads needed</Label>
                    <Select id="quantity" required value={form.quantity} onChange={set('quantity')}>
                      <option value="" disabled>
                        Select a range…
                      </option>
                      {BULK_QUANTITIES.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {showOrderRef && (
                <div className="mt-4">
                  <Label htmlFor="orderReference">Order reference (optional)</Label>
                  <Input id="orderReference" placeholder="e.g. AS-123456-7890" value={form.orderReference} onChange={set('orderReference')} />
                </div>
              )}

              <div className="mt-4">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" required rows={6} placeholder={placeholder} value={form.message} onChange={set('message')} />
              </div>

              {/* honeypot: hidden from people, tempting to bots */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>

              {error && (
                <p role="alert" className="mt-4 text-sm text-red-400">
                  {error}
                </p>
              )}
              <Button type="submit" className="mt-5" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          )}
        </div>
      </Container>
    </>
  )
}
