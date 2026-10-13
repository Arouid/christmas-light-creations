// Gift wrapping (docs/specs/gift-wrapping.md): a second service, hidden
// behind a switch until the owner says go (2026-10-13: "put the gift
// wrapping on a switch, I'm not ready to take it live yet"). Pure and shared:
// the server (the `booking` function, the alert and "Got your request"
// emails) and the pages (src/lib/giftWrapping.js re-exports it) must agree
// on the switch and on what a request may say. Tested in tests/giftWrapping.test.mjs.

// The switch: settings/app.giftWrapping, off unless it is exactly true.
export const giftWrappingOn = (settings) => settings?.giftWrapping === true

// "What do you need?" on the estimate form, saved on the lead as `service`
// (the create rule in firestore.rules lists the same three).
export const SERVICES = ['Christmas lights', 'Gift wrapping', 'Both']

// What the form saves: the choice when it is one of the three, nothing
// otherwise. While the switch is off the form has no such field, so the
// lead carries no `service` at all (the rules allow that).
export function leadService(value) {
  const v = String(value ?? '').trim()
  return SERVICES.includes(v) ? v : null
}

// Did this request ask for gift wrapping (alone or with lights)?
export const wantsGiftWrapping = (lead) => lead?.service === 'Gift wrapping' || lead?.service === 'Both'

// Plain words for staff; empty for lights only (nothing to flag).
export function serviceWords(lead) {
  if (lead?.service === 'Both') return 'Lights + gift wrapping'
  if (lead?.service === 'Gift wrapping') return 'Gift wrapping (no lights)'
  return ''
}

// The tag on the lead card and in the 💬 list: "🎁 Gift wrapping (no lights)".
export const serviceLabel = (lead) => (wantsGiftWrapping(lead) ? `🎁 ${serviceWords(lead)}` : '')
