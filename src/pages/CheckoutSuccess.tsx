import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Container } from '@/components/site/Container'
import { useCart } from '@/lib/cart'
import { useAccount } from '@/lib/account'

export function CheckoutSuccess() {
  const { clear } = useCart()
  const { customer, refresh } = useAccount()
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const [refreshed, setRefreshed] = useState(false)

  useEffect(() => {
    clear()
  }, [clear])

  // give the webhook a moment, then pull the updated points balance
  useEffect(() => {
    if (!customer) return
    const t = setTimeout(() => {
      refresh().finally(() => setRefreshed(true))
    }, 1500)
    return () => clearTimeout(t)
  }, [customer, refresh])

  return (
    <Container className="py-24 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
      <h1 className="mt-6 text-3xl font-semibold">Thank you for your order</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        Your payment was received and a confirmation is on its way by email.
        {ref && (
          <>
            {' '}
            Your order reference is <span className="font-semibold text-foreground">{ref}</span>.
          </>
        )}
      </p>

      {customer ? (
        <p className="mx-auto mt-4 max-w-md text-sm text-primary">
          {refreshed
            ? 'Your rewards points have been added to your account.'
            : 'Updating your rewards balance…'}{' '}
          <Link to="/account/orders" className="font-semibold underline">
            View order
          </Link>
        </p>
      ) : (
        <p className="mx-auto mt-4 max-w-md rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          <Link to="/account/register" className="font-semibold text-primary underline">
            Create an account
          </Link>{' '}
          with the same email to claim your rewards points and track this order.
        </p>
      )}

      <Link
        to="/shop"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
      >
        Continue shopping
      </Link>
    </Container>
  )
}
