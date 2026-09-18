import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { db } from './db.ts'
import { env } from './env.ts'

const COOKIE = 'as_customer'
// Pages (frontend) and this Worker (backend) are always different origins — see
// server/env.ts's corsOrigin note. Modern browsers treat http://localhost as a secure
// context, so this works during local `wrangler dev` too.
const COOKIE_OPTS = { httpOnly: true as const, sameSite: 'none' as const, secure: true }

export type CustomerRow = {
  id: number
  email: string
  password_hash: string
  name: string | null
  points: number
  stripe_customer_id: string | null
  created_at: string
}

export function issueCustomerSession(res: Response, id: number) {
  const token = jwt.sign({ cid: id }, env.jwtSecret, { expiresIn: '30d' })
  res.cookie(COOKIE, token, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 * 1000 })
}

export function clearCustomerSession(res: Response) {
  res.clearCookie(COOKIE, COOKIE_OPTS)
}

export async function currentCustomer(req: Request): Promise<CustomerRow | null> {
  const token = req.cookies?.[COOKIE]
  if (!token) return null
  try {
    const { cid } = jwt.verify(token, env.jwtSecret) as { cid: number }
    const row = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(cid).first<CustomerRow>()
    return row ?? null
  } catch {
    return null
  }
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const customer = await currentCustomer(req)
  if (!customer) {
    res.status(401).json({ error: 'Please sign in.', code: 'unauthenticated' })
    return
  }
  ;(req as Request & { customer: CustomerRow }).customer = customer
  next()
}

export function publicCustomer(c: CustomerRow) {
  return { id: c.id, email: c.email, name: c.name, points: c.points }
}
