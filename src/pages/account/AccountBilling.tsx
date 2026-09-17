import { useEffect, useState } from 'react'
import { CreditCard, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { loadConfig } from '@/lib/store'

export function AccountBilling() {
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfig().then((c) => setPaymentsEnabled(c.paymentsEnabled)).catch(() => setPaymentsEnabled(false))
  }, [])

  async function openPortal() {
    setBusy(true)
    setError(null)
    try {
      const { url } = await api.account.billingPortal()
      window.location.href = url
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the billing portal.')
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Payment &amp; billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Saved cards, invoices, and subscription billing are managed securely through Stripe.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <CreditCard className="h-8 w-8 text-primary" />
        <h2 className="mt-3 text-base font-semibold">Stripe billing portal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your card, download receipts, and pause or cancel subscriptions.
        </p>
        {paymentsEnabled === false ? (
          <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            The billing portal turns on once Stripe keys are added to this store.
          </p>
        ) : (
          <Button className="mt-4" onClick={openPortal} disabled={busy}>
            {busy ? 'Opening…' : (
              <>
                Open billing portal <ExternalLink className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
