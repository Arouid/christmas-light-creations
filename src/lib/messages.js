// Message templates and links for reaching customers from the business
// accounts: texts through Google Voice, emails through Gmail (info@).
import { business } from '../data/content.js'

export const BUSINESS_EMAIL = 'info@christmas-light-creations.com'

const first = (c) => c.firstName || 'there'

export const textMessages = {
  confirm: (c, year) => `Hi ${first(c)}, this is ${business.name}! We're scheduling ${year} installs. Would you like your lights again this year? Reply YES and any timing preferences.`,
  review: (c) => `Hi ${first(c)}, thanks for choosing ${business.name}! If you have a minute, a Google review really helps our family business: ${business.reviewLink}`,
  winback: (c, year) => `Hi ${first(c)}, this is ${business.name}. You asked us about Christmas lights a while back. We're booking ${year} installs now and would love to light up your home! Free estimate, no need to be home. Want one?`,
  repaired: (c) => `Hi ${first(c)}, ${business.name} here. Your lights should be all set now. If anything else goes out, just text us! And if you have a minute, a Google review really helps: ${business.reviewLink}`,
}

// Placeholders for email templates: {key} is replaced per customer.
// Missing values become empty, except {first}, which falls back to "there".
const S = (c, y) => c.seasons?.[y] ?? {}
export const PLACEHOLDERS = [
  ['first', 'First name', (c) => c.firstName || 'there'],
  ['last', 'Last name', (c) => c.lastName],
  ['full', 'Full name', (c) => c.fullName],
  ['address', 'Address', (c) => c.address],
  ['city', 'City', (c) => c.city],
  ['phone', 'Their phone', (c) => c.phone],
  ['email', 'Their email', (c) => c.email],
  ['gate', 'Gate code', (c) => c.gateCode],
  ['since', 'Customer since', (c) => c.since],
  ['asked', 'Year they asked (past requests)', (c) => c.lastAsked?.slice(0, 4)],
  ['season', 'Season year', (c, y) => y],
  ['rate', 'Install rate', (c, y) => S(c, y).install?.rate],
  ['discount', 'Discount', (c, y) => S(c, y).install?.discount],
  ['total', 'Total due', (c, y) => S(c, y).install?.total],
  ['takedownRate', 'Takedown rate', (c, y) => S(c, y).takedown?.rate],
  ['weekOf', 'Week of', (c, y) => S(c, y).weekOf],
  ['day', 'Day', (c, y) => S(c, y).day],
  ['date', 'Planned date', (c, y) => S(c, y).plannedDate],
  ['timeframe', 'Timeframe', (c, y) => S(c, y).timeframe],
  ['status', 'Install status', (c, y) => S(c, y).installStatus],
  ['reviewLink', 'Google review link', () => business.reviewLink],
  ['business', 'Business name', () => business.name],
  ['businessPhone', 'Business phone', () => business.phone],
  ['website', 'Website', () => 'https://christmas-light-creations.com'],
].map(([key, label, get]) => ({ key, label, get }))

export function fillTemplate(text, customer, season) {
  return PLACEHOLDERS.reduce(
    (out, p) => out.replaceAll(`{${p.key}}`, String(p.get(customer, season) ?? '')),
    text,
  )
}

// Placeholders a customer has no value for (to warn before sending).
export function missingPlaceholders(text, customer, season) {
  return PLACEHOLDERS.filter((p) => text.includes(`{${p.key}}`) && !p.get(customer, season)).map((p) => p.label)
}

// "(281) 555-0101" -> "+12815550101" (US numbers).
export function e164(phone) {
  const d = String(phone ?? '').replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return d ? `+${d}` : ''
}

// Opens the Google Voice conversation with this number. `account` picks which
// signed-in Google account's Voice number to use; empty = the browser's first.
export const voiceUrl = (phone, account = '') =>
  `https://voice.google.com/u/${account ? encodeURIComponent(account) : '0'}/messages?itemId=t.${encodeURIComponent(e164(phone))}`

// Gmail compose window from the business account.
export function gmailUrl({ to = '', bcc = '', subject = '', body = '' }) {
  const p = new URLSearchParams({ view: 'cm', fs: '1', to, bcc, su: subject, body })
  return `https://mail.google.com/mail/u/${BUSINESS_EMAIL}/?${p}`
}
