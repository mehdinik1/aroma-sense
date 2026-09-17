import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Droplets,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Waves,
  Wind,
} from 'lucide-react'
import { Container } from '@/components/site/Container'
import { PageHero, Loading, ErrorState } from '@/components/site/PageHero'
import { Button } from '@/components/ui/button'
import { useAsync, loadProducts, loadConfig } from '@/lib/store'
import { useCart } from '@/lib/cart'
import { api, ApiError } from '@/lib/api'
import { cn, formatMoney } from '@/lib/utils'
import type { Product, Variant } from '@/lib/types'

type HeadType = 'handheld' | 'wall'

const WALL_HANDLES = new Set([
  'wall-mounted-vitamin-c-shower-head',
  'jet-wall-mounted-vitamin-c-shower-head',
  'as-rainfall',
])

const STEPS = ['Shower head type', 'Choose your head', 'Vitamin C cartridges', 'Add-ons', 'Review']

const featureRow = [
  { icon: Leaf, label: 'Aromatherapy' },
  { icon: Droplets, label: 'Chlorine reduction' },
  { icon: Sparkles, label: 'Vitamin C' },
  { icon: Waves, label: 'Pressure boost' },
  { icon: Wind, label: 'Negative ions' },
  { icon: ShieldCheck, label: 'Antibacterial' },
]

type Selection = Record<number, { product: Product; variant: Variant; quantity: number }>

