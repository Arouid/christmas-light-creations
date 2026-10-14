// The customer's tour of /account/ (docs/specs/account-tour.md, owner
// 2026-10-14: "do customers get tours too?"). A few cards, each pointing at a
// part of their page (`anchor` = the section's id), shown once per device on
// the first sign-in and again from ☰ → Take the tour. Only what their page
// really has: `if` keeps a card (or a line) when that fact is true for them.
// Pure; the card is src/account/AccountTour.jsx.
import { business } from './content.js'
import { scheduleText } from '../../functions/service.js'

export const ACCOUNT_TOUR = [
  { id: 'lights', anchor: 'lights', icon: '🎄', title: 'Your lights this season', body: [
    { if: 'schedule', text: 'Your **install day** and **takedown** show here, from our schedule. If a date moves, it changes here too.' },
    { if: 'rebook', text: 'Want your lights back up this season? Tap **Yes, put my lights back up** (pick a week if you like) and you’re on the list. No call needed.' },
    { if: 'problem', text: 'Something out? Tap **🛠 Report a problem** and pick what’s wrong. You’ll see here when we’ve got it and when it’s scheduled.' },
  ] },
  { id: 'chat', anchor: 'chat', icon: '💬', title: 'Chat with us', if: 'chat', body: [
    'Ask about your date, your lights or a bill. We answer **right here and by email**, usually within a few hours.',
  ] },
  { id: 'pay', anchor: 'agreements', icon: '🧾', title: 'Agreements & payments', if: 'pay', body: [
    'Your agreements and invoices, what’s paid and anything due. Anything due has **PayPal, Venmo and card** buttons right under it.',
    'A new proposal shows **Review and sign**; a signed one, **View or print your agreement**.',
  ] },
  { id: 'app', anchor: 'app', icon: '📱', title: 'Get the app', if: 'app', body: [
    'Put your account on your phone’s home screen with **Get the app**: its own icon, full-screen, no password.',
  ] },
  // Always last, and never enough on its own to open the tour by itself.
  { id: 'menu', anchor: 'account-menu', icon: '🧭', title: 'Everything else is in ☰', always: true, body: [
    '**☰** (top right) jumps to any part of your account, and has **Help** for quick answers and **Take the tour** to see this again.',
    `Rather talk to a person? Call or text **${business.phone}**; the call button is always at the top.`,
  ] },
]

// The card's own words (src/account/AccountTour.jsx) and the ☰ menu row.
export const ACCOUNT_TOUR_UI = {
  label: 'Tour of your account',
  welcome: (first) => `Welcome${first ? `, ${first}` : ''}! A quick look around.`,
  count: (n, total) => `${n} of ${total}`,
  back: 'Back',
  next: 'Next',
  done: 'Done',
  close: 'Close the tour',
  menu: 'Take the tour',
}

// What this customer's page shows, by the same tests AccountPage.jsx uses to
// draw each section. installed: they're in the installed app (no Get the app).
export function accountTourFacts(data, { installed = false } = {}) {
  const sched = scheduleText(data?.schedule)
  return {
    schedule: Boolean(sched && !sched.none),
    rebook: Boolean(sched?.none),
    problem: Boolean(data?.service),
    chat: Boolean(data?.chat),
    pay: (data?.proposals?.length ?? 0) > 0 || (data?.invoices?.length ?? 0) > 0,
    app: !installed,
  }
}

// The cards for this customer, lines as plain strings: a card goes when its
// `if` is false or when none of its lines are left.
export function accountTourSteps(data, opts, steps = ACCOUNT_TOUR) {
  const facts = accountTourFacts(data, opts)
  const keep = (x) => !x.if || facts[x.if]
  return steps
    .filter(keep)
    .map((s) => ({ ...s, body: s.body.filter((l) => typeof l === 'string' || keep(l)).map((l) => (typeof l === 'string' ? l : l.text)) }))
    .filter((s) => s.body.length > 0)
}

// Opens by itself only when it has something of theirs to show (not just ☰).
export const tourWorthOpening = (steps) => steps.some((s) => !s.always)
