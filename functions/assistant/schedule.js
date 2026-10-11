// "Plan with Claude": gathers what the plan needs from Firestore and asks
// Claude for one checked day plan. index.js only registers the callable and
// hands in what it owns (the database, the key, the model, today's date, the
// availability helpers). No imports from the rest of functions/.
// Spec: docs/specs/schedule-assistant.md.
import Anthropic from '@anthropic-ai/sdk'
import {
  MAX_OUTPUT_TOKENS, MODEL, PROPOSAL_SCHEMA, costOf, customerRow, dayList, deadlineOf, fallbackProposal, panelCustomer, parseProposal,
  schedulePrompt, scheduleSystemPrompt,
} from './schedulePrompt.js'

export class ScheduleError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

const docsOf = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))
const isoOf = (at) => (at?.toDate ? at.toDate().toISOString() : String(at ?? ''))

// Everything the prompt needs: { rows, days, deadline, customers } or null when none of the ids exist.
// helpers: { bookedByDay, capacity } from functions/availability.js.
export async function gatherSchedule(db, { season, from, to, customerIds }, helpers) {
  const [custSnap, settingsSnap, routeSnap] = await Promise.all([
    db.collection('customers').limit(2000).get(),
    db.doc('settings/app').get(),
    db.collection('routes').where('day', '>=', from).where('day', '<=', to).limit(200).get(),
  ])
  const all = docsOf(custSnap)
  const settings = settingsSnap.data() ?? {}
  const wanted = all.filter((c) => customerIds.includes(c.id))
  if (!wanted.length) return null

  const threads = await Promise.all(wanted.map((c) => db.collection('messages').where('customerId', '==', c.id).limit(100).get().then(docsOf).catch(() => [])))
  const rows = wanted.map((c, i) => customerRow(c.id, c, season, threads[i].map((m) => ({ ...m, at: isoOf(m.at) }))))

  // Booked days: everyone's planned date this season plus route stops. The people
  // being planned have no date, so they never count against themselves.
  const booked = helpers.bookedByDay({ customers: all, routes: docsOf(routeSnap), season })
  const days = dayList({ from, to, booked, capacityOf: (day) => helpers.capacity(day, settings.availability ?? {}) })
  const deadline = deadlineOf(settings.discountSchedule) ?? '10-31'
  return { rows, days, deadline, customers: rows.map(panelCustomer) }
}

// One plan. Returns { plan, usage, cost, model }. Throws ScheduleError for
// things the staff member should hear about; `onKeyRefused` is called once before that.
export async function proposeFor({ apiKey, model = MODEL, input, today, season, current, instruction, log, onKeyRefused }) {
  const ids = input.rows.map((r) => r.id)
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 150_000 })
  let res
  try {
    res = await client.messages.create({
      model: model || MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [{ type: 'text', text: scheduleSystemPrompt(), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: schedulePrompt({ today, season, deadline: input.deadline, days: input.days, rows: input.rows, current, instruction }) }],
      output_config: { effort: 'high', format: { type: 'json_schema', schema: PROPOSAL_SCHEMA } },
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      await onKeyRefused?.()
      throw new ScheduleError('failed-precondition', 'The assistant isn’t set up yet (its API key was refused). Plan by hand in the Season tab for now.')
    }
    if (e instanceof Anthropic.RateLimitError) throw new ScheduleError('resource-exhausted', 'The assistant is busy right now. Try again in a minute.')
    log?.error?.('proposeSchedule failed', { status: e.status ?? null, message: e.message })
    throw new ScheduleError('unavailable', 'The assistant didn’t answer. Try again in a minute.')
  }
  const usage = res.usage ?? {}
  let plan
  if (res.stop_reason === 'refusal') {
    log?.warn?.('proposeSchedule refused', { category: res.stop_details?.category ?? null })
    plan = fallbackProposal(ids)
  } else {
    const parsed = parseProposal(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), { days: input.days, ids, removed: current?.removed ?? [] })
    plan = parsed.problem ? fallbackProposal(ids, parsed.problem) : parsed
  }
  const cost = Number(costOf(usage).toFixed(4))
  log?.info?.('proposeSchedule', { replan: Boolean(current), removed: current?.removed?.length ?? 0, people: ids.length, days: input.days.length, placed: plan.assignments.length, unplaced: plan.unplaced.length,
    input: usage.input_tokens ?? 0, output: usage.output_tokens ?? 0, cacheRead: usage.cache_read_input_tokens ?? 0, cacheWrite: usage.cache_creation_input_tokens ?? 0, cost })
  return { plan, usage, cost, model: model || MODEL }
}
