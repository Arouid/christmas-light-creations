// Asks the server (askClaude in functions/index.js, docs/specs/ask-claude.md)
// a staff question. The browser sends the question and the last few turns;
// the server reads the database with read-only tools and answers. In demo
// mode (/leads/?demo) a few canned answers come back so the panel can be
// checked without a key.
import { getFirebaseApp } from '../lib/firebase'
import { demoMode } from '../leads/demo'
import { callError } from './lib/errors'

export const EXAMPLES = ['Which invoices are overdue?', 'What did Sample Customer ask us last year?', 'Who’s on today’s route?', 'Is the text and email sync working?']

export async function ask(question, history = []) {
  if (demoMode) return demoAnswer(question)
  const [{ getFunctions, httpsCallable }, app] = await Promise.all([import('firebase/functions'), getFirebaseApp()])
  try {
    const call = httpsCallable(getFunctions(app, 'us-south1'), 'askClaude', { timeout: 120_000 })
    return (await call({ question, history })).data
  } catch (err) {
    // Our server's refusals carry a sentence; a missing or crashed function only a code word.
    throw callError(err, 'Couldn’t reach the assistant. Check your connection and try again.')
  }
}

async function demoAnswer(question) {
  await new Promise((r) => setTimeout(r, 900))
  const q = question.toLowerCase()
  const base = { incomplete: false, toolCalls: 1, model: 'demo', cost: 0 }
  if (/invoice|overdue|unpaid|owe/.test(q)) {
    return { ...base, toolCalls: 2,
      answer: 'Two invoices are overdue, $564.00 in all:\n- CLC-2026-0007, Sample Customer, Lights up 2026, $414.00, was due Oct 1\n- CLC-2026-0009, Example Family, Takedown 2025, $150.00, was due Sep 20\n\nReminders went out 7 and 14 days after each due date. A text from a person usually works next.',
      records: [{ type: 'invoice', id: 'demo-inv-7', label: 'CLC-2026-0007' }, { type: 'customer', id: 'sample-customer', label: 'Sample Customer' }, { type: 'invoice', id: 'demo-inv-9', label: 'CLC-2026-0009' }, { type: 'customer', id: 'example-family', label: 'Example Family' }],
      draftFor: null }
  }
  if (/route|today|tomorrow|thursday|stops/.test(q)) {
    return { ...base,
      answer: 'One route today, 3 stops, starting 8:00 AM:\n- 8:00 AM Sample Customer, 123 Example St, install\n- 10:45 AM Example Family, 789 Placeholder Dr, install\n- 1:30 PM Test Homeowner, 456 Sample Ln, takedown\n\nStatus: sent to the installer. Back at the shop around 2:15 PM.',
      records: [{ type: 'route', id: 'demo-route-1', label: 'Today’s route' }, { type: 'customer', id: 'sample-customer', label: 'Sample Customer' }],
      draftFor: null }
  }
  if (/working|sync|status|broken|problem|down/.test(q)) {
    return { ...base,
      answer: 'Everything looks fine:\n- Text & email sync: last message 2 hours ago\n- Website problems: none open\n- Request alerts: 3 people on the email list\n- Suggest a reply and Ask Claude: on',
      records: [], draftFor: null }
  }
  if (/sample|pat|ask|last year|history|said|want/.test(q)) {
    return { ...base, toolCalls: 3,
      answer: 'Sample Customer (123 Example St, Pearland, customer since 2016). Last year they asked two things:\n- Nov 18, 2025 (text): whether the install could move a day earlier because of a party on the 21st. We moved it to Nov 20.\n- Jan 9, 2026 (email): when the takedown would be; we answered the week of Jan 12.\n\nThis season: Install Scheduled for Thursday Oct 15 (week of Oct 11–17), $460 less 10% early install = $414, not paid yet.',
      records: [{ type: 'customer', id: 'sample-customer', label: 'Sample Customer' }],
      draftFor: { customerId: 'sample-customer' } }
  }
  return { ...base, toolCalls: 0,
    answer: 'In this preview I only know a few sample answers. Try: “Which invoices are overdue?”, “What did Sample Customer ask us last year?”, “Who’s on today’s route?” or “Is the sync working?”. With Firebase connected I look things up in the real database.',
    records: [], draftFor: null }
}
