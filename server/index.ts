import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { env, paymentsEnabled } from './env.ts'
import { ensureSeeded } from './db.ts'
import { jsonBody } from './bodyParser.ts'
import { webhookRouter } from './routes/webhook.ts'
import { publicRouter } from './routes/public.ts'
import { feedsRouter } from './routes/feeds.ts'
import { unsubscribeRouter } from './routes/unsubscribe.ts'
import { checkoutRouter } from './routes/checkout.ts'
import { adminRouter } from './routes/admin.ts'
import { accountRouter } from './routes/account.ts'

export const app = express()

// Pages (frontend) and this Worker (backend) are always different origins — see
// server/env.ts. `credentials: true` is required for the cross-site cookies auth uses.
app.use(cors({ origin: env.corsOrigin, credentials: true }))

// Runs once per isolate (memoized in ensureSeeded) — admin user / product overrides /
// welcome discount code. Cheap no-op on every request after the first.
app.use(async (_req, res, next) => {
  try {
    await ensureSeeded()
    next()
  } catch (err) {
    console.error('[db] seed failed', err)
    res.status(503).json({ error: 'Service is starting up, try again shortly.' })
  }
})

// Webhook must be mounted before jsonBody() so it can read the raw, unparsed body.
app.use('/api', webhookRouter)

app.use('/api', unsubscribeRouter)
app.use(jsonBody())
app.use(cookieParser())

app.use('/api', publicRouter)
app.use('/api', feedsRouter)
app.use('/api', checkoutRouter)
app.use('/api/account', accountRouter)
app.use('/api/admin', adminRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, payments: paymentsEnabled() })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found — the frontend is served separately by Cloudflare Pages.' })
})
