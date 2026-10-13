// "Got your request" (owner 2026-10-12, docs/specs/auto-emails.md): the
// moment a website estimate request arrives, the customer gets one plain
// email saying what happens next. No AI: fixed words. Sent by newLeadAlert
// (functions/index.js) after the staff alert, filed in the lead's history
// like an email from the staff app (template 'request-ack', sent by
// 'website'), skipped when the same email got one in the last day (double
// taps) and when ⚙ Settings turns it off (settings/app.ackRequests false).
// Pure: no Firebase. Tested in tests/autoEmails.test.mjs.
import { ACCOUNT_URL, BIZ, PHONE, SITE_URL, brandText, textFooter } from './brand.js'
import { wantsGiftWrapping } from './giftWrapping.js'

export const ACK_TEMPLATE = 'request-ack'
export const ACK_GAP_MS = 24 * 60 * 60 * 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const ackOn = (settings) => settings?.ackRequests !== false
export const ackAddress = (lead) => {
  const e = String(lead?.email ?? '').trim().toLowerCase()
  return EMAIL_RE.test(e) && e.length <= 200 ? e : ''
}

// Earlier leads with the same email (any order) -> true if one was acknowledged within the gap.
export const ackedRecently = (earlier, now = Date.now()) =>
  (earlier ?? []).some((l) => l.ackSentAt && now - (l.ackSentAt.toMillis ? l.ackSentAt.toMillis() : Number(l.ackSentAt) || 0) < ACK_GAP_MS)

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

// The email: { subject, text, html }. designAttached: they sent a designer picture.
// A request for gift wrapping alone (docs/specs/gift-wrapping.md) gets its own
// next steps (no measuring, no designer); lights + wrapping gets the lights
// email with one more line.
export function ackEmail(lead, { designAttached = false } = {}) {
  const first = oneLine(lead?.firstName) || 'there'
  const signOff = `Questions? Reply to this email, or call or text ${PHONE}.

Thank you,
${BIZ}
${PHONE}${textFooter(false)}`
  if (lead?.service === 'Gift wrapping') {
    const text = `Hi ${first},

We got your gift wrapping request. Here's what happens next:

1. We get back to you by email or text, usually within a day, to go over what you have: how many gifts, their sizes, the colors you like, and when you need them.
2. You get one clear price for the lot.
3. We arrange the hand-off with you, and your gifts come back wrapped and ready to give.

${signOff}`
    return { subject: 'Got your request: your gift wrapping price is on its way', text, html: brandText({ heading: 'We got your request', text }) }
  }
  const where = oneLine(lead?.address) || oneLine(lead?.city) || 'your home'
  const designer = designAttached
    ? 'We have the design you drew, which helps a lot.'
    : `Want to see it first? Draw your lights on a photo of your own home with our free designer: ${SITE_URL}/design/`
  const wrapping = wantsGiftWrapping(lead)
    ? '\n\nYou also asked about gift wrapping: we go over that with you (how many gifts, sizes, when you need them) when we send your lights price.'
    : ''
  const text = `Hi ${first},

We got your request for ${where}. Here's what happens next:

1. We look at your home from the photos or design you sent (or Street View) and, if we need to, stop by to measure. You don't need to be home.
2. You get one exact price by email or text, usually within a day or two in season. We don't quote over the phone because every home is different.
3. Say yes online, pick your install date, and we take it from there: install, free service calls all season, and takedown in January.

${designer}

Buy your lights, lease them, or pay in 3 monthly payments, all at the same price. Installs done by the end of October get our early-install discount.${wrapping}

${signOff}`
  return {
    subject: `Got your request: your Christmas lights estimate is on its way`,
    text,
    html: brandText({ heading: 'We got your request', text, button: designAttached ? undefined : { href: `${SITE_URL}/design/`, label: 'Design your lights (free)' } }),
  }
}

// What the staff app and the sales assistant can read back about it.
export const ackNote = (to) => `"Got your request" email sent to ${to} (${ACCOUNT_URL.replace(/\/account\/$/, '')}).`
