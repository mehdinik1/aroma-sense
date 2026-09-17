import { useEffect, useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { api, ApiError } from '@/lib/api'
import type { Address, AddressInput } from '@/lib/types'

const empty: AddressInput = {
  name: '', line1: '', line2: '', city: '', state: '', postalCode: '', phone: '',
}

export function AccountAddresses() {
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddressInput>(empty)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.account.addresses().then(setAddresses, () => setAddresses([]))
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setAddresses(await api.account.addAddress(form))
      setForm(empty)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save address.')
    }
    setBusy(false)
  }

  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Addresses</h1>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </div>

      {addresses === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
              <div className="flex items-start justify-between">
                <p className="font-medium">{a.name}</p>
                <div className="flex gap-2">
                  {!a.isDefault && (
                    <button
                      title="Make default"
                      onClick={async () => setAddresses(await api.account.updateAddress(a.id, { isDefault: true }))}
                    >
                      <Star className="h-4 w-4 text-muted-foreground hover:text-accent" />
                    </button>
                  )}
                  <button
                    title="Delete"
                    onClick={async () => setAddresses(await api.account.deleteAddress(a.id))}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-muted-foreground">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}
                <br />
                {a.city}, {a.state} {a.postalCode}
                {a.phone ? <><br />{a.phone}</> : null}
              </p>
              {a.isDefault && (
                <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                  Default
                </span>
              )}
            </div>
          ))}
          {addresses.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={add} className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Full name</Label>
            <Input required value={form.name} onChange={set('name')} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address line 1</Label>
            <Input required value={form.line1} onChange={set('line1')} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address line 2</Label>
            <Input value={form.line2} onChange={set('line2')} />
          </div>
          <div>
            <Label>City</Label>
            <Input required value={form.city} onChange={set('city')} />
          </div>
          <div>
            <Label>State</Label>
            <Input required value={form.state} onChange={set('state')} placeholder="TX" />
          </div>
          <div>
            <Label>ZIP code</Label>
            <Input required value={form.postalCode} onChange={set('postalCode')} />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input value={form.phone} onChange={set('phone')} />
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save address'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
