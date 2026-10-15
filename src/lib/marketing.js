// The Marketing section's arithmetic (src/data/marketingPlan.js for the plan,
// settings/app.marketing for progress). Pure, tested in tests/marketing.test.mjs.
// done: { [taskId]: { by: email, at: ms } }; days are 'YYYY-MM-DD' in Central time.

// The week holding `day`; before the plan, the first week; after it, the last.
export function weekIndexFor(weeks, day) {
  if (!weeks.length) return -1
  if (day < weeks[0].from) return 0
  const i = weeks.findIndex((w) => day >= w.from && day <= w.to)
  return i >= 0 ? i : weeks.length - 1
}

export function phaseFor(phases, day) {
  return phases.find((p) => day >= p.from && day <= p.to) ?? (day < (phases[0]?.from ?? '') ? phases[0] : phases.at(-1)) ?? null
}

export const isDone = (done, id) => Boolean(done?.[id])

// { done, total } for a list of tasks.
export function progress(tasks, done) {
  return { done: tasks.filter((t) => isDone(done, t.id)).length, total: tasks.length }
}

// Tasks from weeks already over that nobody ticked (Claude's are left out: they wait to be asked).
export function missed(weeks, done, day) {
  return weeks.filter((w) => w.to < day).flatMap((w) => w.tasks.filter((t) => t.who !== 'claude' && !isDone(done, t.id)).map((t) => ({ ...t, week: w })))
}

// "Oct 12–18", "Dec 28–Jan 3": a week's dates in words.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parts = (day) => { const [, m, d] = day.split('-').map(Number); return [MONTHS[m - 1], d] }
export function weekLabel(week) {
  const [m1, d1] = parts(week.from)
  const [m2, d2] = parts(week.to)
  return m1 === m2 ? `${m1} ${d1}–${d2}` : `${m1} ${d1}–${m2} ${d2}`
}

// What gets written when someone ticks or unticks: a path for mergePaths (null deletes).
export const tickPath = (id) => `marketing.done.${id}`
export const tickedBy = (email, now = Date.now()) => ({ by: email, at: now })
export const logPath = (weekId, field) => `marketing.log.${weekId}.${field}`
