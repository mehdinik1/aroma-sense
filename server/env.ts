import 'dotenv/config'

const isProd = process.env.NODE_ENV === 'production'

export const env = {
  // API_PORT always wins if set. In production, fall back to the host-injected PORT
  // (Railway/Render/Fly...). In dev, PORT is Vite's own port (see vite.config.ts) — never
  // let the API bind to it too, or the two dev servers collide.
  apiPort: Number(process.env.API_PORT || (isProd && process.env.PORT) || 8787),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@aromasense.local').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  isProd,
}

export const paymentsEnabled = () => env.stripeSecretKey.startsWith('sk_')
