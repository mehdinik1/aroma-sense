import { useNavigate } from 'react-router-dom'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart'
import { formatMoney } from '@/lib/utils'
import { amountToFreeShippingCents } from '@/lib/shipping'

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, subtotalCents, setQty, remove } = useCart()
  const toFreeShipping = amountToFreeShippingCents(subtotalCents)
  const navigate = useNavigate()

  return (
    <div
      className={`fixed inset-0 z-50 transition ${open ? 'visible' : 'invisible'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-foreground/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Your cart</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button variant="outline" onClick={onClose}>
              Keep shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.map((line) => (
                <div key={line.variantId} className="flex gap-3 border-b border-border py-4 last:border-0">
                  <div className="photo-tile h-20 w-20 shrink-0 overflow-hidden rounded-md">
                    {line.image && (
                      <img src={line.image} alt={line.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{line.title}</p>
                      <button
                        onClick={() => remove(line.variantId)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                    {line.variantTitle && (
                      <p className="text-xs text-muted-foreground">{line.variantTitle}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-border">
                        <button
                          onClick={() => setQty(line.variantId, line.quantity - 1)}
                          className="p-1.5"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => setQty(line.variantId, line.quantity + 1)}
                          className="p-1.5"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatMoney(line.priceCents * line.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-4">
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatMoney(subtotalCents)}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                {toFreeShipping > 0 ? (
                  <>
                    Add <strong className="text-foreground">{formatMoney(toFreeShipping)}</strong> more for free shipping.{' '}
                  </>
                ) : (
                  <span className="font-medium text-primary">You&rsquo;ve unlocked free shipping. </span>
                )}
                Shipping and taxes calculated at checkout.
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  onClose()
                  navigate('/cart')
                }}
              >
                View cart & check out
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
