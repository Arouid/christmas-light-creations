// "Ask Claude" (askClaude in index.js): staff questions over the database,
// answered by Claude with read-only tools. This file is pure: the prompt, the
// tool schemas, the argument checks, the request checks, the answer parsing
// and the limits. No Firebase, no network. Spec: docs/specs/ask-claude.md.
// Tested in tests/askClaude.test.mjs.
import { MODEL, NEXT_ACTIONS, PRICE, costOf } from './prompt.js'

export { MODEL, PRICE, costOf }
export const MAX_OUTPUT_TOKENS = 2000
export const MAX_QUESTION_CHARS = 1000
export const MAX_HISTORY = 6 // turns sent back with a follow-up question
export const MAX_HISTORY_CHARS = 2000 // per turn
export const MAX_TOOL_CALLS = 8 // per question
export const MAX_ROWS = 25 // per tool result
export const MAX_ANSWER_CHARS = 4000
export const MAX_RECORDS = 25
export const DAILY_LIMIT = 100 // questions a day, all staff together
export const MIN_GAP_MS = 2000 // per staff member

export const RECORD_TYPES = ['customer', 'lead', 'invoice', 'route']
export const LEAD_STATUSES = ['new', 'called', 'estimate-sent', 'booked', 'lost', 'spam']
export const INVOICE_STATES = ['open', 'overdue', 'draft', 'paid', 'all']

const ID_RE = /^(?!__)[^/]{1,200}$/
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const bad = (msg) => ({ problem: ['invalid-argument', msg] })

// ---- Request from the browser -------------------------------------------------

// { question, history? } -> { question, history } or { problem }.
export function askRequest(data) {
  if (!data || typeof data !== 'object') return bad('Ask a question')
  const question = typeof data.question === 'string' ? data.question.trim() : ''
  if (!question) return bad('Ask a question')
  if (question.length > MAX_QUESTION_CHARS) return bad(`Keep the question under ${MAX_QUESTION_CHARS} characters`)
  const raw = data.history === undefined || data.history === null ? [] : data.history
  if (!Array.isArray(raw)) return bad('History must be a list')
  const history = raw.slice(-MAX_HISTORY).map((t) => {
    if (!t || typeof t !== 'object' || !['user', 'assistant'].includes(t.role) || typeof t.text !== 'string') return null
    const text = t.text.trim().slice(0, MAX_HISTORY_CHARS)
    return text ? { role: t.role, text } : null
  })
  if (history.includes(null)) return bad('History has an entry we can’t read')
  return { question, history }
}

// serverState/askClaude -> { next } or { problem }. Counts questions per Central day.
export function askAllowed(state, staff, now, day) {
  const today = state?.day === day
  const count = today ? Number(state.count) || 0 : 0
  if (count >= DAILY_LIMIT) return { problem: ['resource-exhausted', `That's ${DAILY_LIMIT} questions today, the daily limit. Try again tomorrow, or look it up in the app.`] }
  const last = today ? state.last ?? {} : {}
  if (now - (Number(last[staff]) || 0) < MIN_GAP_MS) return { problem: ['resource-exhausted', 'One at a time: wait a moment, then ask again.'] }
  return { next: { day, count: count + 1, last: { ...last, [staff]: now } } }
}

// ---- Tools ------------------------------------------------------------------------

const str = (description, maxLength = 200) => ({ type: 'string', description, maxLength })
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })

// What the model may call. Every one is read-only; ask.js implements them.
export const TOOLS = [
  { name: 'find_customers', description: 'Search customers by name, street, phone (any format), email or neighborhood. Returns up to 25 matches with this season’s install status. Use it first whenever a question names a person or address.',
    input_schema: schema({ query: str('Name, street, phone, email or neighborhood to look for', 120) }, ['query']) },
  { name: 'get_customer', description: 'One customer in full: contact, every season (status, planned date, prices, paid, takedown, add-ons, scheduling notes), install type, staff notes. Use the id from find_customers or list_invoices.',
    input_schema: schema({ id: str('Customer id') }, ['id']) },
  { name: 'list_leads', description: 'Website estimate requests (leads), newest first, up to 25. Optional status filter and how many days back (default 30).',
    input_schema: schema({ status: { type: 'string', enum: LEAD_STATUSES, description: 'Only leads with this status' }, days: { type: 'integer', minimum: 1, maximum: 3650, description: 'How many days back (default 30)' } }) },
  { name: 'list_invoices', description: 'Invoices by state: open (due, includes overdue), overdue (open and past due), draft, paid, or all. Optionally only one customer’s. Up to 25, newest first.',
    input_schema: schema({ state: { type: 'string', enum: INVOICE_STATES, description: 'Which invoices' }, customerId: str('Only this customer’s invoices') }, ['state']) },
  { name: 'routes_for_day', description: 'The install / takedown / service routes planned for one day, with their stops in driving order and arrival times.',
    input_schema: schema({ day: str('YYYY-MM-DD, or "today"', 10) }, ['day']) },
  { name: 'get_messages', description: 'A person’s text, call, voicemail and email history with us, newest first (up to 25; default 15). Give customerId or leadId.',
    input_schema: schema({ customerId: str('Customer id'), leadId: str('Lead id'), limit: { type: 'integer', minimum: 1, maximum: MAX_ROWS, description: 'How many (default 15)' } }) },
  { name: 'system_status', description: 'Health of the app: last text/email sync, open website problems, request-alert email list, assistant switches, today’s date and season. Use for "is X working" questions.',
    input_schema: schema({}) },
]
export const TOOL_NAMES = TOOLS.map((t) => t.name)

