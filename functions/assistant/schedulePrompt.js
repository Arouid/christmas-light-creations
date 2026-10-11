// "Plan with Claude" (docs/specs/schedule-assistant.md): the pure parts.
// Who needs a day, the days and their room, what the model sees, what it
// must answer, and the checks on its answer. Shared with the staff app
// (src/assistant/PlanSchedule.jsx imports the helpers that adjust and apply
// a plan), so nothing in here touches Firestore or the network.
// No imports from the rest of functions/ (index.js passes what it owns).
import { PRICE } from './prompt.js'

export const MODEL = 'claude-opus-5-5' // owner (2026-10-10): quality over cost
export const MAX_OUTPUT_TOKENS = 6000
export const MAX_CUSTOMERS = 60 // per plan (cost and context cap)
export const MAX_RANGE_DAYS = 42
export const MAX_MESSAGES = 5 // last incoming messages per customer sent to the model
export const MAX_MESSAGE_CHARS = 300
export const MAX_REASON_CHARS = 200
export const MAX_EXPLANATION_CHARS = 1200
export const MAX_INSTRUCTION_CHARS = 500 // one staff note per re-plan
export const DAILY_LIMIT = 20 // plans a day, all staff together
export const MIN_GAP_MS = 5000 // per staff member
export const SEASON_BOUNDS = { start: '10-15', close: '12-15' } // same as functions/availability.js SEASON
export const DEFAULT_RANGE_DAYS = 14

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const bad = (msg) => ({ problem: ['invalid-argument', msg] })

// ---- Dates (UTC noon, so no DST surprises) -----------------------------------------

const at = (day) => new Date(`${day}T12:00:00Z`)
export const addDays = (day, n) => { const d = at(day); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const weekdayOf = (day) => WEEKDAYS[at(day).getUTCDay()]
export const monthDayOf = (day) => `${MONTHS[at(day).getUTCMonth()]} ${at(day).getUTCDate()}` // "Oct 15"
export const daysBetween = (from, to) => Math.round((at(to) - at(from)) / 86400000)

// The sheet's "Week of": Sunday to Saturday, "Oct 11-17" or "Nov 29-Dec 5".
export function weekOfFor(day) {
  const sun = addDays(day, -at(day).getUTCDay())
  const sat = addDays(sun, 6)
  const [m1, d1] = monthDayOf(sun).split(' ')
  const [m2, d2] = monthDayOf(sat).split(' ')
  return m1 === m2 ? `${m1} ${d1}-${d2}` : `${m1} ${d1}-${m2} ${d2}`
}

// Default range: tomorrow (or the season start) for two weeks, within the season.
export function defaultRange(today, season, bounds = SEASON_BOUNDS) {
  const start = `${season}-${bounds.start}`
  const close = `${season}-${bounds.close}`
  let from = addDays(today, 1)
  if (from < start) from = start
  let to = addDays(from, DEFAULT_RANGE_DAYS - 1)
  if (to > close) to = close
  return { from, to }
}

// ---- Who needs a day ------------------------------------------------------------

const SKIP_STATUS = new Set(['Not Servicing', 'Off Scheduler', 'Install Completed'])

// Confirmed this season, nothing planned yet, still being serviced.
export function unscheduled(customers = [], season) {
  return customers.filter((c) => {
    const s = c.seasons?.[season] ?? {}
    if (s.firstContact !== 'Confirmed') return false
    if (s.plannedDate || s.weekOf) return false
    return !SKIP_STATUS.has(s.installStatus ?? '')
  })
}

// ---- Request and gate --------------------------------------------------------------

export function scheduleRequest(data, { season, bounds = SEASON_BOUNDS } = {}) {
  if (!data || typeof data !== 'object') return bad('Pick a date range')
  const { from, to } = data
  if (!DAY_RE.test(String(from)) || !DAY_RE.test(String(to)) || Number.isNaN(at(from).getTime()) || Number.isNaN(at(to).getTime())) return bad('Pick a start and end date')
  if (to < from) return bad('The end date is before the start')
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) return bad(`Keep the range under ${MAX_RANGE_DAYS} days`)
  if (season) {
    if (from < `${season}-${bounds.start}` || to > `${season}-${bounds.close}`) return bad(`Installs run ${monthDayOf(`${season}-${bounds.start}`)} to ${monthDayOf(`${season}-${bounds.close}`)}`)
  }
  const ids = Array.isArray(data.customerIds) ? data.customerIds : null
  if (!ids || !ids.length) return bad('Pick at least one person')
  if (ids.length > MAX_CUSTOMERS) return bad(`At most ${MAX_CUSTOMERS} people per plan: narrow the area or the range`)
  if (!ids.every((id) => typeof id === 'string' && id && id.length <= 200)) return bad('Someone on the list can’t be read')
  const out = { from, to, customerIds: [...new Set(ids)] }
  // A re-plan: the plan as it stands (with staff's own moves) and what to change.
  if (data.instruction !== undefined && data.instruction !== null && data.instruction !== '') {
    if (typeof data.instruction !== 'string') return bad('The change must be text')
    const instruction = data.instruction.replace(/\s+/g, ' ').trim()
    if (instruction.length > MAX_INSTRUCTION_CHARS) return bad(`Keep the change under ${MAX_INSTRUCTION_CHARS} characters`)
    if (instruction) out.instruction = instruction
  }
  if (data.current !== undefined && data.current !== null) {
    const cur = data.current
    if (!cur || typeof cur !== 'object' || !Array.isArray(cur.assignments) || !Array.isArray(cur.unplaced)) return bad('The current plan can’t be read')
    const known = new Set(out.customerIds)
    const seen = new Set()
    const assignments = []
    for (const a of cur.assignments) {
      if (!a || typeof a !== 'object' || typeof a.customerId !== 'string' || !DAY_RE.test(String(a.day))) return bad('The current plan can’t be read')
      if (!known.has(a.customerId) || seen.has(a.customerId)) continue
      if (a.day < from || a.day > to) continue
      seen.add(a.customerId)
      assignments.push({ customerId: a.customerId, day: a.day })
    }
    const unplaced = []
    for (const id of cur.unplaced) {
      if (typeof id !== 'string' || !known.has(id) || seen.has(id)) continue
      seen.add(id)
      unplaced.push(id)
    }
    out.current = { assignments, unplaced }
  }
  return out
}

