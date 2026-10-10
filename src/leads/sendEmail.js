// Sends one email from info@ through the server (sendStaffEmail in
// functions/index.js, docs/specs/staff-email.md); the server files it in the
// person's history. In demo mode nothing is sent: a history entry is added to
// the sample data instead (a subject containing "[fail]" shows the error).
import { customerEmailKeys } from '../../functions/account.js'
import { getFirebaseApp } from '../lib/firebase'
import { demoMode } from './demo'
import { createRecord } from './staffStore'

// Addresses the server will email for this person: their email field (which
// may hold several), then "Also:" emails. The same list sendStaffEmail checks.
export const emailsOnRecord = (person) => customerEmailKeys(person)

// target: { customerId } | { leadId } | { pastRequestId }
export async function sendEmail(user, { to, subject, text, target, template }) {
  if (demoMode) return demoSend(user, { to, subject, text, target, template })
  const [{ getFunctions, httpsCallable }, app] = await Promise.all([import('firebase/functions'), getFirebaseApp()])
  try {
    const call = httpsCallable(getFunctions(app, 'us-south1'), 'sendStaffEmail')
    return (await call({ to, subject, text, template, ...target })).data
  } catch (err) {
    // Our server's refusals carry a sentence; anything else is just a code word.
    const said = /\s/.test(err.message ?? '') ? err.message : ''
    throw new Error(said || 'Couldn’t reach the server. Check your connection and try again, or use Open in Gmail.', { cause: err })
  }
}

async function demoSend(user, { to, subject, text, target, template }) {
  await new Promise((r) => setTimeout(r, 600))
  if (/\[fail\]/i.test(subject)) throw new Error('The email didn’t go out (Gmail didn’t take it). Try again in a minute, or use Open in Gmail.')
  const id = `em-demo-${Date.now()}`
  await createRecord(user, 'messages', id, {
    kind: 'email', direction: 'out', source: 'app', at: new Date().toISOString(),
    email: to.trim().toLowerCase(), subject: subject.trim(), text, sentBy: user?.email ?? 'demo@example.com', template, ...target,
  })
  return { ok: true, id }
}
