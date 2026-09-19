import { Router } from 'express'
import { db } from '../db.ts'
import { verifyUnsubscribeToken } from '../marketing.ts'

// Mounted before the JSON body parser on purpose: mail apps' one-click unsubscribe sends a
// form-style body ("List-Unsubscribe=One-Click"), and everything we need is in the query string.
export const unsubscribeRouter = Router()

unsubscribeRouter.post('/unsubscribe', async (req, res) => {
  const email = String(req.query.e ?? '').trim().toLowerCase()
  const token = String(req.query.t ?? '')
  if (!email || !token || !(await verifyUnsubscribeToken(email, token))) {
    res.status(400).json({ error: 'This unsubscribe link is not valid.' })
    return
  }
  await db.batch([
    db.prepare('INSERT INTO email_suppressions (email) VALUES (?) ON CONFLICT(email) DO NOTHING').bind(email),
    db.prepare('DELETE FROM newsletter_subscribers WHERE email = ?').bind(email),
  ])
  res.json({ ok: true })
})
