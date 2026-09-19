// Where analytics needs the visitor's opt-in first: the EU (Cloudflare flags it), the rest of the
// EEA, the UK and Switzerland. An unknown location is treated as "ask first".
const OTHER_OPT_IN = new Set(['GB', 'CH', 'IS', 'LI', 'NO'])

export function consentRequired(country?: string | null, isEUCountry?: string | null) {
  if (!country) return true
  return isEUCountry === '1' || OTHER_OPT_IN.has(country.toUpperCase())
}
