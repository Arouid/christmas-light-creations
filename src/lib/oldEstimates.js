// Past estimate requests from the old WordPress site (2015–2026), cleaned into
// one record per person for the staff "Past requests" list. Pure functions;
// scripts/old-estimates.mjs runs them on the private CSV export.

// "key: value | key: value" (the export's "All fields" column) -> object.
export function parseFields(all = '') {
  const out = {}
  for (const part of String(all).split(' | ')) {
    const i = part.indexOf(':')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

const digits = (s) => String(s ?? '').replace(/\D/g, '')
export function cleanPhone(s) {
  let d = digits(s)
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1)
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : ''
}

const titleCase = (s) => s.replace(/\S+/g, (w) => (w === w.toUpperCase() || w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))

// Random-letter strings bots fill forms with: "xHkslbMIpBkfdmZPsBQ".
export function looksRandom(s) {
  const t = String(s ?? '').trim()
  if (!t) return false
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(t)) return true // "Fhtxfdxfov", "hgtpyhklpdg"
  if (t.length >= 20 && !/\s/.test(t)) return true
  if (/^[A-Za-z]{12,}$/.test(t) && /[a-z][A-Z]/.test(t)) return true
  const words = t.split(/\s+/)
  return words.length === 1 && t.length >= 10 && !/[aeiou]{1}.*[aeiou]/i.test(t.slice(0, 6)) && /[A-Z].*[A-Z].*[A-Z]/.test(t)
}

const SPAM = [
  /https?:\/\//i, /www\./i, /\bseo\b/i, /backlink/i, /\branking/i, /google (first|page|search)/i, /website (design|traffic|redesign)/i,
  /\bcpm/i, /working capital/i, /\bloan/i, /funding/i, /credit (score|line)/i, /crypto|bitcoin/i, /\bcasino/i, /viagra|cialis/i,
  /did you know/i, /commercial offers?/i, /contact form/i, /\bleads? (for|to) your/i, /marketing/i, /\bvideo\b.*\bexplainer/i,
  /please send us your offer/i, /\bunsubscribe\b/i, /\bai\b.*\b(agent|chatbot|receptionist)/i, /virtual assistant/i, /social media/i,
  /\bdear (sir|business|owner)/i, /\bhello!?\s+christmas-light-creations/i, /merchant|payment processing/i, /\bdomain\b/i,
  /wikipedia/i, /janitorial/i, /internationally/i, /came across .*\.com/i, /wanted to connect/i, /national presence/i,
  /corporation/i, /you just read this message/i, /grow your business/i, /telegram/i, /\brobot\b|\bbot\b/i, /make money|\bearn\b/i,
  /is anyone human/i, /growth service/i, /president|ceo\b/i, /research consultant/i, /salaam/i, /attn\.? director/i,
  /cleaning (provider|service)/i, /mobile app/i, /competitors/i, /noticed your business/i, /reviewed your website/i,
  /browsing .*\.com/i, /sorry to be a bother/i, /illness/i, /steady (cash|income|flow)/i, /we are interested in your products/i,
  /entrepreneur/i, /please call me soonest/i,
  /search terms/i, /promotional offer/i, /has some issues/i, /\bbank\b/i, /your brand/i, /vegan/i, /\bcleaning\b/i,
  /research invitation/i, /starseed/i, /dear .*\.com/i, /^(\w{1,3})\1{2,}\w{0,3}$/i, /classified/i, /hurtful/i, /resubmit/i, /\breviews\b.*\bmost busi/i, /listing for your company/i,
]
export const isSpamText = (s) => SPAM.some((re) => re.test(String(s ?? '')))

// Real requests talk about the job; bots don't.
const ABOUT_LIGHTS = /light|christmas|xmas|holiday|install|quote|estimate|roof|house|home|tree|gutter|bush|shrub|decor|lit\b|led\b|warm white|color|building|store|office|price|cost|how much|story|eave|wrap/i
// "RogergusSy", "MariaMaype", "Thomasdurse": one word, capital in the middle,
// or bot test names.
const CAMEL_NAME = /^[A-Z][a-z]+[a-z][A-Z][A-Za-z]*$/ // case matters: "MariaMaype", not "Irene"
const BOT_NAME = /^[A-Z][a-z]{3,}(gus|hed|durse|maype|conee|async|tog|hfi)\w*$|xrumer|^test\b|\btest\b.*\d|thank you for/i
const REPEATED_NAME = /^(\w{5,})\w*\s+\1/i // "Johnsonbut JohnsonbutV"
const FOREIGN = /[äöüëéèàçñßōāēīū]|\b(hallo|ciao|salut|sveiki|ek wou|volevo|hola|bonjour)\b/i

