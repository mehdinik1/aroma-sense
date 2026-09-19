import { env } from './env.ts'

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function hmacHex(message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.jwtSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

const sign = (email: string) => hmacHex('unsubscribe:' + email.toLowerCase())

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i) // constant-time
  return diff === 0
}

/** Private link token for "write a review" emails: proves the holder received it for this order. */
export const reviewToken = (reference: string) => hmacHex('review:' + reference)
export async function verifyReviewToken(reference: string, token: string) {
  return safeEqual(await reviewToken(reference), token)
}

export async function verifyUnsubscribeToken(email: string, token: string) {
  return safeEqual(await sign(email), token)
}

/** Page a person opens from an email (asks them to confirm). */
export async function unsubscribePageUrl(email: string) {
  return `${env.appUrl}/unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&t=${await sign(email)}`
}

/** Endpoint mail apps POST to for one-click unsubscribe (List-Unsubscribe header). */
export async function unsubscribeApiUrl(email: string) {
  return `${env.apiUrl}/api/unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&t=${await sign(email)}`
}

// Commercial email must identify the sender and give a postal address (CAN-SPAM / CASL).
// Until MAILING_ADDRESS is configured, promotional emails are not sent.
export const canSendMarketing = () => !!env.mailingAddress
