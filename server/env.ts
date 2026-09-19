// No dotenv here — `wrangler dev` loads `.dev.vars` into process.env automatically, and a
// deployed Worker gets [vars] from wrangler.toml + `wrangler secret put` the same way, via
// the nodejs_compat process.env shim.

export const env = {
  // Cloudflare Workers pick their own public port; this only matters for the internal HTTP
  // server httpServerHandler bridges to (see server/worker.ts) — any free port is fine.
  apiPort: Number(process.env.PORT || 8787),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  // Pages (frontend) and this Worker (backend) are always different origins in this
  // architecture, even in local `wrangler dev` — cookies are cross-site by construction, so
  // callers should always use sameSite:'none' + secure:true (see server/auth.ts /
  // server/customerAuth.ts). Modern browsers treat http://localhost as a secure context, so
  // Secure cookies still work there during local dev.
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@aromasense.local').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Aroma Sense <orders@vitamincshower.com>',
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || 'admin@vitamincshower.com',
  supportEmail: process.env.SUPPORT_EMAIL || 'hello@vitamincshower.com',
  apiUrl: process.env.API_URL || 'https://api.vitamincshower.com',
  businessName: process.env.BUSINESS_NAME || 'Aroma Sense',
  mailingAddress: process.env.MAILING_ADDRESS || '',
  isProd: process.env.NODE_ENV === 'production',
}

// standard (sk_) and restricted (rk_) Stripe secret keys both work
export const paymentsEnabled = () => /^(sk|rk)_/.test(env.stripeSecretKey)
