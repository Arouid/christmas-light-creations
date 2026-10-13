// The account chat from the staff side (docs/specs/account-chat.md): one
// reply goes through the server (replyToCustomer in functions/index.js),
// which appends it to conversations/{customerId}, logs it in Recent activity
// and emails the customer. In demo mode the sample thread is updated in
// memory instead and the activity entry is logged from here.
import { appendMessage } from '../../functions/chat.js'
import { getFirebaseApp } from '../lib/firebase'
import { demoMode } from './demo'
import { customerTarget, logActivity } from './activity'
import { getRecord, saveRecord } from './staffStore'

export async function sendReply(user, customer, text) {
  if (demoMode) {
    await new Promise((r) => setTimeout(r, 400))
    const prev = await getRecord('conversations', customer.id)
    const next = appendMessage(prev, { from: 'staff', by: user?.email ?? 'demo@example.com', text }, customer, new Date())
    await saveRecord(user, 'conversations', customer.id, { ...next, lastAt: next.lastAt.toISOString(), waitingSince: null })
    logActivity('chat-reply', customerTarget(customer.id, customer.fullName), text.slice(0, 120))
    return { ok: true, emailed: true, note: 'Sent. They get an email with your reply and see it in their account.' }
  }
  const [{ getFunctions, httpsCallable }, app] = await Promise.all([import('firebase/functions'), getFirebaseApp()])
  try {
    const call = httpsCallable(getFunctions(app, 'us-south1'), 'replyToCustomer')
    return (await call({ customerId: customer.id, text })).data
  } catch (err) {
    // Our server's refusals carry a sentence; a missing or crashed function only a code word.
    const said = /\s/.test(err.message ?? '') ? err.message : ''
    throw new Error(said || 'Couldn’t reach the server. Check your connection and try again (or email them instead).', { cause: err })
  }
}