const clean = (s, n) => String(s ?? '').trim().slice(0, n)

// The model's arguments -> checked arguments, or { problem: 'reason' } the model
// reads as the tool result. Defends ask.js from odd input; never throws.
export function toolArgs(name, input) {
  const a = input && typeof input === 'object' ? input : {}
  const s = (k, n = 200) => (a[k] === undefined || a[k] === null ? '' : typeof a[k] === 'string' ? clean(a[k], n) : null)
  const id = (k) => { const v = s(k); return v === null || (v && !ID_RE.test(v)) ? null : v }
  switch (name) {
    case 'find_customers': {
      const query = s('query', 120)
      if (!query) return { problem: 'query is required: a name, street, phone, email or neighborhood.' }
      return { args: { query } }
    }
    case 'get_customer': {
      const v = id('id')
      if (!v) return { problem: 'id is required (from find_customers or list_invoices).' }
      return { args: { id: v } }
    }
    case 'list_leads': {
      const status = s('status')
      if (status === null || (status && !LEAD_STATUSES.includes(status))) return { problem: `status must be one of ${LEAD_STATUSES.join(', ')}.` }
      const days = a.days === undefined || a.days === null ? 30 : Number(a.days)
      if (!Number.isInteger(days) || days < 1 || days > 3650) return { problem: 'days must be a whole number from 1 to 3650.' }
      return { args: { status, days } }
    }
    case 'list_invoices': {
      const state = s('state')
      if (!INVOICE_STATES.includes(state)) return { problem: `state must be one of ${INVOICE_STATES.join(', ')}.` }
      const customerId = id('customerId')
      if (customerId === null) return { problem: 'customerId is not a valid id.' }
      return { args: { state, customerId } }
    }
    case 'routes_for_day': {
      const day = s('day', 10)
      if (!day) return { problem: 'day is required: YYYY-MM-DD or "today".' }
      if (day !== 'today' && !DAY_RE.test(day)) return { problem: 'day must look like 2026-11-20, or be "today".' }
      return { args: { day } }
    }
    case 'get_messages': {
      const customerId = id('customerId')
      const leadId = id('leadId')
      if (customerId === null || leadId === null) return { problem: 'That id is not valid.' }
      if (!customerId && !leadId) return { problem: 'Give customerId or leadId.' }
      const limit = a.limit === undefined || a.limit === null ? 15 : Number(a.limit)
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ROWS) return { problem: `limit must be a whole number from 1 to ${MAX_ROWS}.` }
      return { args: customerId ? { customerId, limit } : { leadId, limit } }
    }
    case 'system_status':
      return { args: {} }
    default:
      return { problem: `Unknown tool "${String(name).slice(0, 40)}". Use one of ${TOOL_NAMES.join(', ')}.` }
  }
}

// ---- Rows the model sees (never gate codes or payment references) ----------

const clip = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''))
export const dayOf = (t) => {
  const ms = t?.toMillis ? t.toMillis() : t?.seconds != null ? t.seconds * 1000 : typeof t === 'number' ? t : t ? Date.parse(t) : NaN
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : ''
}