export function scheduleAllowed(state, staff, now, day) {
  const today = state?.day === day
  const count = today ? Number(state.count) || 0 : 0
  if (count >= DAILY_LIMIT) return { problem: ['resource-exhausted', `That's ${DAILY_LIMIT} plans today, the daily limit. Try again tomorrow.`] }
  const last = today ? state.last ?? {} : {}
  if (now - (Number(last[staff]) || 0) < MIN_GAP_MS) return { problem: ['resource-exhausted', 'One plan at a time: wait a moment, then try again.'] }
  return { next: { day, count: count + 1, last: { ...last, [staff]: now } } }
}

// ---- Days and their room ---------------------------------------------------------

// Every day from `from` to `to`: weekday, capacity (from capacityOf(day)) and booked
// count (booked: Map day → count, as functions/availability.js bookedByDay gives).
export function dayList({ from, to, booked = new Map(), capacityOf = () => 0 }) {
  const out = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const capacity = Math.max(0, Number(capacityOf(day)) || 0)
    const b = booked.get(day) ?? 0
    out.push({ day, weekday: weekdayOf(day), capacity, booked: b, open: Math.max(0, capacity - b) })
  }
  return out
}

// The early-install deadline: the last day of the schedule's early rows ("10-31"), or null.
export function deadlineOf(schedule) {
  const rows = (Array.isArray(schedule) ? schedule : []).filter((r) => r && typeof r.to === 'string' && /^\d{2}-\d{2}$/.test(r.to) && Number(r.pct) > 0)
  return rows.length ? rows.map((r) => r.to).sort().at(-1) : null
}

// ---- What the model sees ----------------------------------------------------------

// Timing wishes from their recent incoming messages (newest first, this year only).
export function wishesFrom(messages = [], season) {
  return messages
    .filter((m) => m.direction !== 'out' && m.text && String(m.at ?? '').startsWith(String(season)))
    .sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')))
    .slice(0, MAX_MESSAGES)
    .map((m) => `${String(m.at ?? '').slice(0, 10)} (${m.kind ?? 'text'}): ${clip(m.text, MAX_MESSAGE_CHARS)}`)
}

// One customer as the model sees it. No gate code, phone or email.
export function customerRow(id, c = {}, season, messages = []) {
  const s = c.seasons?.[season] ?? {}
  const row = {
    id,
    name: clip(c.fullName, 80),
    address: clip([c.address, c.city].filter(Boolean).join(', '), 160),
    neighborhood: clip(c.neighborhood, 60) || undefined,
    block: clip(c.locationBlock, 60) || undefined,
    installType: c.installType === 'Early Install' ? 'early' : c.installType === 'Regular Install' ? 'regular' : 'not set',
    status: clip(s.installStatus, 60) || undefined,
    timeframe: clip(s.timeframe, 120) || undefined,
    notes: clip(s.schedulingNotes, 400) || undefined,
    messages: wishesFrom(messages, season),
  }
  if (!row.messages.length) delete row.messages
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined))
}

