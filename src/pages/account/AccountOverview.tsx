import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'
import { useAccount } from '@/lib/account'
import { useWishlist } from '@/lib/wishlist'
import { formatDate, formatMoney } from '@/lib/utils'

export function AccountOverview() {
  const { rewards } = useAccount()
  const { handles } = useWishlist()
  const orders = useAsync(() => api.account.orders(), [])
  const recent = (orders.data ?? []).slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Rewards balance</p>
          <p className="mt-2 text-3xl font-semibold">{rewards?.points ?? 0} pts</p>
          <p className="mt-1 text-sm opacity-90">
            worth {formatMoney(rewards?.valueCents ?? 0)} off your next order
          </p>
          <Link to="/account/rewards" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
            View activity <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orders</p>
          <p className="mt-2 text-3xl font-semibold">{orders.data?.length ?? '—'}</p>
          <Link to="/account/orders" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Order history <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved items</p>
          <p className="mt-2 text-3xl font-semibold">{handles.size}</p>
          <Link to="/account/wishlist" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            View wishlist <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Recent orders</h2>
        {orders.loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recent.map((o) => (
              <li key={o.reference}>
                <Link to={`/account/orders/${o.reference}`} className="flex items-center justify-between py-3 text-sm hover:text-primary">
                  <span>
                    <span className="font-medium">{o.reference}</span>
                    <span className="ml-2 text-muted-foreground">{formatDate(o.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="capitalize text-muted-foreground">{o.status}</span>
                    <span className="font-medium">{formatMoney(o.totalCents)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
