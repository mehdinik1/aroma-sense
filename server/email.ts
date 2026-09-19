import { env } from './env.ts'
import { topicLabel } from '../src/lib/contactTopics.ts'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>')

// Brand palette (matches the storefront's black + champagne gold theme).
const GOLD = '#c9a44c'
const GOLD_DEEP = '#8a6d1f'
const INK = '#0b0b0b'
const IVORY = '#faf7f0'
const TEXT = '#33302a'
const MUTED = '#8a857a'
const RULE = '#e6dfcf'
const SERIF = "Georgia,'Times New Roman',serif"
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"

// Never throws — an email failure must not break checkout fulfilment or form submission.
async function send(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  if (!env.resendApiKey) return
  const text = opts.html
    .replace(/<(style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|tr|h\d|table)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.emailFrom,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })
    if (!res.ok) console.error('[email] send failed', res.status, await res.text())
  } catch (err) {
    console.error('[email] send error', err)
  }
}

// ---- shared building blocks ------------------------------------------------

function layout(o: { preheader: string; eyebrow: string; title: string; body: string; footerNote?: string }) {
  const link = (href: string, label: string) =>
    `<a href="${esc(href)}" style="color:${GOLD};text-decoration:none">${label}</a>`
  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light only"><title>${esc(o.title)}</title></head>` +
    `<body style="margin:0;padding:0;background:${INK}">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${INK}">${esc(o.preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${INK}" style="background:${INK}"><tr><td align="center" style="padding:32px 12px">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">` +
    // header
    `<tr><td align="center" bgcolor="${INK}" style="padding:8px 0 28px">` +
    `<div style="font-family:${SERIF};font-size:26px;letter-spacing:8px;text-transform:uppercase;color:#f3ecd9">Aroma <span style="color:${GOLD}">Sense</span></div>` +
    `<div style="width:56px;height:1px;background:${GOLD};margin:14px auto 0"></div></td></tr>` +
    // card
    `<tr><td bgcolor="${IVORY}" style="background:${IVORY};border-radius:4px;padding:44px 40px;font-family:${SANS};color:${TEXT};font-size:16px;line-height:1.65">` +
    `<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD_DEEP};font-weight:bold;margin-bottom:12px">${esc(o.eyebrow)}</div>` +
    `<h1 style="margin:0 0 20px;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.25;color:${INK}">${o.title}</h1>` +
    o.body +
    `</td></tr>` +
    // footer
    `<tr><td align="center" style="padding:28px 16px 8px;font-family:${SANS};font-size:12px;line-height:1.7;color:#8f8a7e">` +
    `${link(env.appUrl + '/shop', 'Shop')} &nbsp;&middot;&nbsp; ${link(env.appUrl + '/rewards', 'Rewards')} &nbsp;&middot;&nbsp; ${link(env.appUrl + '/faq', 'FAQ')} &nbsp;&middot;&nbsp; ${link(env.appUrl + '/contact', 'Contact')}` +
    `<br>${o.footerNote ? esc(o.footerNote) + '<br>' : ''}&copy; ${new Date().getUTCFullYear()} Aroma Sense &middot; vitamincshower.com` +
    `</td></tr></table></td></tr></table></body></html>`
  )
}

const p = (html: string) => `<p style="margin:0 0 16px">${html}</p>`

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0"><tr><td bgcolor="${GOLD}" style="background:${GOLD};border-radius:999px">` +
  `<a href="${esc(href)}" style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:14px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${INK};text-decoration:none">${esc(label)}</a></td></tr></table>`

const panel = (inner: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="background:#ffffff;border:1px solid ${RULE};border-radius:4px;padding:18px 22px;font-size:14px;line-height:1.7">${inner}</td></tr></table>`

const label = (t: string) =>
  `<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};font-weight:bold;margin-bottom:4px">${esc(t)}</div>`

const hr = `<div style="height:1px;background:${RULE};margin:26px 0"></div>`

