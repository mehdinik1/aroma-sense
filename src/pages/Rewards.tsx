import { Link } from 'react-router-dom'
import { Gift, RefreshCw, Sparkles, Star } from 'lucide-react'
import { PageHero } from '@/components/site/PageHero'
import { Container } from '@/components/site/Container'
import { lifestyle } from '@/data/lifestyle'
import { useAccount } from '@/lib/account'
import { formatMoney } from '@/lib/utils'

const steps = [
  { icon: Star, title: 'Earn 1 point per $1', body: 'Every dollar you spend on a paid order earns a point automatically.' },
  { icon: Gift, title: '100 points = $5 off', body: 'Redeem points in the cart when you’re signed in — no codes, no minimums.' },
  { icon: RefreshCw, title: 'Subscribe & Save 15%', body: 'Put cartridges and filters on a monthly plan and save on every shipment.' },
]

export function Rewards() {
  const { customer, rewards } = useAccount()

  return (
    <>
      <PageHero
        eyebrow="Rewards"
        title="Aroma Sense Rewards"
        description="Because the best part of an Aroma Sense shower is the next one. Earn points on everything you buy and turn them into savings on refills."
        image={lifestyle.morning}
      />
      <Container className="py-12">
        {customer && rewards ? (
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Your balance</p>
              <p className="mt-1 text-3xl font-semibold">{rewards.points} points</p>
              <p className="text-sm opacity-90">worth {formatMoney(rewards.valueCents)} off</p>
            </div>
            <Link
              to="/account/rewards"
              className="inline-flex h-11 items-center rounded-full bg-primary-foreground px-6 text-sm font-semibold text-primary"
            >
              View activity
            </Link>
          </div>
        ) : (
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/50 p-6">
            <p className="text-sm">
              <Sparkles className="mr-1.5 inline h-4 w-4 text-accent" />
              Create a free account to start earning points on every order.
            </p>
            <Link
              to="/account/register"
              className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              Create account
            </Link>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <s.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </>
  )
}