function isRealRequest({ name, message, phone, date }) {
  if (CAMEL_NAME.test(name) || BOT_NAME.test(name) || REPEATED_NAME.test(name) || FOREIGN.test(message) || FOREIGN.test(name)) return false
  if (message) return ABOUT_LIGHTS.test(message) && !/wanted to know your price|your offer|find out (your|the) price/i.test(message)
  // No message: keep real-looking names with a US phone during the season.
  const month = Number(date.slice(5, 7))
  return Boolean(phone) && /\S+\s+\S+/.test(name) && (month >= 8 || month <= 1)
}

// Rows scripts/old-site/old-history.mjs adds from the old mail and Voice:
// a PayPal/Square payment or invoice, or a named Voice contact. Not form
// entries, so the spam checks don't apply.
function historyRow(row, f) {
  // Invoices sent to an address show the address where the name goes.
  const named = String(f.Name ?? '').trim()
  const name = named.includes('@') ? '' : named
  const email = (String(row.Email ?? '').trim() || (named.includes('@') ? named : '')).toLowerCase()
  const phone = cleanPhone(row.Phone)
  if (!name && !email && !phone) return null
  const base = { date: String(row.Date ?? '').slice(0, 10), name: name ? titleCase(name) : '', email: email.includes('@') ? email : '', phone, address: String(row.Address ?? '').trim(), message: '' }
  if (row.Source === 'Voice') return { ...base, voice: { entries: Number(row.Amount) || 0, summary: String(row.Message ?? ''), date: base.date } }
  return { ...base, payment: { date: base.date, via: row.Source, kind: row.Kind === 'invoice' ? 'invoice' : 'payment', amount: Number(row.Amount) || 0, invoice: String(row.Invoice ?? ''), items: String(row.Items ?? '') } }
}

// One raw CSV row -> a clean request, or null if it's junk.
export function cleanRow(row) {
  const f = parseFields(row['All fields'])
  if (['PayPal', 'Square', 'Voice'].includes(row.Source)) return historyRow(row, f)
  const name = (f.Name || f['your-name'] || [row['First name'], row['Last name']].filter(Boolean).join(' ')).trim()
  const email = String(f.Email || f.email || f['your-email'] || row.Email || '').trim().toLowerCase()
  const phone = cleanPhone(f.Phone || f.phone || f['tel-858'] || row.Phone)
  // The old price calculator stored everything encrypted (email, phone,
  // address), so its entries can't be used.
  if (row.Source === 'Estimate calculator') return null
  const message = String(f.Message || f['your-message'] || row.Message || '').trim()
  const address = String(f.address || row.Address || '').trim()
  const city = String(f.city || row.City || '').trim()
  const zip = String(f.zip || '').trim()

  if (looksRandom(name) || looksRandom(message)) return null
  if (email.endsWith('@christmas-light-creations.com')) return null // our own tests
  if (isSpamText(message) || isSpamText(name)) return null
  if (!email.includes('@') && !phone) return null
  if (!isRealRequest({ name, message, phone, date: String(row.Date ?? '') })) return null
  const contactBy = ['Email', 'Text', 'Phone'].filter((k) => f[`How should we contact you? ${k}`])

  return {
    date: String(row.Date ?? '').slice(0, 10),
    name: name ? titleCase(name) : '',
    email: email.includes('@') ? email : '',
    phone,
    address,
    city: city ? titleCase(city) : '',
    zip,
    message,
    contactBy: contactBy.join(', '),
    // The site's notification email to staff failed (broken Gmail link), so
    // nobody saw this request at the time.
    missed: f.Notification === 'failed',
  }
}

