import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { buyAgainItems } from '@/lib/reorder'
import { formatDate, formatMoney } from '@/lib/utils'
import type { AccountOrder } from '@/lib/types'

export function AccountOrders() {
  const { data, loading, error } = useAsync(() => api.account.orders(), [])
  const { add } = useCart()
  const navigate = useNavigate()
  const [reorderingRef, setReorderingRef] = useState<string | null>(null)

  async function buyAgain(o: AccountOrder) {
    setReorderingRef(o.reference)
    const result = await buyAgainItems(o.items, add)
    setReorderingRef(null)
    if (result.added > 0) navigate('/cart')
    else alert('None of these items are available to reorder right now.')
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Order history</h1>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : !data || data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">You have no orders yet.</p>
          <Link
            to="/shop"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((o) => (
            <div
              key={o.reference}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <Link to={`/account/orders/${o.reference}`} className="flex flex-1 items-center gap-4 min-w-0">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((it) => (
                    <div key={it.variantId} className="photo-tile h-12 w-12 overflow-hidden rounded-md border-2 border-card">
                      {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{o.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                    {o.isSubscription && ' · Subscription'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatMoney(o.totalCents)}</p>
                  <p className="text-xs capitalize text-muted-foreground">{o.status}</p>
                </div>
              </Link>
              {!o.isSubscription && (
                <button
                  onClick={() => buyAgain(o)}
                  disabled={reorderingRef === o.reference}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {reorderingRef === o.reference ? 'Adding…' : 'Buy again'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
