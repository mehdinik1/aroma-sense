import path from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import { env, paymentsEnabled } from './env.ts'
import { webhookRouter } from './routes/webhook.ts'
import { publicRouter } from './routes/public.ts'
import { checkoutRouter } from './routes/checkout.ts'
import { adminRouter } from './routes/admin.ts'
import { accountRouter } from './routes/account.ts'
import './db.ts'

const app = express()

// Webhook must be mounted before express.json() so it can read the raw body.
app.use('/api', webhookRouter)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use('/api', publicRouter)
app.use('/api', checkoutRouter)
app.use('/api/account', accountRouter)
app.use('/api/admin', adminRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, payments: paymentsEnabled() })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// In production a single process serves the built frontend too — `npm run build` then
// `npm start`, no separate static host needed. In dev, Vite serves the frontend on its own
// port and proxies /api here, so this block is skipped.
if (env.isProd) {
  const distDir = path.resolve(import.meta.dirname, '..', 'dist')
  // `redirect: false` — public/products/<handle>/ is a real directory of photos that shares
  // a path with the client route /products/:handle; without this, express.static 301s
  // "/products/as-luxe" to "/products/as-luxe/" instead of falling through to the SPA below.
  app.use(express.static(distDir, { redirect: false }))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(env.apiPort, () => {
  console.log(`[api] http://localhost:${env.apiPort}  (payments ${paymentsEnabled() ? 'ON' : 'OFF'})`)
})
