// Message templates and links for reaching customers from the business
// accounts: texts through Google Voice, emails through Gmail (info@).
import { business } from '../data/content.js'

export const BUSINESS_EMAIL = 'info@christmas-light-creations.com'

const first = (c) => c.firstName || 'there'

export const TEMPLATES = {
  reinstall: {
    label: 'Re-install invite',
    subject: (year) => `Your ${year} Christmas lights`,
    body: (c, year) => `Hi ${first(c)},\n\nIt's ${business.name}! We're booking ${year} installs now and would love to light up your home again. Reply to this email (or text ${business.phone}) with "yes" and any timing preferences, and we'll get you on the schedule.\n\nEarly installs book up fast.\n\nThank you,\n${business.name}\n${business.phone}`,
  },
  schedule: {
    label: 'Scheduling update',
    subject: (year) => `Scheduling your ${year} install`,
    body: (c) => `Hi ${first(c)},\n\nWe're putting together the install schedule. Reply with the dates that work best for you, or any gate code or access notes we should know.\n\nThank you,\n${business.name}\n${business.phone}`,
  },
  review: {
    label: 'Review request',
    subject: () => `Thank you from ${business.name}`,
    body: (c) => `Hi ${first(c)},\n\nThank you for choosing ${business.name}! If you have a minute, a Google review really helps our small family business:\n${business.reviewLink}\n\nMerry Christmas,\n${business.name}`,
  },
  custom: { label: 'Blank', subject: () => '', body: (c) => `Hi ${first(c)},\n\n\n\n${business.name}\n${business.phone}` },
}

export const textMessages = {
  confirm: (c, year) => `Hi ${first(c)}, this is ${business.name}! We're scheduling ${year} installs. Would you like your lights again this year? Reply YES and any timing preferences.`,
  review: (c) => `Hi ${first(c)}, thanks for choosing ${business.name}! If you have a minute, a Google review really helps our family business: ${business.reviewLink}`,
  repaired: (c) => `Hi ${first(c)}, ${business.name} here. Your lights should be all set now. If anything else goes out, just text us! And if you have a minute, a Google review really helps: ${business.reviewLink}`,
}

// "(281) 555-0101" -> "+12815550101" (US numbers).
export function e164(phone) {
  const d = String(phone ?? '').replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return d ? `+${d}` : ''
}

// Opens the Google Voice conversation with this number (web and app).
export const voiceUrl = (phone) => `https://voice.google.com/u/0/messages?itemId=t.${encodeURIComponent(e164(phone))}`

// Gmail compose window from the business account.
export function gmailUrl({ to = '', bcc = '', subject = '', body = '' }) {
  const p = new URLSearchParams({ view: 'cm', fs: '1', to, bcc, su: subject, body })
  return `https://mail.google.com/mail/u/${BUSINESS_EMAIL}/?${p}`
}
