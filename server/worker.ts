// Cloudflare Workers entry point (see wrangler.toml `main`). Bridges Workers' fetch events
// to the Express app via Cloudflare's Node-compat HTTP server adapter — the Express app
// itself (server/index.ts) is unchanged from a normal Node server's perspective.
import { httpServerHandler } from 'cloudflare:node'
import { app } from './index.ts'
import { env } from './env.ts'
import { sendDueCartReminders } from './reminders.ts'

app.listen(env.apiPort)

const http = httpServerHandler({ port: env.apiPort })

export default {
  ...http,
  // cron trigger (wrangler.toml [triggers]): abandoned-cart reminders
  async scheduled(_event: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(
      sendDueCartReminders()
        .then((r) => console.log('[cron] cart reminders', JSON.stringify(r)))
        .catch((err) => console.error('[cron] cart reminders failed', err)),
    )
  },
}