const small = (html: string) => `<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${MUTED}">${html}</p>`

// ---- order emails ----------------------------------------------------------

export type OrderEmailData = {
  reference: string
  email: string | null
  name: string | null
  shippingAddress: string | null
  totalCents: number
  shippingCents: number
  pointsEarned: number
  items: {
    title: string
    variant_title: string | null
    price_cents: number
    quantity: number
    image?: string | null
  }[]
}

function itemsBlock(o: OrderEmailData) {
  const rows = o.items
    .map((i) => {
      const img = i.image
        ? `<img src="${esc(i.image.startsWith('http') ? i.image : env.appUrl + i.image)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:4px;border:1px solid ${RULE}">`
        : ''
      return (
        `<tr><td width="76" valign="top" style="padding:12px 0;border-bottom:1px solid ${RULE}">${img}</td>` +
        `<td valign="top" style="padding:12px 12px;border-bottom:1px solid ${RULE};font-size:14px;line-height:1.5"><strong style="color:${INK}">${esc(i.title)}</strong>` +
        `${i.variant_title ? `<br><span style="color:${MUTED}">${esc(i.variant_title)}</span>` : ''}<br><span style="color:${MUTED}">Qty ${i.quantity}</span></td>` +
        `<td align="right" valign="top" style="padding:12px 0;border-bottom:1px solid ${RULE};font-size:14px;color:${INK};white-space:nowrap">${money(i.price_cents * i.quantity)}</td></tr>`
      )
    })
    .join('')
  const subtotal = o.totalCents - o.shippingCents
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px">${rows}</table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">` +
    `<tr><td style="padding:10px 0 2px;color:${MUTED}">Subtotal (after any discounts)</td><td align="right" style="padding:10px 0 2px">${money(subtotal)}</td></tr>` +
    `<tr><td style="padding:2px 0;color:${MUTED}">Shipping</td><td align="right">${o.shippingCents ? money(o.shippingCents) : 'Free'}</td></tr>` +
    `<tr><td style="padding:12px 0 0;font-family:${SERIF};font-size:18px;color:${INK}">Total</td><td align="right" style="padding:12px 0 0;font-family:${SERIF};font-size:18px;color:${INK}">${money(o.totalCents)}</td></tr></table>`
  )
}

export async function sendOrderEmails(o: OrderEmailData) {
  const firstName = o.name?.split(' ')[0]
  if (o.email) {
    await send({
      to: o.email,
      replyTo: env.supportEmail,
      subject: `Your Aroma Sense order ${o.reference}`,
      html: layout({
        preheader: `Thank you — we've received order ${o.reference}.`,
        eyebrow: 'Order confirmed',
        title: `Thank you${firstName ? ', ' + esc(firstName) : ''}.`,
        body:
          p(`We've received your order and are preparing it with care. You'll get another email as soon as it ships.`) +
          panel(`${label('Order number')}<strong style="font-size:17px;color:${INK};letter-spacing:1px">${esc(o.reference)}</strong>`) +
          itemsBlock(o) +
          hr +
          (o.shippingAddress ? `${label('Shipping to')}<div style="font-size:14px;line-height:1.7">${nl2br(o.shippingAddress)}</div>` : '') +
          (o.pointsEarned > 0
            ? panel(`<span style="color:${GOLD_DEEP};font-weight:bold">&#9733; ${o.pointsEarned} Rewards points earned</span><br><span style="color:${MUTED}">Create an account with this email to redeem them on your next order.</span>`)
            : '') +
          button(env.appUrl + '/shop', 'Continue shopping') +
          small(`Questions about your order? Simply reply to this email and we'll help.`),
      }),
    })
  }
  await send({
    to: env.adminNotifyEmail,
    subject: `New order ${o.reference} — ${money(o.totalCents)}`,
    html: layout({
      preheader: `${money(o.totalCents)} from ${o.name ?? o.email ?? 'a customer'}`,
      eyebrow: 'Store alert',
      title: `New order &mdash; ${money(o.totalCents)}`,
      body:
        panel(
          `${label('Order')}<strong style="color:${INK}">${esc(o.reference)}</strong>` +
            `<div style="height:10px"></div>${label('Customer')}${esc(o.name ?? '—')}${o.email ? `<br><a href="mailto:${esc(o.email)}" style="color:${GOLD_DEEP}">${esc(o.email)}</a>` : ''}`,
        ) +
        itemsBlock(o) +
        hr +
        (o.shippingAddress ? `${label('Ship to')}<div style="font-size:14px;line-height:1.7">${nl2br(o.shippingAddress)}</div>` : '') +
        button(env.appUrl + '/admin', 'Open admin'),
    }),
  })
}

