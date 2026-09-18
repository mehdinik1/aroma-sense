import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from './env.ts'

const COOKIE = 'as_admin'
const COOKIE_OPTS = { httpOnly: true as const, sameSite: 'none' as const, secure: true }

export function issueSession(res: Response, email: string) {
  const token = jwt.sign({ email }, env.jwtSecret, { expiresIn: '7d' })
  res.cookie(COOKIE, token, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, COOKIE_OPTS)
}

// Stays sync (pure JWT decode, no DB) — unlike requireCustomer, admin auth never needs D1.
export function currentAdmin(req: Request): string | null {
  const token = req.cookies?.[COOKIE]
  if (!token) return null
  try {
    return (jwt.verify(token, env.jwtSecret) as { email: string }).email
  } catch {
    return null
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const email = currentAdmin(req)
  if (!email) {
    res.status(401).json({ error: 'Not authenticated', code: 'unauthenticated' })
    return
  }
  ;(req as Request & { adminEmail: string }).adminEmail = email
  next()
}
