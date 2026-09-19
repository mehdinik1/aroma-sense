import { db } from './db.ts'
import { sendAbandonedCartEmail, sendReviewRequestEmail } from './email.ts'
import { canSendMarketing, reviewToken } from './marketing.ts'
import { env } from './env.ts'
import { isSuppressed } from './suppression.ts'

type Due = { id: number; reminder_email: string; customer_name: string | null; checkout_url: string; created_at: string }

/**
 * Runs on a schedule (see wrangler.toml [triggers]). Sends ONE reminder per unpaid checkout, only to
 * shoppers who ticked the opt-in box on the cart page, between 1 and 20 hours after they started
 * (the Stripe checkout link we email stays valid for 24 hours).
 */
export async function sendDueCartReminders(limit = 25) {
  if (!canSendMarketing()) return { sent: 0, skipped: 0, blocked: 'MAILING_ADDRESS is not configured' }

  const { results } = await db
    .prepare(
      `SELECT id, reminder_email, customer_name, checkout_url, created_at FROM orders
        WHERE status = 'pending' AND recovery_status IS NULL
          AND reminder_email IS NOT NULL AND reminder_consent_at IS NOT NULL AND checkout_url IS NOT NULL
          AND created_at <= datetime('now', '-1 hour') AND created_at >= datetime('now', '-20 hours')
        ORDER BY id LIMIT ?`,
    )
    .bind(limit)
    .all<Due>()

  let sent = 0
  let skipped = 0
  const skip = async (id: number, why: string) => {
    await db.prepare('UPDATE orders SET recovery_status = ? WHERE id = ?').bind(`skipped: ${why}`, id).run()
    skipped++
  }

  for (const o of results) {
    const email = o.reminder_email.trim().toLowerCase()
    if (await isSuppressed(email)) { await skip(o.id, 'unsubscribed'); continue }

    const bought = await db
      .prepare("SELECT 1 FROM orders WHERE email = ? AND status IN ('paid','fulfilled') AND created_at >= ?")
      .bind(email, o.created_at)
      .first()
    if (bought) { await skip(o.id, 'bought anyway'); continue }

    // one reminder per address per week, so nobody can be used to spam a third party
    const recent = await db
      .prepare("SELECT 1 FROM orders WHERE lower(reminder_email) = ? AND recovery_status = 'sent' AND recovery_sent_at > datetime('now', '-7 days')")
      .bind(email)
      .first()
    if (recent) { await skip(o.id, 'reminded recently'); continue }

    const { results: items } = await db
      .prepare('SELECT title, variant_title, price_cents, quantity, image FROM order_items WHERE order_id = ?')
      .bind(o.id)
      .all<{ title: string; variant_title: string | null; price_cents: number; quantity: number; image: string | null }>()
    if (!items.length) { await skip(o.id, 'empty'); continue }

    const ok = await sendAbandonedCartEmail({ email, name: o.customer_name, items, recoveryUrl: o.checkout_url })
    if (ok) {
      await db.prepare("UPDATE orders SET recovery_status = 'sent', recovery_sent_at = datetime('now') WHERE id = ?").bind(o.id).run()
      sent++
    } // on a send failure the row stays eligible and is retried on the next run
  }
  return { sent, skipped }
}

/**
 * Asks buyers for a review 14 days after we marked their order shipped (skips anyone unsubscribed).
 * The link carries a private token, so only someone who received it can review that order.
 */
export async function sendDueReviewRequests(limit = 25) {
  if (!canSendMarketing()) return { sent: 0, skipped: 0, blocked: 'MAILING_ADDRESS is not configured' }
  const { results } = await db
    .prepare(
      `SELECT id, reference, email, customer_name FROM orders
        WHERE status = 'fulfilled' AND email IS NOT NULL AND review_request_status IS NULL
          AND fulfilled_at IS NOT NULL
          AND fulfilled_at <= datetime('now', '-14 days') AND fulfilled_at >= datetime('now', '-90 days')
        ORDER BY id LIMIT ?`,
    )
    .bind(limit)
    .all<{ id: number; reference: string; email: string; customer_name: string | null }>()

  let sent = 0
  let skipped = 0
  for (const o of results) {
    const email = o.email.trim().toLowerCase()
    if (await isSuppressed(email)) {
      await db.prepare("UPDATE orders SET review_request_status = 'skipped: unsubscribed' WHERE id = ?").bind(o.id).run()
      skipped++
      continue
    }
    const { results: items } = await db
      .prepare('SELECT title, variant_title, price_cents, quantity, image FROM order_items WHERE order_id = ?')
      .bind(o.id)
      .all<{ title: string; variant_title: string | null; price_cents: number; quantity: number; image: string | null }>()
    if (!items.length) continue
    const reviewUrl = `${env.appUrl}/review?ref=${encodeURIComponent(o.reference)}&t=${await reviewToken(o.reference)}`
    if (await sendReviewRequestEmail({ email, name: o.customer_name, reviewUrl, items })) {
      await db.prepare("UPDATE orders SET review_request_status = 'sent', review_request_sent_at = datetime('now') WHERE id = ?").bind(o.id).run()
      sent++
    }
  }
  return { sent, skipped }
}