export async function sendContactAlert(c: {
  name: string
  email: string
  message: string
  topic: string
  orderReference: string | null
  company: string | null
  quantity: string | null
}) {
  const label_ = topicLabel(c.topic)
  const detail = (k: string, v: string | null) => (v ? `<div style="height:8px"></div>${label(k)}${esc(v)}` : '')
  await send({
    to: env.adminNotifyEmail,
    replyTo: c.email,
    subject: `[${label_}] ${c.name}${c.company ? ' — ' + c.company : ''}`,
    html: layout({
      preheader: c.message.slice(0, 90),
      eyebrow: c.topic === 'bulk' ? 'Bulk / wholesale lead' : 'Store alert',
      title: c.topic === 'bulk' ? 'New bulk order inquiry' : 'New contact message',
      body:
        panel(
          `${label('Topic')}<strong style="color:${INK}">${esc(label_)}</strong>` +
            `<div style="height:8px"></div>${label('From')}<strong style="color:${INK}">${esc(c.name)}</strong><br><a href="mailto:${esc(c.email)}" style="color:${GOLD_DEEP}">${esc(c.email)}</a>` +
            detail('Organization', c.company) +
            detail('Shower heads needed', c.quantity) +
            detail('Order reference', c.orderReference),
        ) +
        `${label('Message')}<div style="font-size:15px;line-height:1.7;white-space:pre-wrap;border-left:3px solid ${GOLD};padding:2px 0 2px 16px;color:${INK}">${esc(c.message)}</div>` +
        small(`Just hit <strong>Reply</strong> — your response goes straight to ${esc(c.name)}.`),
    }),
  })
}

// ---- shipping --------------------------------------------------------------

