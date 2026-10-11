// Scheduled email ("Send later", docs/specs/scheduled-email.md): schedule,
// edit and cancel through the server (scheduleStaffEmail in
// functions/index.js, which does the same checks as Send), and the live lists
// of waiting ones (staff can only read scheduledEmails). In demo mode the
// sample data changes instead and nothing is ever sent.
import { MAX_LIST, centralParts, msOf, sendAtProblem, whenText } from '../../functions/scheduleTime.js'
import { getFirebaseApp } from '../lib/firebase'
import { demoMode } from './demo'
import { activityTarget } from './sendEmail'
import { logActivity } from './activity'
import { saveRecord, useLiveQuery } from './staffStore'

async function call(data) {
  const [{ getFunctions, httpsCallable }, app] = await Promise.all([import('firebase/functions'), getFirebaseApp()])
  try {
    return (await httpsCallable(getFunctions(app, 'us-south1'), 'scheduleStaffEmail')(data)).data
  } catch (err) {
    // Our server's refusals carry a sentence; anything else is just a code word.
    const said = /\s/.test(err.message ?? '') ? err.message : ''
    throw new Error(said || 'Couldn’t reach the server. Check your connection and try again.', { cause: err })
  }
}

// emails: [{ to, subject, text, template, target: { customerId } | { leadId } | { pastRequestId },
// mark?: { season, field }, name }]. A list longer than MAX_LIST goes in parts
// (same `batch`); if a later part is refused, the error says how many are
// already scheduled. -> { ids }
export async function scheduleEmails(user, { emails, sendAt, batch = '' }) {
  const ids = []
  for (let i = 0; i < emails.length; i += MAX_LIST) {
    const part = emails.slice(i, i + MAX_LIST).map(({ to, subject, text, template, target, mark }) => ({ to, subject, text, template, ...target, ...(mark ? { mark } : {}) }))
    try {
      const result = demoMode ? await demoSchedule(user, emails.slice(i, i + MAX_LIST), sendAt, batch) : await call({ action: 'schedule', sendAt, batch, emails: part })
      ids.push(...result.ids)
    } catch (err) {
      if (!ids.length) throw err
      throw new Error(`${ids.length} scheduled; the rest weren’t: ${err.message}`, { cause: err })
    }
  }
  if (emails.length === 1 && !batch) {
    const [e] = emails
    const t = activityTarget(e.target)
    logActivity('email-scheduled', t && { ...t, name: e.name }, `${e.subject} · ${whenText(sendAt)}`)
  }
  return { ids }
}

export async function editScheduled(user, item, { sendAt, subject, text }) {
  if (demoMode) {
    await pause()
    demoCheck(sendAt, [{ subject, text }])
    return saveRecord(user, 'scheduledEmails', item.id, { sendAt, subject: subject.trim(), text: text.trimEnd(), status: 'scheduled', open: true, error: '' })
  }
  return call({ action: 'edit', id: item.id, sendAt, subject, text })
}

// -> { cancelled, tooLate }
export async function cancelScheduled(user, items) {
  if (demoMode) {
    await pause()
    let cancelled = 0
    for (const x of items) {
      if (!['scheduled', 'failed'].includes(x.status)) continue
      await saveRecord(user, 'scheduledEmails', x.id, { status: 'cancelled', open: false, cancelledBy: user?.email ?? 'demo@example.com' })
      cancelled++
    }
    return { cancelled, tooLate: items.length - cancelled }
  }
  return call({ action: 'cancel', ids: items.map((x) => x.id) })
}

const pause = () => new Promise((r) => setTimeout(r, 500))

// Demo only: the time rule and empty fields (the server does the full Send checks).
function demoCheck(sendAt, emails) {
  const when = sendAtProblem(sendAt)
  if (when) throw new Error(when)
  if (emails.some((e) => !e.subject?.trim() || !e.text?.trim())) throw new Error('Add a subject and a message')
}

async function demoSchedule(user, emails, sendAt, batch) {
  await pause()
  demoCheck(sendAt, emails)
  const ids = []
  for (const [i, e] of emails.entries()) {
    const id = `demo-sched-${Date.now()}-${i}`
    const [field, targetId] = Object.entries(e.target)[0]
    await saveRecord(user, 'scheduledEmails', id, {
      status: 'scheduled', open: true, sendAt, to: e.to.trim().toLowerCase(), subject: e.subject.trim(), text: e.text.trimEnd(), template: e.template ?? '',
      target: { field, id: targetId }, ...e.target, name: e.name ?? '', by: user?.email ?? 'demo@example.com',
      at: Date.now(), ...(batch ? { batch } : {}), ...(e.mark ? { mark: e.mark } : {}),
    })
    ids.push(id)
  }
  return { ids }
}

// ---- Live lists ----------------------------------------------------------------

const bySendAt = (a, b) => msOf(a.sendAt) - msOf(b.sendAt)

// Everything waiting, going or that didn't go (open), soonest first. [] when
// the rules aren't published yet (refused), null while loading.
export const useScheduledEmails = (user) => useLiveQuery(user, 'scheduledEmails', 'open', true, bySendAt)

// One person's open ones (field: customerId | leadId | pastRequestId).
export function useScheduledFor(user, field, value) {
  const items = useLiveQuery(user, 'scheduledEmails', field, value, bySendAt)
  return (items ?? []).filter((x) => x.open)
}

// "customerId:pat-sample:reinstall" for each waiting one: lists skip people
// who already have that template scheduled.
export const waitingKeys = (items) => new Set((items ?? [])
  .filter((x) => x.status === 'scheduled' || x.status === 'sending')
  .map((x) => `${x.target?.field}:${x.target?.id}:${x.template}`))

export const targetKey = (target, template) => {
  const [field, id] = Object.entries(target ?? {})[0] ?? []
  return `${field}:${id}:${template}`
}

// Where the name links to (the person's account).
export function accountLink(x) {
  const id = encodeURIComponent(x.target?.id ?? '')
  return { customerId: `#accounts/customer/${id}`, leadId: `#accounts/lead/${id}`, pastRequestId: `#accounts/past/${id}` }[x.target?.field] ?? ''
}

// Today's Central date, for the date picker's lower bound.
export const centralToday = () => centralParts(Date.now()).day
