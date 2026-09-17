import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { db } from './db.ts'
import { env } from './env.ts'

const COOKIE = 'as_customer'

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
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

export function clearCustomerSession(res: Response) {
  res.clearCookie(COOKIE)
}

export function currentCustomer(req: Request): CustomerRow | null {
  const token = req.cookies?.[COOKIE]
  if (!token) return null
  try {
    const { cid } = jwt.verify(token, env.jwtSecret) as { cid: number }
    return (db.prepare('SELECT * FROM customers WHERE id = ?').get(cid) as CustomerRow) ?? null
  } catch {
    return null
  }
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const customer = currentCustomer(req)
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