export function seasonRow(year, s = {}) {
  return drop({
    year: String(year), installStatus: s.installStatus, wantsLights: s.firstContact,
    planned: [s.day, s.plannedDate, s.weekOf && `week of ${s.weekOf}`, s.timeframe].filter(Boolean).join(' ') || undefined,
    installPrice: s.install?.rate, discount: s.install?.discount, installTotal: s.install?.total, installPaid: s.install?.paid, installInvoice: s.install?.invoice,
    takedownStatus: s.takedownStatus, takedownPrice: s.takedown?.rate, takedownPaid: s.takedown?.paid,
    addOn: s.addOn && clip(s.addOn, 200), schedulingNotes: s.schedulingNotes && clip(s.schedulingNotes, 300),
  })
}

// The short row (lists) or the full record (get_customer).
export function customerRow(id, c = {}, season, full = false) {
  const now = c.seasons?.[season] ?? {}
  const row = drop({
    id, name: c.fullName, address: c.address, city: c.city, neighborhood: c.neighborhood, phone: c.phone, email: c.email, since: c.since,
    installStatus: now.installStatus, planned: seasonRow(season, now).planned,
  })
  if (!full) return row
  return drop({
    ...row, installType: c.installType, lightColor: c.lightColor, originalPrice: c.originalRate, reinstallPrice: c.reinstallBase,
    seasons: Object.entries(c.seasons ?? {}).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([y, s]) => seasonRow(y, s)),
    notes: c.notes && clip(c.notes, 500), priceNotes: c.priceNotes && clip(c.priceNotes, 300),
  })
}

