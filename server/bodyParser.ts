import type { NextFunction, Request, Response } from 'express'

// Express's own express.json()/raw() go through `body-parser` -> `raw-body` -> `iconv-lite`,
// which crashes at Worker startup under Cloudflare's current Node compat (`iconv-lite`
// calls a `require('stream')` API workerd doesn't fully shim: "require_streams(...) is not
// a function"). These two tiny replacements read the request stream directly and avoid that
// dependency chain — everything here only ever needs to assume UTF-8 JSON, which is all
// this app's own frontend and Stripe's webhooks ever send. Uint8Array + TextDecoder (Web
// APIs) are used instead of Node's `Buffer` to sidestep @types/node vs
// @cloudflare/workers-types disagreeing on Buffer's exact signature.

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

function readRawBody(req: Request): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    req.on('end', () => resolve(concat(chunks)))
    req.on('error', reject)
  })
}

/** Drop-in replacement for `express.json({ limit })` — parses the body into `req.body`. */
export function jsonBody(limitBytes = 1024 * 1024) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      next()
      return
    }
    try {
      const bytes = await readRawBody(req)
      if (bytes.length > limitBytes) {
        res.status(413).json({ error: 'Request body too large.' })
        return
      }
      req.body = bytes.length ? JSON.parse(new TextDecoder().decode(bytes)) : {}
      next()
    } catch {
      res.status(400).json({ error: 'Invalid JSON body.' })
    }
  }
}

/** Drop-in replacement for `express.raw({ type: 'application/json' })` — for the Stripe
 *  webhook, which needs the exact raw bytes to verify the signature. Stripe's SDK accepts a
 *  Uint8Array payload directly. */
export function rawBody() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await readRawBody(req)
      next()
    } catch {
      res.status(400).send('invalid body')
    }
  }
}
