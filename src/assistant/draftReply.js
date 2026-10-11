// Asks the server's sales assistant (draftReply in functions/index.js,
// docs/specs/sales-assistant.md) for a suggested reply to one thread. The
// browser only says whose thread: { customerId } | { leadId } | { messageId }.
// In demo mode a sample draft comes back after a short pause.
import { NEXT_ACTIONS } from '../../functions/assistant/prompt.js'
import { getFirebaseApp } from '../lib/firebase'
import { demoMode } from '../leads/demo'
import { callError } from './lib/errors'

export { NEXT_ACTIONS }

export async function requestDraft(target) {
  if (demoMode) return demoDraft(target)
  const [{ getFunctions, httpsCallable }, app] = await Promise.all([import('firebase/functions'), getFirebaseApp()])
  try {
    const call = httpsCallable(getFunctions(app, 'us-south1'), 'draftReply')
    return (await call(target)).data
  } catch (err) {
    // Our server's refusals carry a sentence; a missing or crashed function only a code word.
    throw callError(err, 'Couldn’t reach the assistant. Check your connection and try again, or write the reply yourself.')
  }
}

async function demoDraft(target) {
  await new Promise((r) => setTimeout(r, 900))
  const email = Boolean(target.customerId || target.leadId)
  return {
    summary: email ? 'Wants their lights again this year and asks when we can install' : 'New number asking what a roofline costs',
    nextAction: email ? 'schedule' : 'estimate',
    nextActionLabel: NEXT_ACTIONS[email ? 'schedule' : 'estimate'],
    channel: email ? 'email' : 'text',
    subject: email ? 'You’re on our list for this season' : '',
    reply: email
      ? 'Hi Pat,\n\nGreat to hear from you, and yes, we’d love to light up your home again this year! You’re on the list. We build the schedule area by area as the season fills in, so we’ll email you your install date as soon as it’s set. If some dates work best for you, just reply and we’ll do our best.\n\nReminder: installs done by October 31st get 10% off.\n\nThank you,\nChristmas Light Creations\n281-819-0163'
      : 'Hi! Thanks for reaching out to Christmas Light Creations. Every home is a little different, so we come by and measure your roofline (about 30 minutes, no roof climbing, you don’t need to be home) and send you one clear price. What’s the address? Or text us a couple of photos of the front of the house for a rough quote.',
    escalate: false,
    reason: email ? 'Their 2025 install was Early Install; confirm they still want October before promising the discount.' : '',
    contact: email ? { firstName: 'Pat', fullName: 'Pat Sample', phone: '(281) 555-0101', email: 'pat.sample@example.com' } : { firstName: '', fullName: '', phone: '(832) 555-0199', email: '' },
    model: 'demo', cost: 0,
  }
}