export function leadRow(id, l = {}) {
  return drop({
    id, name: `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(), city: l.city, status: l.status, created: dayOf(l.createdAt), prefers: l.contactMethod,
    request: clip(l.message, 200), customerId: l.customerId, sentDesign: l.designId ? true : undefined,
  })
}

// state, total and paid come from functions/invoices.js (index.js passes the
// helpers in). Never the PayPal reference: just how and when.
export function invoiceRow(token, inv = {}, state, totalCents, paid = null) {
  return drop({
    id: token, number: inv.number, state, customer: inv.customer?.name, customerId: inv.customerId, kind: inv.kind, season: inv.season,
    total: typeof totalCents === 'number' ? `$${(totalCents / 100).toFixed(2)}` : undefined, dueDate: inv.dueDate, sent: dayOf(inv.sentAt),
    paidOn: paid?.date, paidHow: paid?.method,
  })
}

export function routeRow(id, r = {}) {
  let t = (() => { const [h, m] = String(r.startTime || '08:00').split(':').map(Number); return h * 60 + (m || 0) })()
  const stops = (r.stops ?? []).slice(0, 40).map((s, i) => {
    t += Number(s.driveMin) || 0
    const eta = t
    if (s.status !== 'skipped') t += Number(s.minutes) || 0
    const h = Math.floor(eta / 60) % 24
    return drop({ order: i + 1, customerId: s.customerId, name: s.name, address: s.address, kind: s.kind, status: s.status, eta: `${((h + 11) % 12) + 1}:${String(Math.round(eta % 60)).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` })
  })
  return drop({ id, day: r.day, status: r.status ?? 'draft', startTime: r.startTime, installer: r.installer, miles: r.miles, stops })
}

export function messageRow(m = {}) {
  return drop({ date: dayOf(m.at), direction: m.direction === 'out' ? 'us' : 'them', kind: m.kind, subject: m.subject && clip(m.subject, 120), text: clip(m.text, 400), sentBy: m.sentBy })
}

// ---- Prompt --------------------------------------------------------------------

// Fixed for every call (cacheable): who we are, what the tools are for, hard rules.
export function askSystemPrompt(k) {
  return `You are the in-app assistant for the staff of ${k.business.name}, a family-owned Christmas light installation company in ${k.business.city} (since ${k.business.since}). Staff ask you questions about customers, website estimate requests (leads), invoices, routes, message history and whether the app is working. You answer from the database using the tools, in plain words, like a helpful office colleague.

## How we work (background, so you understand the records)
${k.highlights.map((h) => `- ${h}`).join('\n')}
- Every home is priced after we measure the roofline; prices on a record are what that customer was told. Installs start ${k.dates.installStart.month}/${k.dates.installStart.day}; installs done by ${k.dates.discountEnd.month}/${k.dates.discountEnd.day} get 10% off; from ${k.dates.bookingClose.month}/${k.dates.bookingClose.day} we book for next season.
- A season record per year: install status, planned date, install and takedown prices, paid or not, add-ons, scheduling notes.
- Invoices: draft → open (due) → paid; "overdue" means open and past its due date. Numbers look like CLC-2026-0001.
- Leads are website estimate requests with a status (new, called, estimate-sent, booked, lost, spam).
- Routes are a day's stops for an installer, in driving order.
- Messages are texts, calls, voicemails and emails between us and one person, synced from Google Voice and Gmail.

## Hard rules
1. Answer only from what the tools return. Never invent a record, number, date, price or policy. If a tool returns nothing, say so and suggest the Accounts search.
2. You are read-only. You cannot change anything, send anything, or do anything outside these tools. If asked to, say a staff member does that in the app (and where, if you know).
3. Start with a tool call whenever the question is about data. For a person, call find_customers first (then get_customer or get_messages with the id). Several matches: list them and ask which one.
4. Keep it short: lead with the answer, then the few facts that support it. Use a short list for several items. Dollar amounts and dates exactly as returned.
5. Never repeat gate codes, payment references or other people's contact details beyond what the question needs.
6. When the answer is about one customer or lead and a reply to them would be the natural next step, set draftFor so staff can ask for a draft.
7. If you had to stop before you were sure (tool limit reached), say the answer may be incomplete.

## Output
Answer with JSON only:
- answer: your answer for the staff member (plain text; short paragraphs, "- " for list items, no markdown headings).
- records: the records you used, each { type: ${RECORD_TYPES.map((t) => `"${t}"`).join(' | ')}, id, label } (label = name, invoice number, or route day). Only ids the tools returned. Empty list if none.
- draftFor: { "customerId": id } or { "leadId": id } when a reply to that one person is the natural next step; otherwise null.`
}

export const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    records: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: RECORD_TYPES }, id: { type: 'string' }, label: { type: 'string' } }, required: ['type', 'id', 'label'], additionalProperties: false } },
    draftFor: { anyOf: [{ type: 'null' }, { type: 'object', properties: { customerId: { type: 'string' } }, required: ['customerId'], additionalProperties: false }, { type: 'object', properties: { leadId: { type: 'string' } }, required: ['leadId'], additionalProperties: false }] },
  },
  required: ['answer', 'records', 'draftFor'],
  additionalProperties: false,
}

// The first user turn: today, then the conversation so far, then the question.
export function askMessages({ today, season, history, question }) {
  const lead = `Today: ${today} (Central). Season: ${season}.`
  const msgs = []
  for (const [i, t] of history.entries()) msgs.push({ role: t.role, content: i === 0 && t.role === 'user' ? `${lead}\n\n${t.text}` : t.text })
  const first = msgs.length === 0 || msgs[0].role !== 'user'
  msgs.push({ role: 'user', content: first ? `${lead}\n\n${question}` : question })
  // The API wants the first message from the user and roles to alternate.
  if (msgs[0].role !== 'user') msgs.shift()
  return msgs.filter((m, i) => i === 0 || m.role !== msgs[i - 1].role)
}

// The model's final text -> { answer, records, draftFor } or { problem }.
export function parseAnswer(raw) {
  let o = raw
  if (typeof raw === 'string') {
    try { o = JSON.parse(raw) } catch { return { problem: 'The assistant answered in a shape we could not read.' } }
  }
  if (!o || typeof o !== 'object') return { problem: 'The assistant gave an empty answer.' }
  const answer = String(o.answer ?? '').replace(/[ \t]+\n/g, '\n').trim().slice(0, MAX_ANSWER_CHARS)
  if (!answer) return { problem: 'The assistant gave no answer.' }
  const seen = new Set()
  const records = (Array.isArray(o.records) ? o.records : []).filter((r) => r && RECORD_TYPES.includes(r.type) && typeof r.id === 'string' && ID_RE.test(r.id))
    .map((r) => ({ type: r.type, id: r.id, label: clip(r.label, 80) || r.id }))
    .filter((r) => { const k = `${r.type}:${r.id}`; if (seen.has(k)) return false; seen.add(k); return true })
    .slice(0, MAX_RECORDS)
  const d = o.draftFor
  const draftFor = d && typeof d === 'object'
    ? typeof d.customerId === 'string' && ID_RE.test(d.customerId) ? { customerId: d.customerId } : typeof d.leadId === 'string' && ID_RE.test(d.leadId) ? { leadId: d.leadId } : null
    : null
  return { answer, records, draftFor }
}

// What staff get when the model declined or something broke.
export const fallbackAnswer = (why = '') => ({
  answer: `I couldn’t answer that one${why ? ` (${why})` : ''}. Try asking it another way, or look it up in Accounts.`, records: [], draftFor: null,
})

// Re-exported so the browser can label a hand-off the same way Suggest a reply does.
export { NEXT_ACTIONS }
