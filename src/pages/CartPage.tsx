import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Minus, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { Container } from '@/components/site/Container'
import { PageHero } from '@/components/site/PageHero'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart'
import { useAccount } from '@/lib/account'
import { api, ApiError } from '@/lib/api'
import { loadConfig } from '@/lib/store'
import { itemsValue, lineToItem, saveCheckoutSnapshot, track } from '@/lib/analytics'
import { cn, formatMoney } from '@/lib/utils'
import type { StoreConfig } from '@/lib/types'

export function CartPage() {
  const { lines, setQty, remove, setSubscribe, mixed, allSubscription } = useCart()
  const { customer, rewards, refresh } = useAccount()
  const [params] = useSearchParams()
  const [config, setConfig] = useState<StoreConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [redeem, setRedeem] = useState(0)
  const [codeInput, setCodeInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<{ code: string; percentOff: number } | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeChecking, setCodeChecking] = useState(false)

  useEffect(() => {
    loadConfig().then(setConfig).catch(() => setConfig(null))
  }, [])

  const canceled = params.get('canceled') === '1'
  const subPct = config?.loyalty.subscriptionDiscountPct ?? 15
  const subscribable = new Set(config?.loyalty.subscribableTypes ?? [])

  const priced = useMemo(
    () =>
      lines.map((l) => {
        const unit = l.subscribe ? Math.round(l.priceCents * (1 - subPct / 100)) : l.priceCents
        return { ...l, unit, lineTotal: unit * l.quantity }
      }),
    [lines, subPct],
  )
  const subtotalCents = priced.reduce((n, l) => n + l.lineTotal, 0)

  const redeemStep = config?.loyalty.redeemStep ?? 100
  const redeemValue = config?.loyalty.redeemValueCents ?? 500
  const maxRedeemByBalance = rewards ? Math.floor(rewards.points / redeemStep) * redeemStep : 0
  const maxRedeemByOrder =
    Math.floor(Math.floor(subtotalCents * 0.5) / redeemValue) * redeemStep
  const maxRedeem = Math.min(maxRedeemByBalance, maxRedeemByOrder)
  const codeDiscountCents =
    !allSubscription && appliedCode ? Math.round(subtotalCents * (appliedCode.percentOff / 100)) : 0
  const pointsDiscountCents = allSubscription ? 0 : (redeem / redeemStep) * redeemValue
  const discountCents = codeDiscountCents + pointsDiscountCents
  const total = Math.max(0, subtotalCents - discountCents)

  const pointsToEarn = allSubscription
    ? 0
    : Math.floor(((subtotalCents - discountCents) / 100) * (config?.loyalty.pointsPerDollar ?? 1))

  async function applyCode() {
    if (!codeInput.trim()) return
    setCodeChecking(true)
    setCodeError(null)
    try {
      const r = await api.validateDiscountCode(codeInput.trim())
      if (r.valid && r.code && r.percentOff) {
        setAppliedCode({ code: r.code, percentOff: r.percentOff })
      } else {
        setAppliedCode(null)
        setCodeError(r.message || 'That code is not valid.')
      }
    } catch {
      setAppliedCode(null)
      setCodeError('Could not check that code. Try again.')
    }
    setCodeChecking(false)
  }

  const viewedCart = useRef(false)
  useEffect(() => {
    if (viewedCart.current || !lines.length) return
    viewedCart.current = true
    const items = lines.map(lineToItem)
    track('view_cart', { currency: 'USD', value: itemsValue(items), items })
  }, [lines])

  async function checkout() {
    setError(null)
    setLoading(true)
    try {
      const { url } = await api.checkout(
        lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, subscribe: l.subscribe })),
        { pointsToRedeem: allSubscription ? 0 : redeem, discountCode: appliedCode?.code },
      )
      const items = lines.map(lineToItem)
      track('begin_checkout', { currency: 'USD', value: total / 100, items, ...(appliedCode ? { coupon: appliedCode.code } : {}) })
      saveCheckoutSnapshot({ items, value: total / 100, coupon: appliedCode?.code })
      window.location.href = url
    } catch (err) {
      if (err instanceof ApiError && err.code === 'auth_required') {
        setError('Please sign in to start a subscription.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Checkout failed. Please try again.')
      }
      setLoading(false)
      refresh()
    }
  }

  return (
    <>
      <PageHero title="Your cart" eyebrow="Checkout" />
      <Container className="py-10">
        {canceled && (
          <p className="mb-6 rounded-lg border border-border bg-secondary/60 px-4 py-3 text-sm">
            Checkout was canceled — your cart is still here.
          </p>
        )}

        {lines.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link
              to="/shop"
              className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div>
              {mixed && (
                <p className="mb-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
                  Your cart mixes a subscription with one-time items. Please check out the subscription
                  separately — toggle items below, or remove one group.
                </p>
              )}
              {priced.map((line) => (
                <div key={line.variantId} className="flex gap-4 border-b border-border py-5 first:pt-0">
                  <div className="photo-tile h-24 w-24 shrink-0 overflow-hidden rounded-md">
                    {line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <Link to={`/products/${line.handle}`} className="text-sm font-medium hover:text-primary">
                      {line.title}
                    </Link>
                    {line.variantTitle && (
                      <p className="text-xs text-muted-foreground">{line.variantTitle}</p>
                    )}
                    {(line.subscribe || subscribable.has(line.productType)) && (
                      <label
                        className={cn(
                          'mt-1.5 inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs',
                          line.subscribe ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-[hsl(var(--primary))]"
                          checked={line.subscribe}
                          onChange={(e) => setSubscribe(line.variantId, e.target.checked)}
                        />
                        <RefreshCw className="h-3 w-3" />
                        Subscribe &amp; Save {subPct}%
                      </label>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-border">
                        <button onClick={() => setQty(line.variantId, line.quantity - 1)} className="p-2" aria-label="Decrease">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm">{line.quantity}</span>
                        <button onClick={() => setQty(line.variantId, line.quantity + 1)} className="p-2" aria-label="Increase">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-right text-sm">
                          <span className="font-semibold">{formatMoney(line.lineTotal)}</span>
                          {line.subscribe && (
                            <span className="block text-xs text-muted-foreground line-through">
                              {formatMoney(line.priceCents * line.quantity)}
                            </span>
                          )}
                        </span>
                        <button onClick={() => remove(line.variantId)} aria-label="Remove item">
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">
                {allSubscription ? 'Subscription summary' : 'Order summary'}
              </h2>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotalCents)}</span>
                </div>
                {codeDiscountCents > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Code {appliedCode?.code}</span>
                    <span>−{formatMoney(codeDiscountCents)}</span>
                  </div>
                )}
                {pointsDiscountCents > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Points ({redeem})</span>
                    <span>−{formatMoney(pointsDiscountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">Free (Standard, US)</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-semibold">
                <span>{allSubscription ? 'Per month' : 'Total'}</span>
                <span>{formatMoney(total)}</span>
              </div>

              {/* Discount code */}
              {!allSubscription && (
                <div className="mt-4">
                  {appliedCode ? (
                    <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                      <span>
                        Code <strong>{appliedCode.code}</strong> applied · {appliedCode.percentOff}% off
                      </span>
                      <button
                        onClick={() => {
                          setAppliedCode(null)
                          setCodeInput('')
                        }}
                        className="font-semibold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={codeInput}
                        onChange={(e) => {
                          setCodeInput(e.target.value)
                          setCodeError(null)
                        }}
                        placeholder="Discount code"
                        className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring"
                      />
                      <button
                        onClick={applyCode}
                        disabled={codeChecking || !codeInput.trim()}
                        className="rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                      >
                        {codeChecking ? '…' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {codeError && <p className="mt-1.5 text-xs text-red-400">{codeError}</p>}
                </div>
              )}

              {/* Points redemption */}
              {!allSubscription && (
                <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-sm">
                  {customer ? (
                    maxRedeem > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Use points</span>
                          <span className="text-xs text-muted-foreground">
                            {rewards?.points} available
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={maxRedeem}
                          step={redeemStep}
                          value={redeem}
                          onChange={(e) => setRedeem(Number(e.target.value))}
                          className="mt-2 w-full accent-[hsl(var(--primary))]"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Redeeming {redeem} points for {formatMoney(discountCents)} off
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        You have {rewards?.points ?? 0} points. Earn {redeemStep} to redeem{' '}
                        {formatMoney(redeemValue)} off.
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <Link to="/account/login?next=/cart" className="font-semibold text-primary hover:underline">
                        Sign in
                      </Link>{' '}
                      to earn and redeem Aroma Sense Rewards points.
                    </p>
                  )}
                </div>
              )}

              {pointsToEarn > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> You'll earn {pointsToEarn} points on this order
                </p>
              )}

              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              {config?.paymentsEnabled === false && (
                <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                  Payments aren't configured on this local build yet. Add Stripe test keys to
                  <code className="mx-1">.env</code> to enable checkout.
                </p>
              )}

              <Button
                className="mt-4 w-full"
                onClick={checkout}
                disabled={loading || mixed || config?.paymentsEnabled === false}
              >
                {loading ? 'Redirecting…' : allSubscription ? 'Start subscription' : 'Checkout'}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Secure checkout by Stripe · Apple Pay &amp; Google Pay · USD
              </p>
            </aside>
          </div>
        )}
      </Container>
    </>
  )
}
