import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from './env.ts'

const COOKIE = 'as_admin'

export function issueSession(res: Response, email: string) {
  const token = jwt.sign({ email }, env.jwtSecret, { expiresIn: '7d' })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE)
}

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
