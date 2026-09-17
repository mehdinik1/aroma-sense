import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/utils'

export function AccountRewards() {
  const { data, loading } = useAsync(() => api.account.points(), [])

  if (loading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>

  const { balance, valueCents, rules, ledger } = data

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Aroma Sense Rewards</p>
        <p className="mt-2 text-4xl font-semibold">{balance} points</p>
        <p className="mt-1 text-sm opacity-90">= {formatMoney(valueCents)} to spend</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 text-sm">
        <Fact title="Earn" body={`${rules.pointsPerDollar} point${rules.pointsPerDollar > 1 ? 's' : ''} per $1 spent`} />
        <Fact title="Redeem" body={`${rules.redeemStep} points = ${formatMoney(rules.redeemValueCents)} off`} />
        <Fact title="How" body="Apply points at checkout when you're signed in" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Activity</h2>
        {ledger.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No points activity yet. Points appear here after your first order.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {ledger.map((e, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <span>
                  <span className="font-medium">{e.reason}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{formatDate(e.createdAt)}</span>
                </span>
                <span className={e.delta >= 0 ? 'font-medium text-primary' : 'font-medium text-muted-foreground'}>
                  {e.delta >= 0 ? '+' : ''}
                  {e.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Fact({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1">{body}</p>
    </div>
  )
}
