import { env } from './env.ts'

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function sign(email: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.jwtSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('unsubscribe:' + email.toLowerCase())))
}

export async function verifyUnsubscribeToken(email: string, token: string) {
  const expected = await sign(email)
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i) // constant-time
  return diff === 0
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