// Merge repeat requests from the same person: newest details win, all dates
// and messages are kept, older emails go to otherEmails.
export function mergePeople(requests) {
  const byKey = new Map()
  const people = []
  for (const r of [...requests].sort((a, b) => a.date.localeCompare(b.date))) {
    // Same email, same phone, or same first + last name (people often used a
    // second email the next time).
    const fullName = /\S+\s+\S+/.test(r.name) ? r.name.toLowerCase() : ''
    const keys = [r.email && `e:${r.email}`, r.phone && `p:${r.phone}`, fullName && `n:${fullName}`].filter(Boolean)
    let p = keys.map((k) => byKey.get(k)).find(Boolean)
    if (!p) {
      p = { requests: [], key: r.email || r.phone || fullName } // first contact: stable id across re-imports
      people.push(p)
    }
    keys.forEach((k) => byKey.set(k, p))
    if (r.payment || r.voice) {
      for (const [k, v] of Object.entries(r)) if (v && !['message', 'date', 'payment', 'voice'].includes(k) && !p[k]) p[k] = v
      if (r.voice) p.voice = r.voice
      const pay = r.payment
      if (pay && !(p.payments ??= []).some((x) => x.date === pay.date && x.amount === pay.amount && x.invoice === pay.invoice)) p.payments.push(pay)
      continue
    }
    if (r.email && p.email && r.email !== p.email) p.otherEmails = [...new Set([...(p.otherEmails ?? []), p.email])]
    for (const [k, v] of Object.entries(r)) if (v && !['message', 'date', 'missed'].includes(k)) p[k] = v
    // The form entry and its notification email are the same request.
    const same = p.requests.find((q) => q.message === r.message && Math.abs(Date.parse(q.date) - Date.parse(r.date)) <= 2 * 86400e3)
    if (same) {
      if (r.missed) same.missed = true
    } else {
      p.requests.push({ date: r.date, message: r.message, ...(r.missed ? { missed: true } : {}) })
    }
    keys.forEach((k) => byKey.set(k, p))
  }
  return people.map(({ key, ...p }) => {
    const paidDates = (p.payments ?? []).map((x) => x.date).filter(Boolean).sort()
    const dates = [...p.requests.map((q) => q.date), ...paidDates, p.voice?.date].filter(Boolean).sort()
    const first = p.requests[0]?.date ?? dates[0] ?? ''
    const last = p.requests.at(-1)?.date ?? dates.at(-1) ?? ''
    const name = p.name || ''
    return {
      ...p,
      firstName: name.split(' ')[0] || '',
      lastName: name.split(' ').slice(1).join(' '),
      fullName: name || p.email || p.phone,
      firstAsked: first,
      lastAsked: last,
      year: last.slice(0, 4),
      missed: p.requests.some((q) => q.missed),
      ...(p.payments ? { paid: Math.round(p.payments.filter((x) => x.kind === 'payment').reduce((a, x) => a + x.amount, 0) * 100) / 100, firstPaid: paidDates[0] ?? '', lastPaid: paidDates.at(-1) ?? '' } : {}),
      id: idFor({ ...p, key }),
    }
  })
}

// Stable id so re-imports update instead of duplicating.
export function idFor(p) {
  const base = p.key ? (p.key.includes('@') ? p.key : digits(p.key) || p.key) : p.email || digits(p.phone) || p.name || ''
  return `old-${base.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`.slice(0, 120)
}

// Is this past request already a customer? Match on email, phone, or name.
export function findCustomer(person, customers = []) {
  const ph = digits(person.phone)
  const nm = person.fullName?.toLowerCase()
  return customers.find((c) =>
    [person.email, ...(person.otherEmails ?? [])].some((e) => e && c.email?.toLowerCase().split(/[\s,;]+/).includes(e))
    || (ph && digits(c.phone).endsWith(ph))
    || (nm && nm.includes(' ') && c.fullName?.toLowerCase() === nm)) ?? null
}

// On re-import, keep the id of a person already in the list (same email,
// phone or full name) so their status and notes stay with them and no
// duplicate is created.
export function reuseIds(people, existing = []) {
  const digitsOf = (s) => String(s ?? '').replace(/\D/g, '')
  const index = new Map()
  for (const e of existing) {
    for (const em of [e.email, ...(e.otherEmails ?? [])]) if (em) index.set(`e:${em}`, e.id)
    if (digitsOf(e.phone)) index.set(`p:${digitsOf(e.phone)}`, e.id)
    if (/\S+\s+\S+/.test(e.fullName ?? '')) index.set(`n:${e.fullName.toLowerCase()}`, e.id)
  }
  return people.map((p) => {
    const keys = [...[p.email, ...(p.otherEmails ?? [])].filter(Boolean).map((em) => `e:${em}`),
      digitsOf(p.phone) && `p:${digitsOf(p.phone)}`, /\S+\s+\S+/.test(p.fullName ?? '') && `n:${p.fullName.toLowerCase()}`].filter(Boolean)
    const id = keys.map((k) => index.get(k)).find(Boolean)
    return id ? { ...p, id } : p
  })
}

// Statuses that file a person away for good: never contacted or exported.
export const FILED_STATUSES = ['Deceased', 'Personal (family/friends)', 'Junk / spam']

// Which Past requests view a person belongs to: paid or were invoiced before
// (win-back), asked for an estimate, or only texted/called.
export function pastGroup(r) {
  if (r.payments?.length) return 'winback'
  return r.requests?.length ? 'asked' : 'voice'
}
