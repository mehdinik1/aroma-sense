import { Fragment, useEffect, useMemo, useState } from 'react'
import { useCallbackRef } from './useCallbackRef'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { api, ApiError } from '@/lib/api'
import { invalidateStore } from '@/lib/store'
import { formatDate, formatMoney, cn } from '@/lib/utils'
import { topicLabel } from '@/lib/contactTopics'
import type {
  AdminCustomer,
  AdminCustomerDetail,
  ContactMessage,
  DiscountCode,
  NewsletterSubscriber,
  Order,
  Product,
} from '@/lib/types'

type Tab = 'overview' | 'orders' | 'products' | 'customers' | 'discounts' | 'messages' | 'settings'

export function AdminDashboard() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    api.admin
      .me()
      .then((r) => {
        setEmail(r.email)
        setReady(true)
      })
      .catch(() => navigate('/admin/login', { replace: true }))
  }, [navigate])

  if (!ready) return null

  return (
    <div className="min-h-dvh bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{email}</span>
            <button
              onClick={async () => {
                await api.admin.logout()
                navigate('/admin/login', { replace: true })
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
          {(['overview', 'orders', 'products', 'customers', 'discounts', 'messages', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium capitalize transition',
                tab === t
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === 'overview' && <Overview onJump={setTab} />}
        {tab === 'orders' && <Orders />}
        {tab === 'products' && <Products />}
        {tab === 'customers' && <Customers />}
        {tab === 'discounts' && <Discounts />}
        {tab === 'messages' && <Messages />}
        {tab === 'settings' && <Settings />}
      </div>
    </div>
  )
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Overview({ onJump }: { onJump: (t: Tab) => void }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.admin.stats>> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api.admin.stats().then(setStats, (e: Error) => setErr(e.message))
  }, [])

  if (err) return <p className="text-sm text-red-400">{err}</p>
  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card label="Revenue" value={formatMoney(stats.revenueCents)} hint="Paid + fulfilled orders" />
        <Card label="Orders" value={String(stats.orderCount)} />
        <Card label="Awaiting fulfillment" value={String(stats.pendingCount)} />
        <Card label="Unread messages" value={String(stats.unreadMessages)} />
        <Card label="Newsletter signups" value={String(stats.newsletterSubscribers)} />
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Low stock (≤ 5)</h2>
          <button onClick={() => onJump('products')} className="text-xs text-primary hover:underline">
            Manage products
          </button>
        </div>
        {stats.lowStock.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Everything is well stocked.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {stats.lowStock.map((p) => (
              <li key={p.handle} className="flex justify-between py-2">
                <span>{p.title}</span>
                <span className={cn('font-medium', p.stock === 0 && 'text-red-400')}>{p.stock} left</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const ORDER_STATUSES = ['pending', 'paid', 'fulfilled', 'cancelled'] as const

function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallbackRef(() => api.admin.orders().then(setOrders))
  useEffect(() => {
    load()
  }, [load])

  if (!orders) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (orders.length === 0)
    return <p className="text-sm text-muted-foreground">No orders yet.</p>

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => (
            <Fragment key={o.id}>
              <tr
                onClick={() => setOpen(open === o.id ? null : o.id)}
                className="cursor-pointer hover:bg-secondary/30"
              >
                <td className="px-4 py-3 font-medium">{o.reference}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3">{o.customerName || o.email || '—'}</td>
                <td className="px-4 py-3">{formatMoney(o.totalCents)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
              {open === o.id && (
                <tr className="bg-secondary/20">
                  <td colSpan={5} className="px-4 py-4">
                    <OrderDetail order={o} onChange={load} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-300',
    paid: 'bg-sky-500/15 text-sky-300',
    fulfilled: 'bg-emerald-500/15 text-emerald-300',
    cancelled: 'bg-red-500/15 text-red-300',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', map[status])}>
      {status}
    </span>
  )
}

function OrderDetail({ order, onChange }: { order: Order; onChange: () => void }) {
  const [status, setStatus] = useState(order.status)
  const [tracking, setTracking] = useState(order.trackingNumber ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await api.admin.updateOrder(order.id, { status, trackingNumber: tracking })
    setSaving(false)
    onChange()
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</h3>
        <ul className="mt-2 divide-y divide-border">
          {order.items.map((it) => (
            <li key={it.variantId} className="flex items-center gap-3 py-2">
              {it.image && <img src={it.image} alt="" className="h-10 w-10 rounded object-cover" />}
              <span className="flex-1">
                {it.title}
                {it.variantTitle ? ` — ${it.variantTitle}` : ''}
              </span>
              <span className="text-muted-foreground">×{it.quantity}</span>
              <span className="w-20 text-right">{formatMoney(it.priceCents * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(order.subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span>{formatMoney(order.shippingCents)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.totalCents)}</span>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ship to</h3>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">
            {order.shippingAddress || '—'}
          </p>
          {order.email && <p className="mt-1 text-muted-foreground">{order.email}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Order['status'])}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tracking number
          </label>
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} className="mt-1" />
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

function Products() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.admin.products().then(setProducts)
  }, [])

  const filtered = useMemo(() => {
    const list = products ?? []
    if (!q.trim()) return list
    const s = q.toLowerCase()
    return list.filter((p) => p.title.toLowerCase().includes(s) || p.handle.includes(s))
  }, [products, q])

  if (!products) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div>
      <Input
        placeholder="Search products…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 max-w-xs"
      />
      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Compare-at</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Visible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <ProductRow key={p.handle} product={p} onSaved={(np) => setProducts((cur) => cur!.map((x) => (x.handle === np.handle ? np : x)))} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Price applies to the lowest variant; other variants shift by the same amount. Compare-at only
        shows for single-variant products.
      </p>
    </div>
  )
}

function dollars(cents: number) {
  return cents ? (cents / 100).toFixed(2) : ''
}
function cents(v: string) {
  const n = Math.round(parseFloat(v) * 100)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function ProductRow({ product, onSaved }: { product: Product; onSaved: (p: Product) => void }) {
  const [price, setPrice] = useState(dollars(product.priceFromCents))
  const [compare, setCompare] = useState(dollars(product.compareAtCents))
  const [stock, setStock] = useState(String(product.stock ?? 0))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  async function patch(extra: Parameters<typeof api.admin.updateProduct>[1]) {
    setSaving(true)
    try {
      const updated = await api.admin.updateProduct(product.handle, extra)
      invalidateStore()
      onSaved(updated)
      setDirty(false)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Save failed')
    }
    setSaving(false)
  }

  return (
    <tr className="hover:bg-secondary/20">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          {product.images[0] && (
            <img src={product.images[0]} alt="" className="h-9 w-9 rounded object-cover" />
          )}
          <span className="line-clamp-2 max-w-[240px]">{product.title}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <span className="flex items-center gap-1">
          $
          <input
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setDirty(true)
            }}
            className="w-20 rounded border border-border bg-background px-2 py-1"
          />
        </span>
      </td>
      <td className="px-4 py-2">
        <span className="flex items-center gap-1">
          $
          <input
            value={compare}
            onChange={(e) => {
              setCompare(e.target.value)
              setDirty(true)
            }}
            className="w-20 rounded border border-border bg-background px-2 py-1"
          />
        </span>
      </td>
      <td className="px-4 py-2">
        <input
          value={stock}
          onChange={(e) => {
            setStock(e.target.value)
            setDirty(true)
          }}
          className="w-16 rounded border border-border bg-background px-2 py-1"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          checked={product.featured}
          onChange={(e) => patch({ featured: e.target.checked })}
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={product.visible}
            onChange={(e) => patch({ visible: e.target.checked })}
          />
          {dirty && (
            <button
              onClick={() =>
                patch({
                  priceCents: cents(price),
                  compareAtCents: cents(compare),
                  stock: Math.max(0, parseInt(stock, 10) || 0),
                })
              }
              disabled={saving}
              className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function Messages() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null)
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[] | null>(null)
  const [showSubscribers, setShowSubscribers] = useState(false)

  useEffect(() => {
    api.admin.messages().then(setMessages)
    api.admin.newsletterSubscribers().then(setSubscribers)
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-5">
        <button
          onClick={() => setShowSubscribers((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="text-sm font-semibold">
            Newsletter signups {subscribers ? `(${subscribers.length})` : ''}
          </h2>
          <span className="text-xs text-primary">{showSubscribers ? 'Hide' : 'Show'}</span>
        </button>
        {showSubscribers && (
          <>
            {!subscribers ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
            ) : subscribers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No signups yet.</p>
            ) : (
              <ul className="mt-3 max-h-64 divide-y divide-border overflow-y-auto text-sm">
                {subscribers.map((s) => (
                  <li key={s.email} className="flex justify-between py-2">
                    <span>{s.email}</span>
                    <span className="text-muted-foreground">{formatDate(s.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {!messages ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'rounded-2xl border border-border bg-background p-5',
                !m.handled && 'border-l-4 border-l-primary',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{m.name}</span>{' '}
                  <a href={`mailto:${m.email}`} className="text-sm text-primary hover:underline">
                    {m.email}
                  </a>
                  <span
                    className={cn(
                      'ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      m.topic === 'bulk' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {topicLabel(m.topic)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(m.createdAt)}</span>
                  <button
                    onClick={async () => {
                      const updated = await api.admin.markMessage(m.id, !m.handled)
                      setMessages((cur) => cur!.map((x) => (x.id === m.id ? updated : x)))
                    }}
                    className="rounded-full border border-border px-2.5 py-1 hover:bg-secondary"
                  >
                    {m.handled ? 'Mark unread' : 'Mark handled'}
                  </button>
                </div>
              </div>
              {(m.company || m.quantity || m.orderReference) && (
                <p className="mt-2 text-xs text-foreground">
                  {[m.company && `Organization: ${m.company}`, m.quantity && `Shower heads: ${m.quantity}`, m.orderReference && `Order: ${m.orderReference}`]
                    .filter(Boolean)
                    .join('  ·  ')}
                </p>
              )}
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Customers() {
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallbackRef(() => api.admin.customers().then(setCustomers))
  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const list = customers ?? []
    if (!q.trim()) return list
    const s = q.toLowerCase()
    return list.filter((c) => c.email.toLowerCase().includes(s) || (c.name ?? '').toLowerCase().includes(s))
  }, [customers, q])

  if (!customers) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (customers.length === 0) return <p className="text-sm text-muted-foreground">No customer accounts yet.</p>

  return (
    <div>
      <Input placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 max-w-xs" />
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Total spent</th>
              <th className="px-4 py-3">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <Fragment key={c.id}>
                <tr onClick={() => setOpen(open === c.id ? null : c.id)} className="cursor-pointer hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">{c.orderCount}</td>
                  <td className="px-4 py-3">{formatMoney(c.totalSpentCents)}</td>
                  <td className="px-4 py-3">{c.points}</td>
                </tr>
                {open === c.id && (
                  <tr className="bg-secondary/20">
                    <td colSpan={5} className="px-4 py-4">
                      <CustomerDetail id={c.id} onChange={load} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CustomerDetail({ id, onChange }: { id: number; onChange: () => void }) {
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallbackRef(() => api.admin.customer(id).then(setDetail))
  useEffect(() => {
    load()
  }, [load])

  async function adjust() {
    const n = parseInt(delta, 10)
    if (!Number.isFinite(n) || n === 0 || !reason.trim()) {
      setErr('Enter a non-zero amount and a reason.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await api.admin.adjustPoints(id, n, reason.trim())
      setDelta('')
      setReason('')
      load()
      onChange()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not adjust points.')
    }
    setSaving(false)
  }

  if (!detail) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orders</h3>
        {detail.orders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {detail.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span>{o.reference}</span>
                <span className="text-muted-foreground">{formatDate(o.createdAt)}</span>
                <span className="capitalize text-muted-foreground">{o.status}</span>
                <span className="font-medium">{formatMoney(o.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Addresses</h3>
        {detail.addresses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No saved addresses.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {detail.addresses.map((a, i) => (
              <li key={i}>
                {a.name} — {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
                {a.isDefault ? ' (default)' : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adjust points</h3>
          <p className="mt-1 text-muted-foreground">Current balance: {detail.points} pts</p>
          <div className="mt-2 flex gap-2">
            <Input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="+50 or -50"
              className="w-28"
            />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="flex-1" />
          </div>
          {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
          <Button size="sm" className="mt-2" onClick={adjust} disabled={saving}>
            {saving ? 'Saving…' : 'Apply'}
          </Button>
        </div>
        {detail.pointsLedger.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {detail.pointsLedger.slice(0, 8).map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>{l.reason}</span>
                  <span className={l.delta >= 0 ? 'text-primary' : ''}>{l.delta >= 0 ? `+${l.delta}` : l.delta}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Discounts() {
  const [codes, setCodes] = useState<DiscountCode[] | null>(null)
  const [code, setCode] = useState('')
  const [percentOff, setPercentOff] = useState('10')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallbackRef(() => api.admin.discountCodes().then(setCodes))
  useEffect(() => {
    load()
  }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setSaving(true)
    try {
      await api.admin.createDiscountCode({
        code,
        percentOff: parseInt(percentOff, 10) || 0,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : undefined,
      })
      setCode('')
      setPercentOff('10')
      setMaxRedemptions('')
      load()
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Could not create code.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-border bg-background p-5 sm:grid-cols-4">
        <div>
          <Label>Code</Label>
          <Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
        </div>
        <div>
          <Label>Percent off</Label>
          <Input required type="number" min={1} max={100} value={percentOff} onChange={(e) => setPercentOff(e.target.value)} />
        </div>
        <div>
          <Label>Max uses (optional)</Label>
          <Input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create code'}
          </Button>
        </div>
        {err && <p className="text-sm text-red-400 sm:col-span-4">{err}</p>}
      </form>

      {!codes ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No discount codes yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Off</th>
                <th className="px-4 py-3">Redeemed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((d) => (
                <tr key={d.code}>
                  <td className="px-4 py-3 font-medium">{d.code}</td>
                  <td className="px-4 py-3">{d.percentOff}%</td>
                  <td className="px-4 py-3">
                    {d.redeemedCount}
                    {d.maxRedemptions ? ` / ${d.maxRedemptions}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        d.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {d.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        await api.admin.setDiscountCodeActive(d.code, !d.active)
                        load()
                      }}
                      className="mr-3 text-xs text-primary hover:underline"
                    >
                      {d.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete code ${d.code}?`)) return
                        await api.admin.deleteDiscountCode(d.code)
                        load()
                      }}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Settings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'New passwords do not match.', ok: false })
      return
    }
    setSaving(true)
    try {
      await api.admin.changePassword(currentPassword, newPassword)
      setMsg({ text: 'Password updated.', ok: true })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e2) {
      setMsg({ text: e2 instanceof ApiError ? e2.message : 'Could not update password.', ok: false })
    }
    setSaving(false)
  }

  return (
    <form onSubmit={save} className="max-w-lg rounded-2xl border border-border bg-background p-5">
      <h2 className="text-sm font-semibold">Change admin password</h2>
      <div className="mt-4 space-y-3">
        <div>
          <Label>Current password</Label>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>New password</Label>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>Confirm new password</Label>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-primary' : 'text-red-400'}`}>{msg.text}</p>}
      <Button type="submit" size="sm" className="mt-4" disabled={saving}>
        {saving ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  )
}
