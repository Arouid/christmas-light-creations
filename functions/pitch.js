// Sales pitches through the estimate form (owner 2026-10-13: "another person
// abusing our submission form": a janitorial company's cold pitch ending
// "Respond with stop to optout" arrived as a request, with the alert, the
// push and the "Got your request" email). App Check stops scripts, not a
// person paid to paste a pitch into every contact form in Houston, so the
// server reads each new request: pitchReason(lead) returns '' for a real
// request or a one-line reason, and newLeadAlert (functions/index.js) then
// files the lead under Spam / test with that reason, alerts nobody, sends no
// "Got your request", and notes it in Recent activity. Conservative on
// purpose: one tell alone never files a request, and customer words (lights,
// roofline, house…) protect it unless the pitch is unmistakable. Spec:
// docs/specs/spam-filters.md. Pure; tested in tests/pitch.test.mjs.
export const pitchFilterOn = (settings) => settings?.pitchFilter !== false
export const REASON_MAX = 200

// What a cold pitch says: [label, pattern, points].
const TELLS = [
  ['an opt-out line', /\b(reply|respond|text|answer|write)\b[^\n.]{0,30}\bstop\b[^\n.]{0,40}\b(opt[- ]?out|unsubscribe|remove)|\b(opt[- ]?out|unsubscribe)\b[^\n.]{0,40}\b(reply|respond|text|stop)\b/i, 3],
  ['pitches to light installers', /\b(christmas|holiday) light(ing)? (installers|companies|businesses|contractors|pros|professionals)\b/i, 2],
  ['sells a service to businesses', /\b(SEO|search engine|web(site)? (design|development|redesign)|lead generation|leads for your|google ranking|rank(ing)? (higher )?on google|payroll|merchant services|credit card processing|business (loan|funding|line of credit)|working capital|janitorial|commercial cleaning|cleaning (bid|service|company|crew|proposal)|staffing|virtual assistant|outsourc\w*|app development|bookkeeping|accounting services|marketing (services|agency|company|team)|digital marketing|social media management|business listing|directory listing|promotional (products|items)|uniforms|gps tracking|insurance review|our (services|clients))\b/i, 2],
  ['offers a free bid', /\b(offer|provid|giv|send|schedul)\w* (you |your (company|business|team|office) )?(a |an |some |our )?(complimentary|free|no[- ]obligation|no[- ]cost)\b/i, 1],
  ['“help local companies”', /\b(help|serv|work with|support|partner with)\w* (many |other |local |small |area |hundreds of |dozens of |several |businesses like )*(companies|businesses|business owners|contractors|clients|organizations)\b/i, 1],
  ['signs with a sales title', /\b(VP|Vice President|General Manager|Sales (Manager|Director|Rep|Representative|Executive)|Account (Executive|Manager)|Business Development|Marketing (Manager|Director)|Founder|CEO)\b/, 1],
]
// Words a real request uses. The "light installers" phrase is removed first
// so a pitch aimed at us doesn't count as a customer talking about lights.
const CUSTOMER_WORDS = /\b(lights?|lighting|christmas|holiday|xmas|roof|roofline|install\w*|decorat\w*|wreaths?|garland|trees?|bushes|house|home|yard|hoa|gutters?|eaves|columns?|windows?|my (house|home|property|place))\b/i
const FILE_AT = 3 // points with no customer words
const FILE_ANYWAY = 5 // points even with customer words

// A lead (the form's fields) -> '' or "Looks like a sales pitch: …" (the top tells).
export function pitchReason(lead) {
  const text = String(lead?.message ?? '')
  if (!text.trim()) return ''
  const hits = TELLS.filter(([, re]) => re.test(text))
  const points = hits.reduce((n, [, , p]) => n + p, 0)
  const customer = CUSTOMER_WORDS.test(text.replace(TELLS[1][2], ' '))
  if (points < FILE_AT || (customer && points < FILE_ANYWAY)) return ''
  return `Looks like a sales pitch: ${hits.slice(0, 3).map(([label]) => label).join(', ')}`.slice(0, REASON_MAX)
}
