import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/lib/store'
import { api } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { buyAgainItems } from '@/lib/reorder'
import { formatDate, formatMoney } from '@/lib/utils'

export function AccountOrderDetail() {
  const { reference = '' } = useParams()
  const { data, loading, error } = useAsync(() => api.account.order(reference), [reference])
  const { add } = useCart()
  const navigate = useNavigate()
  const [reordering, setReordering] = useState(false)

  async function buyAgain() {
    if (!data) return
    setReordering(true)
    const result = await buyAgainItems(data.items, add)
    setReordering(false)
    if (result.added > 0) navigate('/cart')
    else alert('None of these items are available to reorder right now.')
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error || !data) return <p className="text-sm text-red-400">Order not found.</p>

  return (
    <div>
      <Link to="/account/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All orders
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">{data.reference}</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">{data.status}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {formatDate(data.createdAt)}
        {data.isSubscription && ' · Subscription order'}
      </p>
      {!data.isSubscription && (
        <Button size="sm" variant="outline" className="mt-3" onClick={buyAgain} disabled={reordering}>
          <RefreshCw className="h-3.5 w-3.5" /> {reordering ? 'Adding…' : 'Buy again'}
        </Button>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <ul className="divide-y divide-border">
          {data.items.map((it) => (
            <li key={it.variantId} className="flex items-center gap-3 py-3">
              {it.image && <img src={it.image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
              <div className="flex-1 text-sm">
                <p className="font-medium">{it.title}</p>
                {it.variantTitle && <p className="text-xs text-muted-foreground">{it.variantTitle}</p>}
                <p className="text-xs text-muted-foreground">Qty {it.quantity}</p>
              </div>
              <span className="text-sm font-medium">{formatMoney(it.priceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          <Row label="Subtotal" value={formatMoney(data.subtotalCents)} />
          {data.discountCode && (
            <Row label={`Code ${data.discountCode}`} value="Applied" />
          )}
          {data.discountCents > 0 && (
            <Row
              label={data.pointsRedeemed > 0 ? `Points (−${data.pointsRedeemed})` : 'Discount'}
              value={`−${formatMoney(data.discountCents)}`}
            />
          )}
          <Row label="Shipping" value={data.shippingCents ? formatMoney(data.shippingCents) : 'Free'} />
          <Row label="Total" value={formatMoney(data.totalCents)} strong />
          {data.pointsEarned > 0 && (
            <p className="pt-1 text-xs text-primary">You earned {data.pointsEarned} points on this order.</p>
          )}
        </dl>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping to</h2>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{data.shippingAddress || '—'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracking</h2>
          <p className="mt-2 text-muted-foreground">
            {data.trackingNumber ? data.trackingNumber : 'Not shipped yet — we’ll email you a tracking number.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted-foreground'}>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
