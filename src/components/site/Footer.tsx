import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { Container } from './Container'
import { Logo } from './Logo'
import { site } from '@/data/site'
import { api, ApiError } from '@/lib/api'
import { track } from '@/lib/analytics'
import { useAsync, loadConfig } from '@/lib/store'

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'currentColor' as const }

const Instagram: ComponentType = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.8c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 3.06a5.02 5.02 0 1 1 0 10.04 5.02 5.02 0 0 1 0-10.04Zm0 1.8a3.22 3.22 0 1 0 0 6.44 3.22 3.22 0 0 0 0-6.44Zm5.23-3.2a1.17 1.17 0 1 1 0 2.35 1.17 1.17 0 0 1 0-2.35Z" />
  </svg>
)
const Facebook: ComponentType = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M13.5 21v-8.2h2.75l.41-3.2H13.5V7.55c0-.93.26-1.56 1.59-1.56h1.7V3.13A22.7 22.7 0 0 0 14.31 3C11.86 3 10.2 4.5 10.2 7.24v2.36H7.44v3.2H10.2V21h3.3Z" />
  </svg>
)
const Youtube: ComponentType = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 3.9 12 3.9 12 3.9s-7.5 0-9.4.5A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.5.5-5.5s0-3.6-.5-5.5ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
  </svg>
)
const Pinterest: ComponentType = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-3.65 19.31c-.09-.79-.17-2 .03-2.86.19-.82 1.2-5.06 1.2-5.06s-.3-.61-.3-1.51c0-1.42.82-2.48 1.85-2.48.87 0 1.29.65 1.29 1.44 0 .88-.56 2.19-.85 3.41-.24 1.02.51 1.85 1.52 1.85 1.83 0 3.23-1.93 3.23-4.71 0-2.46-1.77-4.18-4.3-4.18-2.93 0-4.64 2.19-4.64 4.46 0 .88.34 1.83.76 2.34.08.1.1.19.07.29l-.28 1.15c-.05.19-.15.23-.35.14-1.3-.6-2.11-2.5-2.11-4.02 0-3.28 2.38-6.29 6.87-6.29 3.6 0 6.4 2.57 6.4 6 0 3.58-2.26 6.46-5.4 6.46-1.05 0-2.04-.55-2.38-1.19l-.65 2.47c-.23.9-.86 2.02-1.29 2.71A10 10 0 1 0 12 2Z" />
  </svg>
)

const columns = [
  {
    title: 'Company',
    links: [
      { label: 'Get Started', to: '/build' },
      { label: 'Shop', to: '/shop' },
      { label: 'New Products', to: '/collections/new-products' },
      { label: 'Why Aroma Sense?', to: '/why-aroma-sense' },
      { label: 'The Buzz', to: '/the-buzz' },
      { label: 'Rewards', to: '/rewards' },
      { label: 'Blog', to: '/blog' },
      { label: 'Contact Us', to: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Bulk & Wholesale Orders', to: '/pages/bulk-orders' },
      { label: 'Warranty & Returns', to: '/pages/warranty' },
      { label: 'Shipping Policy', to: '/pages/shipping-policy' },
      { label: 'Installation & Maintenance', to: '/installation' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Privacy Policy', to: '/pages/privacy-policy' },
      { label: 'Terms of Service', to: '/pages/terms-of-service' },
    ],
  },
]

function NewsletterSignup() {
  const { data: config } = useAsync(loadConfig, [])
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ code: string; percentOff: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await api.newsletter(email)
      track('generate_lead', { method: 'newsletter' })
      setResult({ code: r.code, percentOff: r.percentOff })
      setEmail('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign you up. Try again.')
    }
    setBusy(false)
  }

  return (
    <div className="border-b border-primary/20 bg-vignette">
      <Container className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="font-display text-xl text-foreground">
            Get {config?.welcomeDiscountPct ?? 10}% off your first order
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Join the list for shower-care tips and early access to new products.
          </p>
        </div>
        {result ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-medium text-primary">
            <Check className="h-4 w-4" /> Use code <strong>{result.code}</strong> at checkout
          </p>
        ) : (
          <div className="w-full max-w-sm">
            <form onSubmit={submit} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-ring"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-accent disabled:opacity-60"
              >
                {busy ? '…' : 'Sign up'} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        )}
      </Container>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-primary/20 bg-card">
      <NewsletterSignup />
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo showTagline />
          <p className="mt-4 text-sm text-muted-foreground">
            Spa-quality vitamin C aromatherapy showers — filtered water, real essential-oil scent
            and stronger pressure, for healthier hair and skin.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">{site.shippingNote}</p>
          <div className="mt-4 flex gap-2">
            {[
              { Icon: Instagram, href: site.social.instagram, label: 'Instagram' },
              { Icon: Facebook, href: site.social.facebook, label: 'Facebook' },
              { Icon: Pinterest, href: site.social.pinterest, label: 'Pinterest' },
              { Icon: Youtube, href: site.social.youtube, label: 'YouTube' },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {col.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Aroma Sense. All rights reserved.</span>
          <span>{site.currencyNote} · Secure checkout by Stripe</span>
        </Container>
      </div>
    </footer>
  )
}
