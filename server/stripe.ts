import Stripe from 'stripe'
import { env, paymentsEnabled } from './env.ts'

let client: Stripe | null = null

export function stripe(): Stripe {
  if (!paymentsEnabled()) {
    throw Object.assign(new Error('Payments are not configured on this server yet.'), {
      code: 'payments_disabled',
      status: 503,
    })
  }
  if (!client) {
    // Stripe's default HTTP client uses Node's `http`/`https` modules, which aren't
    // available on Workers — use its fetch-based client instead.
    client = new Stripe(env.stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() })
  }
  return client
}