// The browser's view of the same person (shown in the panel).
export const panelCustomer = (row) => ({ id: row.id, name: row.name, area: row.block ?? row.neighborhood ?? '', installType: row.installType, wish: [row.timeframe, row.notes].filter(Boolean).join(' · ').slice(0, 160) })

export const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    explanation: { type: 'string', description: 'One paragraph for the office: how the days were filled and what to watch.' },
    assignments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          customerId: { type: 'string' },
          day: { type: 'string', description: 'YYYY-MM-DD, one of the days given' },
          reason: { type: 'string', description: 'One short line: why this day (their wish, area grouping, early deadline).' },
        },
        required: ['customerId', 'day', 'reason'],
        additionalProperties: false,
      },
    },
    unplaced: {
      type: 'array',
      items: {
        type: 'object',
        properties: { customerId: { type: 'string' }, reason: { type: 'string' } },
        required: ['customerId', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['explanation', 'assignments', 'unplaced'],
  additionalProperties: false,
}

// Fixed for every plan (cacheable).
export function scheduleSystemPrompt() {
  return [
    'You plan install days for a Christmas light installation company in Pearland, Texas. The office gives you the customers who still need an install day, the days available with how many installs each can still take, and the early-install discount deadline. You answer with a day for each customer, or say why they could not be placed.',
    '',
    'Rules, in order of importance:',
    '1. Honor what the customer asked for: their timeframe, scheduling notes and timing wishes in their messages ("not before the 20th", "any weekday", "we are away Nov 3-10"). If their wish falls outside the days given, do not place them; say what they asked for.',
    '2. Early-install customers go on or before the discount deadline when any room is left there; if none is left, place them on the first open day after it and say so in the reason.',
    '3. Never put more installs on a day than its open count. Count carefully: open is capacity minus what is already booked.',
    '4. Group by area: people in the same block or neighborhood on the same day, and nearby blocks on adjacent days, so the crew drives less.',
    '5. Earlier is better than later when nothing else decides it; fill the days in order and leave the last days for late confirmations.',
    '6. A customer with no address or an address outside the area still gets a day if they asked for one; mention the gap in the reason.',
    '',
    'Every customer in the input appears exactly once, in assignments or in unplaced. Use the ids and days exactly as given. Reasons are one short line in plain words for the office, never for the customer. The explanation is one paragraph: how you filled the days, which days are full, and who to call.',
    '',
    'When the office sends a CURRENT PLAN and a STAFF INSTRUCTION, you are revising, not starting over. The instruction wins over your own preferences and over rules 2, 4 and 5 (never over rule 3: if it cannot fit, say so in that person’s reason and keep them where they were). Keep every other person exactly where they are unless the instruction forces a change (for example, making room on a day). Start the explanation with what you changed and why, person by person, then anything the office should know.',
  ].join('\n')
}

export function schedulePrompt({ today, season, deadline, days, rows, current, instruction }) {
  const dayLines = days.map((d) => `${d.day} ${d.weekday}: ${d.open} open (capacity ${d.capacity}, ${d.booked} booked)`)
  const lines = [
    `Today: ${today}. Season: ${season}. Early-install discount deadline: ${deadline ? `${season}-${deadline}` : 'none'}.`,
    '',
    'DAYS (only these; "0 open" means full):',
    ...dayLines,
    '',
    `CUSTOMERS TO PLACE (${rows.length}):`,
    JSON.stringify(rows, null, 1),
  ]
  if (current && instruction) {
    const name = (id) => rows.find((r) => r.id === id)?.name ?? id
    lines.push('', 'CURRENT PLAN (keep it unless the instruction forces a change):',
      ...current.assignments.map((a) => `${a.day}: ${name(a.customerId)} (${a.customerId})`),
      ...current.unplaced.map((id) => `not placed: ${name(id)} (${id})`),
      '', 'STAFF INSTRUCTION (from the office, follow it):', instruction)
  }
  return lines.join('\n')
}

// ---- Checking the answer -----------------------------------------------------------

// Turns the model's JSON into a checked plan: unknown ids and days dropped,
// over-capacity and out-of-range entries moved to unplaced with a reason,
// everyone accounted for once. `days` from dayList(), `ids` the customers sent.
export function parseProposal(raw, { days, ids }) {
  let data
  try { data = JSON.parse(String(raw ?? '')) } catch { return { problem: 'The plan came back unreadable.' } }
  if (!data || typeof data !== 'object') return { problem: 'The plan came back unreadable.' }
  const known = new Set(ids)
  const byDay = new Map(days.map((d) => [d.day, { ...d, used: 0 }]))
  const seen = new Set()
  const assignments = []
  const unplaced = []
  for (const a of Array.isArray(data.assignments) ? data.assignments : []) {
    const id = String(a?.customerId ?? '')
    if (!known.has(id) || seen.has(id)) continue
    seen.add(id)
    const reason = clip(a.reason, MAX_REASON_CHARS)
    const d = byDay.get(String(a.day ?? ''))
    if (!d) { unplaced.push({ customerId: id, reason: `Proposed a day outside the range (${clip(a.day, 20) || 'none'}).` }); continue }
    if (d.used >= d.open) { unplaced.push({ customerId: id, reason: `Over capacity on ${monthDayOf(d.day)}: ${reason || 'no room left that day'}` }); continue }
    d.used++
    assignments.push({ customerId: id, day: d.day, reason })
  }
  for (const u of Array.isArray(data.unplaced) ? data.unplaced : []) {
    const id = String(u?.customerId ?? '')
    if (!known.has(id) || seen.has(id)) continue
    seen.add(id)
    unplaced.push({ customerId: id, reason: clip(u.reason, MAX_REASON_CHARS) || 'No reason given.' })
  }
  for (const id of ids) if (!seen.has(id)) unplaced.push({ customerId: id, reason: 'Claude left them out of the plan.' })
  const explanation = clip(data.explanation, MAX_EXPLANATION_CHARS) || 'No explanation came back.'
  return { explanation, assignments, unplaced }
}

export const fallbackProposal = (ids, why = 'Claude couldn’t make this plan.') => ({ explanation: `${why} Nothing was applied; try again or plan by hand in the Season tab.`, assignments: [], unplaced: ids.map((customerId) => ({ customerId, reason: 'No plan was made.' })) })

export function costOf(usage = {}) {
  const n = (k) => Number(usage[k]) || 0
  return (n('input_tokens') * PRICE.input + n('output_tokens') * PRICE.output + n('cache_read_input_tokens') * PRICE.cacheRead + n('cache_creation_input_tokens') * PRICE.cacheWrite) / 1e6
}

// ---- Adjusting and applying (used by the panel) -------------------------------------

// What a re-plan changed: one entry per person whose day differs
// ({ from: day | null, to: day | null }; null = not placed).
export function diffPlans(prev, next) {
  const dayIn = (plan) => new Map((plan?.assignments ?? []).map((a) => [a.customerId, a.day]))
  const before = dayIn(prev)
  const after = dayIn(next)
  const ids = new Set([...before.keys(), ...after.keys(), ...(prev?.unplaced ?? []).map((u) => u.customerId), ...(next?.unplaced ?? []).map((u) => u.customerId)])
  const out = []
  for (const id of ids) {
    const from = before.get(id) ?? null
    const to = after.get(id) ?? null
    if (from !== to) out.push({ customerId: id, from, to })
  }
  return out
}

// The plan as the server wants it back for a re-plan (ids and days only).
export const currentOf = (plan) => ({ assignments: plan.assignments.map((a) => ({ customerId: a.customerId, day: a.day })), unplaced: plan.unplaced.map((u) => u.customerId) })

// Per day: booked + proposed, and whether it is over capacity.
export function dayLoads(assignments = [], days = []) {
  const count = new Map()
  for (const a of assignments) count.set(a.day, (count.get(a.day) ?? 0) + 1)
  return days.map((d) => {
    const proposed = count.get(d.day) ?? 0
    return { ...d, proposed, total: d.booked + proposed, over: d.booked + proposed > d.capacity }
  })
}

// Move one person to another day (adds them if they were unplaced).
export function moveTo(plan, customerId, day, reason = 'Moved by staff') {
  const kept = plan.assignments.filter((a) => a.customerId !== customerId)
  const prev = plan.assignments.find((a) => a.customerId === customerId)
  return {
    ...plan,
    assignments: [...kept, { customerId, day, reason: prev ? prev.reason : reason }],
    unplaced: plan.unplaced.filter((u) => u.customerId !== customerId),
  }
}

// Take one person out of the plan (they stay unscheduled).
export function dropFrom(plan, customerId) {
  if (!plan.assignments.some((a) => a.customerId === customerId)) return plan
  return {
    ...plan,
    assignments: plan.assignments.filter((a) => a.customerId !== customerId),
    unplaced: [...plan.unplaced, { customerId, reason: 'Dropped by staff' }],
  }
}

// The field writes Apply makes, in the sheet's style, one entry per customer.
export function writesFor(assignments = [], season, { setStatus = true } = {}) {
  return assignments.map((a) => {
    const fields = { plannedDate: monthDayOf(a.day), day: weekdayOf(a.day), weekOf: weekOfFor(a.day) }
    if (setStatus) fields.installStatus = 'Install Scheduled'
    return { customerId: a.customerId, day: a.day, fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [`seasons.${season}.${k}`, v])) }
  })
}