export function BuildYourKit() {
  const { data: products, loading, error } = useAsync(loadProducts, [])
  const config = useAsync(loadConfig, [])
  const { add } = useCart()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [headType, setHeadType] = useState<HeadType | null>(null)
  const [head, setHead] = useState<Selection>({})
  const [cartridges, setCartridges] = useState<Selection>({})
  const [addons, setAddons] = useState<Selection>({})
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const catalog = products ?? []

  const heads = useMemo(
    () =>
      catalog
        .filter((p) => p.productType === 'Shower Heads')
        .filter((p) => (headType === 'wall' ? WALL_HANDLES.has(p.handle) : !WALL_HANDLES.has(p.handle))),
    [catalog, headType],
  )

  const cartridgeOptions = useMemo(() => {
    const isWall = headType === 'wall'
    return catalog.filter((p) => {
      if (!/cartridge/i.test(p.title)) return false
      const wall = /wall mounted/i.test(p.title)
      return isWall ? wall : !wall
    })
  }, [catalog, headType])

  const addonOptions = useMemo(() => {
    const isRainfall = !!head[Object.keys(head).map(Number)[0]]?.product.handle.includes('rainfall')
    const wanted = catalog
      .filter(
        (p) =>
          p.productType === 'Microfiber filters' ||
          /ceramic bead/i.test(p.title) ||
          (headType === 'handheld' && p.productType === 'Hose & Bracket'),
      )
      // prefer the rainfall filter only for a rainfall head, else the standard one
      .sort((a, b) => {
        const ar = /rainfall/i.test(a.title) ? 1 : 0
        const br = /rainfall/i.test(b.title) ? 1 : 0
        return isRainfall ? br - ar : ar - br
      })
    const seen = new Set<string>()
    return wanted.filter((p) => {
      const key =
        p.productType === 'Microfiber filters' ? 'filter' : p.productType === 'Hose & Bracket' ? 'hose' : p.handle
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [catalog, headType, head])

  const allSelected = { ...head, ...cartridges, ...addons }
  const lineList = Object.values(allSelected)
  const subtotalCents = lineList.reduce((n, l) => n + l.variant.priceCents * l.quantity, 0)

  const cartridgeQty = Object.values(cartridges).reduce((n, l) => n + l.quantity, 0)
  const hasFilter = Object.values(addons).some((l) => l.product.productType === 'Microfiber filters')
  const hasBeads = Object.values(addons).some((l) => /ceramic bead/i.test(l.product.title))
  const kitEligible =
    Object.keys(head).length > 0 && cartridgeQty >= 1 && hasFilter && hasBeads
  const KIT_PCT = 10
  const discountCents = kitEligible ? Math.round(subtotalCents * (KIT_PCT / 100)) : 0
  const totalCents = subtotalCents - discountCents

  if (loading) return <Loading />
  if (error || !products) return <ErrorState message="Could not load products." />

  function toggle(
    setter: React.Dispatch<React.SetStateAction<Selection>>,
    product: Product,
    variant: Variant,
    single = false,
  ) {
    setter((cur) => {
      const next = single ? {} : { ...cur }
      if (cur[variant.id] && !single) {
        delete next[variant.id]
      } else {
        next[variant.id] = { product, variant, quantity: cur[variant.id]?.quantity ?? 1 }
      }
      return next
    })
  }

  function setQty(setter: React.Dispatch<React.SetStateAction<Selection>>, id: number, q: number) {
    setter((cur) => {
      if (q <= 0) {
        const n = { ...cur }
        delete n[id]
        return n
      }
      return { ...cur, [id]: { ...cur[id], quantity: q } }
    })
  }

  const canNext =
    (step === 0 && headType) ||
    (step === 1 && Object.keys(head).length > 0) ||
    step === 2 ||
    step === 3 ||
    step === 4

  async function checkout() {
    setSubmitting(true)
    setCheckoutError(null)
    try {
      const items = lineList.map((l) => ({ variantId: l.variant.id, quantity: l.quantity }))
      const { url } = await api.checkout(items, { kit: true })
      window.location.href = url
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : 'Checkout failed. Please try again.')
      setSubmitting(false)
    }
  }

  function addAllToCart() {
    for (const l of lineList) add(l.product, l.variant, l.quantity)
    navigate('/cart')
  }

  return (
    <>
      <PageHero
        eyebrow="Build your kit"
        title="Design your Aroma Sense shower"
        description="Get the ultimate spa experience with spa-inspired water pressure that leaves you refreshed and your skin nourished. Once you try our vitamin C aromatherapy shower heads, you'll never look at showering the same way again."
      />

      <Container className="py-10">
        {/* progress */}
        <ol className="mb-8 flex flex-wrap gap-x-2 gap-y-2 text-xs font-medium">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <button
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 transition',
                  i === step
                    ? 'bg-primary text-primary-foreground'
                    : i < step
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                    i < step ? 'bg-primary text-primary-foreground' : 'border border-current',
                  )}
                >
                  {i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">›</span>}
            </li>
          ))}
        </ol>

        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs">
          {featureRow.map((f) => (
            <span key={f.label} className="flex items-center gap-1.5 text-muted-foreground">
              <f.icon className="h-3.5 w-3.5 text-primary" /> {f.label}
            </span>
          ))}
        </div>

        <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <Sparkles className="mr-1.5 inline h-4 w-4 text-accent" />
          Add at least <strong>1 cartridge</strong> and <strong>1 microfiber filter + ceramic beads</strong>{' '}
          to your kit and get <strong>10% off your entire order</strong>.
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {/* STEP 0 — type */}
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    { id: 'handheld', title: 'Handheld', body: 'Transforms your shower into a spa — connects to a standard shower hose.' },
                    { id: 'wall', title: 'Wall mounted', body: 'Replaces your existing wall fixture for a fixed rainfall or jet spray.' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setHeadType(opt.id)
                      setHead({})
                      setCartridges({})
                      setAddons({})
                    }}
                    className={cn(
                      'rounded-2xl border p-6 text-left transition',
                      headType === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary',
                    )}
                  >
                    <h3 className="text-lg font-semibold">{opt.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{opt.body}</p>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 1 — head */}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {heads.map((p) => {
                  const v = p.variants[0]
                  const selected = !!head[v.id]
                  return (
                    <div
                      key={p.handle}
                      className={cn(
                        'overflow-hidden rounded-2xl border transition',
                        selected ? 'border-primary ring-1 ring-primary' : 'border-border',
                      )}
                    >
                      <button onClick={() => toggle(setHead, p, v, true)} className="block w-full text-left">
                        <div className="photo-tile aspect-square">
                          {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-medium">{p.title}</p>
                          <p className="mt-1 text-sm font-semibold">{formatMoney(v.priceCents)}</p>
                        </div>
                      </button>
                      {selected && (
                        <QtyBar
                          qty={head[v.id].quantity}
                          onChange={(q) => setQty(setHead, v.id, q)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* STEP 2 — cartridges */}
            {step === 2 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {cartridgeOptions.map((p) => {
                  const v = p.variants[0]
                  const sel = cartridges[v.id]
                  return (
                    <div
                      key={p.handle}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3',
                        sel ? 'border-primary bg-primary/5' : 'border-border',
                      )}
                    >
                      <div className="photo-tile h-14 w-14 shrink-0 overflow-hidden rounded-md">
                        {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.title.replace(/^Aroma Sense (Luxe )?/, '')}</p>
                        <p className="text-xs text-muted-foreground">{formatMoney(v.priceCents)}</p>
                      </div>
                      {sel ? (
                        <div className="flex items-center rounded-full border border-border">
                          <button className="p-1.5" onClick={() => setQty(setCartridges, v.id, sel.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{sel.quantity}</span>
                          <button className="p-1.5" onClick={() => setQty(setCartridges, v.id, sel.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => toggle(setCartridges, p, v)}>
                          Add
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* STEP 3 — add-ons */}
            {step === 3 && (
              <div className="grid gap-3">
                {addonOptions.map((p) => {
                  const v = p.variants[0]
                  const sel = addons[v.id]
                  return (
                    <label
                      key={p.handle}
                      className={cn(
                        'flex cursor-pointer items-center gap-4 rounded-xl border p-4',
                        sel ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={!!sel}
                        onChange={() => toggle(setAddons, p, v)}
                      />
                      <div className="photo-tile h-14 w-14 shrink-0 overflow-hidden rounded-md">
                        {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{formatMoney(v.priceCents)}</p>
                      </div>
                      {sel && (
                        <div className="flex items-center rounded-full border border-border" onClick={(e) => e.preventDefault()}>
                          <button className="p-1.5" onClick={() => setQty(setAddons, v.id, sel.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{sel.quantity}</span>
                          <button className="p-1.5" onClick={() => setQty(setAddons, v.id, sel.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            )}

            {/* STEP 4 — review */}
            {step === 4 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold">Your kit</h3>
                <ul className="mt-3 divide-y divide-border">
                  {lineList.map((l) => (
                    <li key={l.variant.id} className="flex items-center gap-3 py-3">
                      <div className="photo-tile h-12 w-12 overflow-hidden rounded-md">
                        {l.product.images[0] && (
                          <img src={l.product.images[0]} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="flex-1 text-sm">{l.product.title}</span>
                      <span className="text-xs text-muted-foreground">×{l.quantity}</span>
                      <span className="w-20 text-right text-sm font-medium">
                        {formatMoney(l.variant.priceCents * l.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                {lineList.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nothing selected yet — go back and build your kit.
                  </p>
                )}
                {checkoutError && <p className="mt-3 text-sm text-red-400">{checkoutError}</p>}
                {config.data?.paymentsEnabled === false && (
                  <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                    Payments aren't configured on this local build yet. "Add to cart" still works.
                  </p>
                )}
              </div>
            )}

            {/* nav buttons */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step < 4 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addAllToCart} disabled={lineList.length === 0}>
                    Add to cart
                  </Button>
                  <Button
                    onClick={checkout}
                    disabled={lineList.length === 0 || submitting || config.data?.paymentsEnabled === false}
                  >
                    {submitting ? 'Redirecting…' : 'Checkout'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* summary rail */}
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
            <h3 className="text-sm font-semibold">Kit summary</h3>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Items</dt>
                <dd>{lineList.reduce((n, l) => n + l.quantity, 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatMoney(subtotalCents)}</dd>
              </div>
              <div className={cn('flex justify-between', kitEligible ? 'text-primary' : 'text-muted-foreground')}>
                <dt>Bundle discount (10%)</dt>
                <dd>{kitEligible ? `−${formatMoney(discountCents)}` : '—'}</dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(totalCents)}</span>
            </div>
            {!kitEligible && (
              <p className="mt-3 text-xs text-muted-foreground">
                Add a cartridge, a microfiber filter and ceramic beads to unlock 10% off.
              </p>
            )}
          </aside>
        </div>
      </Container>
    </>
  )
}

function QtyBar({ qty, onChange }: { qty: number; onChange: (q: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3 border-t border-border py-2">
      <button className="p-1" onClick={() => onChange(qty - 1)} aria-label="Decrease">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="text-sm">{qty}</span>
      <button className="p-1" onClick={() => onChange(qty + 1)} aria-label="Increase">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
