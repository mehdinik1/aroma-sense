// Cloudflare Workers entry point (see wrangler.toml `main`). Bridges Workers' fetch events
// to the Express app via Cloudflare's Node-compat HTTP server adapter — the Express app
// itself (server/index.ts) is unchanged from a normal Node server's perspective.
import { httpServerHandler } from 'cloudflare:node'
import { app } from './index.ts'
import { env } from './env.ts'

app.listen(env.apiPort)

export default httpServerHandler({ port: env.apiPort })
