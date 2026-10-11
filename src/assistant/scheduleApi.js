// Asks the server (proposeSchedule in functions/index.js,
// docs/specs/schedule-assistant.md) for an install day plan. The browser
// sends only the date range and the customer ids; the server gathers the
// records itself. In demo mode (/leads/?demo) a canned plan comes back so the
// panel can be checked without a key. A re-plan adds the plan as it stands
// and one staff instruction; the server returns the revised plan.
import { getFirebaseApp } from '../lib/firebase'
import { demoMode } from '../leads/demo'
import { dayList, weekdayOf } from '../../functions/assistant/schedulePrompt.js'

export async function proposeSchedule({ from, to, customerIds, instruction, current }, customers = []) {
  if (demoMode) return instruction && current ? demoReplan({ from, to, customerIds, instruction, current }, customers) : demoPlan({ from, to, customerIds }, customers)
  const [{ getFunctions, httpsCallable }, app] = await Promise.all([import('firebase/functions'), getFirebaseApp()])
  try {
    const call = httpsCallable(getFunctions(app, 'us-south1'), 'proposeSchedule', { timeout: 180_000 })
    return (await call(instruction && current ? { from, to, customerIds, instruction, current } : { from, to, customerIds })).data
  } catch (err) {
    const said = /\s/.test(err.message ?? '') ? err.message : ''
    throw new Error(said || 'Couldn’t reach the assistant. Check your connection and try again.', { cause: err })
  }
}

const demoDays = (from, to) => dayList({ from, to, booked: new Map([[from, 1]]), capacityOf: (day) => (weekdayOf(day) === 'Sunday' ? 0 : 2) })
const demoCustomer = (c) => ({ id: c.id, name: c.fullName, area: c.locationBlock ?? c.neighborhood ?? '', installType: c.installType === 'Early Install' ? 'early' : c.installType === 'Regular Install' ? 'regular' : 'not set', wish: c.seasons?.[2026]?.timeframe ?? '' })

// The sample re-plan moves the first placed person to the next open day and says so.
async function demoReplan({ from, to, customerIds, instruction, current }, customers) {
  await new Promise((r) => setTimeout(r, 1200))
  const days = demoDays(from, to)
  const picked = customers.filter((c) => customerIds.includes(c.id))
  const name = (id) => picked.find((c) => c.id === id)?.fullName ?? id
  const first = current.assignments[0]
  const next = first ? days.find((d) => d.day > first.day && d.open > 0) : null
  const assignments = current.assignments.map((a, i) => ({ ...a, reason: i === 0 && next ? `Moved as you asked: "${instruction}".` : 'Kept where it was.' }))
  if (first && next) assignments[0].day = next.day
  return {
    explanation: first && next
      ? `Changed: ${name(first.customerId)} moves from ${first.day} to ${next.day} because you said "${instruction}". Everyone else stays put. (Sample re-plan; with Firebase connected, Claude reads the note and the real capacity.)`
      : `Nothing to change for "${instruction}" in this sample. With Firebase connected, Claude reads the note and the real capacity.`,
    assignments, unplaced: current.unplaced.map((customerId) => ({ customerId, reason: 'Still not placed.' })), days,
    customers: picked.map(demoCustomer), deadline: '10-31', model: 'demo', cost: 0,
  }
}

async function demoPlan({ from, to, customerIds }, customers) {
  await new Promise((r) => setTimeout(r, 1200))
  const days = demoDays(from, to)
  const open = days.filter((d) => d.open > 0)
  const picked = customers.filter((c) => customerIds.includes(c.id))
  const assignments = []
  const unplaced = []
  picked.forEach((c, i) => {
    const d = open[Math.min(i, open.length - 1)]
    if (!d) unplaced.push({ customerId: c.id, reason: 'No open day in the range.' })
    else assignments.push({ customerId: c.id, day: d.day, reason: i === 0 ? `Early install, before the Oct 31 deadline; asked for "${c.seasons?.[2026]?.timeframe ?? 'any day'}" so the first open weekday in ${c.locationBlock?.split(' - ')[0] ?? 'their area'}.` : 'Grouped with the nearest block on the next open day.' })
  })
  return {
    explanation: `Sample plan: ${assignments.length} placed on the first open days, early installs first, with the day already holding one booked install left with room. Days with 0 open are skipped. With Firebase connected, Claude reads each person’s notes and messages and the real capacity.`,
    assignments, unplaced, days,
    customers: picked.map(demoCustomer),
    deadline: '10-31', model: 'demo', cost: 0,
  }
}
