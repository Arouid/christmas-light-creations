// The customer's account tour (docs/specs/account-tour.md): which cards and
// lines a customer gets, by what their page really shows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACCOUNT_TOUR, accountTourSteps, tourWorthOpening } from '../src/data/accountTour.js'
import { DEMO_ACCOUNT } from '../src/account/demoAccount.js'

const ids = (steps) => steps.map((s) => s.id)
const scheduled = { season: '2026', installStatus: 'Install Scheduled', day: 'Thursday', plannedDate: 'Nov 13' }
const full = { schedule: scheduled, service: { days: 2, open: null }, chat: { messages: [] }, proposals: [{ token: 'p' }], invoices: [] }

test('a full account gets every card, in page order, ☰ last; the installed app skips Get the app', () => {
  assert.deepEqual(ids(accountTourSteps(full)), ['lights', 'chat', 'pay', 'app', 'menu'])
  assert.deepEqual(ids(accountTourSteps(full, { installed: true })), ['lights', 'chat', 'pay', 'menu'])
  assert.deepEqual(ids(accountTourSteps(DEMO_ACCOUNT)), ['lights', 'chat', 'pay', 'app', 'menu'])
  // Lines come out as plain strings (bold marks kept for the card).
  for (const s of accountTourSteps(full)) for (const line of s.body) assert.equal(typeof line, 'string')
})

test('Your lights: the schedule line, or Book when they are not on this season’s list, plus Report a problem once the lights are up', () => {
  const lines = (data) => accountTourSteps(data).find((s) => s.id === 'lights')?.body ?? []
  // Booked, not installed yet: the dates, and nothing to report (owner 2026-10-14).
  assert.equal(lines(full).length, 1)
  const up = { ...full, schedule: { ...scheduled, installStatus: 'Install Completed' } }
  const [sched, problem] = lines(up)
  assert.match(sched, /install day/)
  assert.match(problem, /Report a problem/)
  // Taken down: nothing to report either; an open call still shows.
  assert.equal(lines({ ...up, schedule: { ...up.schedule, takedownStatus: 'Takedown Completed' } }).length, 1)
  assert.equal(lines({ ...full, service: { days: 2, open: { status: 'Open' } } }).length, 2)
  // Not on this season's list yet: AccountPage shows Book instead of the dates.
  const rebook = lines({ ...full, schedule: { season: '2026', installStatus: '' } })
  assert.equal(rebook.length, 1)
  assert.match(rebook[0], /\*\*Book\*\*/)
  // Off the scheduler and no customer record: no Your lights section, no card.
  assert.equal(lines({ ...full, schedule: { installStatus: 'Not Servicing' }, service: null }).length, 0)
  assert.deepEqual(ids(accountTourSteps({ ...full, schedule: null, service: null })), ['chat', 'pay', 'app', 'menu'])
  // A schedule but no service section (no customer record): only the dates line.
  assert.deepEqual(lines({ ...full, service: null }), [sched])
})

test('payments only with an agreement or an invoice; chat only when the page has it', () => {
  assert.ok(ids(accountTourSteps({ ...full, proposals: [], invoices: [{ token: 'i' }] })).includes('pay'))
  assert.ok(!ids(accountTourSteps({ ...full, proposals: [], invoices: [] })).includes('pay'))
  assert.ok(!ids(accountTourSteps({ ...full, chat: null })).includes('chat'))
})

test('opens by itself only when there is something of theirs to show, not for ☰ alone', () => {
  const nothing = { email: 'new@example.com', proposals: [], invoices: [], customer: null, schedule: null, service: null, chat: null }
  assert.deepEqual(ids(accountTourSteps(nothing, { installed: true })), ['menu'])
  assert.equal(tourWorthOpening(accountTourSteps(nothing, { installed: true })), false)
  // Nothing of theirs yet: no Get the app either (design review 2026-10-14), so no tour by itself.
  assert.deepEqual(ids(accountTourSteps(nothing)), ['menu'])
  assert.equal(tourWorthOpening(accountTourSteps(nothing)), false)
  assert.ok(ids(accountTourSteps({ ...nothing, customer: { name: 'Pat' } })).includes('app'), 'a customer record is theirs')
  assert.equal(tourWorthOpening(accountTourSteps(full)), true)
  assert.deepEqual(accountTourSteps(null, { installed: true }).map((s) => s.id), ['menu'])
})

test('every card points at a part of the page that exists, and stays short', () => {
  const page = readFileSync(new URL('../src/account/AccountPage.jsx', import.meta.url), 'utf8')
  for (const s of ACCOUNT_TOUR) {
    assert.ok(page.includes(`id="${s.anchor}"`), `${s.id}: no id="${s.anchor}" on the account page`)
    assert.ok(s.body.length <= 3, `${s.id}: at most three lines`)
  }
  assert.ok(ACCOUNT_TOUR.length <= 6, 'a short tour')
  assert.equal(ACCOUNT_TOUR.at(-1).always, true)
})

test('the privacy page says the browser remembers the tour', async () => {
  const { privacy } = await import('../src/data/content.js')
  const keeps = privacy.sections.find((s) => s.title === 'What your browser keeps').items.join(' ')
  assert.match(keeps, /tour/)
})