function trackingUrl(n: string): string | null {
  const t = n.replace(/\s+/g, '')
  if (/^1Z[0-9A-Z]{16}$/i.test(t)) return `https://www.ups.com/track?tracknum=${t}`
  if (/^(94|93|92|95)\d{18,20}$/.test(t)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`
  if (/^\d{12}$|^\d{15}$/.test(t)) return `https://www.fedex.com/fedextrack/?trknbr=${t}`
  return null
}

function progress(step: 0 | 1 | 2) {
  const labels = ['Confirmed', 'Shipped', 'Delivered']
  const cell = (i: number) => {
    const done = i <= step
    return (
      `<td align="center" width="33%" style="padding:0 4px">` +
      `<div style="height:4px;background:${done ? GOLD : RULE};border-radius:2px"></div>` +
      `<div style="margin-top:8px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;color:${done ? GOLD_DEEP : '#b9b3a4'}">${labels[i]}</div></td>`
    )
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr>${cell(0)}${cell(1)}${cell(2)}</tr></table>`
}

export async function sendShippingEmail(o: {
  reference: string
  email: string
  name: string | null
  trackingNumber: string | null
  shippingAddress: string | null
}) {
  const firstName = o.name?.split(' ')[0]
  const url = o.trackingNumber ? trackingUrl(o.trackingNumber) : null
  await send({
    to: o.email,
    replyTo: env.supportEmail,
    subject: `Your Aroma Sense order ${o.reference} has shipped`,
    html: layout({
      preheader: o.trackingNumber ? `Tracking number ${o.trackingNumber}` : `Order ${o.reference} is on its way.`,
      eyebrow: 'Shipment update',
      title: `Your order is on its way${firstName ? ', ' + esc(firstName) : ''}.`,
      body:
        progress(1) +
        p(`Good news &mdash; order <strong>${esc(o.reference)}</strong> has left our hands and is headed to you.`) +
        (o.trackingNumber
          ? panel(`${label('Tracking number')}<strong style="font-size:17px;color:${INK};letter-spacing:1px">${esc(o.trackingNumber)}</strong>`) +
            (url ? button(url, 'Track your package') : '')
          : '') +
        (o.shippingAddress ? hr + `${label('Delivering to')}<div style="font-size:14px;line-height:1.7">${nl2br(o.shippingAddress)}</div>` : '') +
        small(`Tracking details can take a few hours to appear after the carrier scans your package. Questions? Just reply to this email.`),
    }),
  })
}

// ---- account / marketing ---------------------------------------------------

export async function sendPasswordResetEmail(to: string, link: string) {
  await send({
    to,
    replyTo: env.supportEmail,
    subject: 'Reset your Aroma Sense password',
    html: layout({
      preheader: 'Use this link within 1 hour to choose a new password.',
      eyebrow: 'Account security',
      title: 'Reset your password.',
      body:
        p(`We received a request to reset the password for your Aroma Sense account. Choose a new one using the button below &mdash; the link is valid for <strong>1 hour</strong> and can be used once.`) +
        button(link, 'Choose a new password') +
        panel(`${label('Button not working?')}<span style="word-break:break-all;color:${GOLD_DEEP};font-size:12px">${esc(link)}</span>`) +
        small(`Didn't request this? You can safely ignore this email &mdash; your password won't change.`),
      footerNote: 'You received this because a password reset was requested for your account.',
    }),
  })
}

export async function sendWelcomeEmail(to: string, code: string, percentOff: number) {
  const perk = (title: string, text: string) =>
    `<tr><td width="28" valign="top" style="padding:8px 0;color:${GOLD};font-size:16px">&#10022;</td>` +
    `<td style="padding:8px 0;font-size:14px;line-height:1.55"><strong style="color:${INK}">${title}</strong><br><span style="color:${MUTED}">${text}</span></td></tr>`
  await send({
    to,
    replyTo: env.supportEmail,
    subject: `Welcome to Aroma Sense — here's ${percentOff}% off`,
    html: layout({
      preheader: `Your ${percentOff}% welcome code is inside.`,
      eyebrow: 'Welcome',
      title: `Welcome to the ritual.`,
      body:
        p(`Thank you for joining Aroma Sense. To begin, here's <strong>${percentOff}% off</strong> your first order.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td align="center" style="border:2px dashed ${GOLD};border-radius:6px;padding:26px 16px;background:#fffdf7">` +
        `<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${MUTED};font-weight:bold">Your welcome code</div>` +
        `<div style="font-family:'Courier New',Courier,monospace;font-weight:bold;font-size:32px;letter-spacing:5px;color:${GOLD_DEEP};margin:8px 0 2px">${esc(code)}</div>` +
        `<div style="font-size:13px;color:${MUTED}">${percentOff}% off &middot; enter at checkout</div></td></tr></table>` +
        button(env.appUrl + '/shop', 'Start shopping') +
        hr +
        label('Why Aroma Sense') +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
        perk('Vitamin C · Aromatherapy · Filtered water', 'Shower systems that turn an everyday shower into a spa ritual.') +
        perk('Hotel-spa technology', 'The same systems used in luxury hotel spas, made for your bathroom at home.') +
        perk('Rewards on every order', 'Earn points you can redeem toward future purchases.') +
        `</table>`,
      footerNote: 'You received this because you signed up at vitamincshower.com.',
    }),
  })
}
