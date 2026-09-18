import { env } from './env.ts'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

// Never throws — an email failure must not break checkout fulfilment or form submission.
async function send(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  if (!env.resendApiKey) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.emailFrom,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })
    if (!res.ok) console.error('[email] send failed', res.status, await res.text())
  } catch (err) {
    console.error('[email] send error', err)
  }
}

export type OrderEmailData = {
  reference: string
  email: string | null
  name: string | null
  shippingAddress: string | null
  totalCents: number
  shippingCents: number
  pointsEarned: number
  items: { title: string; variant_title: string | null; price_cents: number; quantity: number }[]
}

function itemsTable(o: OrderEmailData) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.title)}${i.variant_title ? ` — ${esc(i.variant_title)}` : ''} × ${i.quantity}</td>` +
        `<td style="padding:6px 0;text-align:right">${money(i.price_cents * i.quantity)}</td></tr>`,
    )
    .join('')
  return (
    `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}` +
    `<tr><td style="padding:6px 0;color:#666">Shipping</td><td style="text-align:right;color:#666">${money(o.shippingCents)}</td></tr>` +
    `<tr><td style="padding:10px 0;border-top:1px solid #ddd"><strong>Total</strong></td>` +
    `<td style="border-top:1px solid #ddd;text-align:right"><strong>${money(o.totalCents)}</strong></td></tr></table>`
  )
}

const wrap = (inner: string) =>
  `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#222">${inner}</div>`

export async function sendOrderEmails(o: OrderEmailData) {
  if (o.email) {
    await send({
      to: o.email,
      replyTo: env.adminNotifyEmail,
      subject: `Your Aroma Sense order ${o.reference}`,
      html: wrap(
        `<h2 style="margin:0 0 12px">Thank you${o.name ? `, ${esc(o.name)}` : ''}!</h2>` +
          `<p>We've received your order <strong>${esc(o.reference)}</strong> and will email you again when it ships.</p>` +
          itemsTable(o) +
          (o.shippingAddress
            ? `<p style="margin-top:20px"><strong>Shipping to</strong><br>${esc(o.shippingAddress).replace(/\n/g, '<br>')}</p>`
            : '') +
          (o.pointsEarned > 0 ? `<p>You earned <strong>${o.pointsEarned}</strong> loyalty points with this order.</p>` : '') +
          `<p style="color:#666;font-size:13px">Questions? Just reply to this email.</p>`,
      ),
    })
  }
  await send({
    to: env.adminNotifyEmail,
    subject: `New order ${o.reference} — ${money(o.totalCents)}`,
    html: wrap(
      `<h2 style="margin:0 0 12px">New paid order</h2>` +
        `<p><strong>${esc(o.reference)}</strong><br>${esc(o.name ?? '')} ${o.email ? `&lt;${esc(o.email)}&gt;` : ''}</p>` +
        itemsTable(o) +
        (o.shippingAddress ? `<p><strong>Ship to</strong><br>${esc(o.shippingAddress).replace(/\n/g, '<br>')}</p>` : ''),
    ),
  })
}

export async function sendContactAlert(c: { name: string; email: string; message: string }) {
  await send({
    to: env.adminNotifyEmail,
    replyTo: c.email,
    subject: `Contact form: ${c.name}`,
    html: wrap(
      `<h2 style="margin:0 0 12px">New contact message</h2>` +
        `<p><strong>${esc(c.name)}</strong> &lt;${esc(c.email)}&gt;</p>` +
        `<p style="white-space:pre-wrap">${esc(c.message)}</p>`,
    ),
  })
}
