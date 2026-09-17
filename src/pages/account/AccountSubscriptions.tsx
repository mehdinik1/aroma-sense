import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/lib/store'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/utils'

export function AccountSubscriptions() {
  const { data, loading, error } = useAsync(() => api.account.subscriptions(), [])

  async function openPortal() {
    try {
      const { url } = await api.account.billingPortal()
      window.location.href = url
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not open billing portal.')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Subscriptions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Subscribe &amp; Save on vitamin C cartridges and filters — 15% off, delivered monthly, cancel anytime.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : !data || data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">You have no active subscriptions.</p>
          <Link
            to="/collections/vitamin-c-cartridges"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Browse cartridges
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{s.title}</p>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                  {s.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatMoney(s.unitPriceCents)} / {s.interval} · qty {s.quantity}
                {s.currentPeriodEnd && ` · next delivery ${formatDate(s.currentPeriodEnd)}`}
              </p>
            </div>
          ))}
          <Button variant="outline" onClick={openPortal} className="mt-2">
            Manage subscriptions & billing
          </Button>
        </div>
      )}
    </div>
  )
}
