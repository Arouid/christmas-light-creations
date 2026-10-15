// Staff seeing a customer's account as they do (docs/specs/account-preview.md):
// the account payload shared by myAccount and accountPreview, the preview's
// identity and request, the staff check, and the page's link and words.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CUSTOMER_FIELDS, PROPOSAL_FIELDS, accountPayload, accountSeason } from '../functions/accountPayload.js'
import { accountIdentity, accountQueries, previewIdentity, previewRequest, staffTokenEmail } from '../functions/account.js'
import { partCents } from '../functions/proposalMath.js'
import { PREVIEW_PARAM, accountPreviewLink, previewBanner, previewProblem } from '../src/lib/accountPreview.js'

const NOW = new Date('2026-10-14T18:00:00Z')
const who = { email: 'pat@example.com', phone: '+12815550101', key: 'pat@example.com' }
// What Firestore hands back for a fieldMask: only those fields.
const masked = (data, fields) => Object.fromEntries(fields.filter((f) => f in data).map((f) => [f, data[f]]))

// A signed Pay-in-3 lease with sales tax, and staff-only fields the page must never get.
const proposal = {
  status: 'signed', title: 'Christmas lighting', season: '2026', kind: 'lease', plan: 'payin3', payDay: 15,
  customer: { name: 'Pat Sample', email: 'Pat@Example.com', phone: '(281) 555-0101', address: '1 Main St, Pearland' },
  items: [{ label: 'Roofline', qty: 100, rate: 5, taxable: true }, { label: 'Takedown', qty: 1, rate: 150, due: 'removal', taxable: true }],
  discountPct: 10, depositPct: 50, tax: { ratePct: 8.25 }, deposit: { status: 'paid', amount: 1, paidAt: '2026-10-02T15:00:00Z' }, payments: {}, requests: {},
  sentAt: '2026-10-01T15:00:00Z', signedAt: '2026-10-02T15:00:00Z',
  notes: 'staff only', emailKeys: ['pat@example.com'], docHash: 'abc',
}
const customer = {
  fullName: 'Pat Sample', address: '1 Main St, Pearland', since: '2021', originalRate: '$900', reinstallBase: 700, priceShown: true,
  addOns: [{ season: '2024', what: 'Arch', price: 300 }],
  seasons: { 2025: { installStatus: 'Install Completed', install: { total: '$648', paid: 'Yes', paymentType: 'PayPal' } }, 2026: { installStatus: 'Install Scheduled', day: 'Thursday', plannedDate: 'Nov 13' } },
  gateCode: '#1234', hoa: 'Example Lakes', lightsDownBy: 'Jan 15', hazards: 'Sprinklers', pets: 'Dog', emailNotices: false,
  notes: 'staff only', takedownNotes: 'staff only', email: 'pat@example.com', phone: '281-555-0101',
}
const invoices = [
  { id: 'old', data: { status: 'paid', number: 'CLC-2026-0001', kind: 'addon', season: '2026', items: [{ description: 'Arch', cents: 30000 }], sentAt: '2026-10-01T15:00:00Z', offline: { method: 'Check', date: '2026-10-03', cents: 30000 } } },
  { id: 'new', data: { status: 'open', number: 'CLC-2026-0002', kind: 'takedown', season: '2025', items: [{ description: 'Takedown', cents: 15000 }], dueDate: '2026-10-20', sentAt: '2026-10-10T15:00:00Z' } },
  { id: 'draft', data: { status: 'draft', number: '', items: [] } },
  { id: 'void', data: { status: 'void', number: 'CLC-2026-0003', items: [] } },
]
const conversation = { messages: [{ from: 'customer', by: 'pat@example.com', text: 'Hi', at: '2026-10-11T21:12:00Z' }, { from: 'staff', by: 'katie@christmas-light-creations.com', text: 'Hello', at: '2026-10-11T22:05:00Z' }], waitingSince: null, count: 2 }
const openCall = { id: 'call1', issue: 'A strand is out', status: 'Open', received: '2026-10-13' }
const build = (cut) => accountPayload({
  who,
  proposals: [{ id: 'tok1', data: cut ? masked(proposal, PROPOSAL_FIELDS) : proposal }],
  customers: [{ id: 'pat-sample', data: cut ? masked(customer, CUSTOMER_FIELDS) : customer }],
  invoices, openCall, conversation, now: NOW,
})

test('the fields Firestore is asked for are all the payload needs (tax, Pay in 3, property details, email switch)', () => {
  assert.deepEqual(build(true), build(false))
  const p = build(true)
  const parts = Object.fromEntries(p.proposals[0].parts.map((x) => [x.part, x.amount]))
  for (const part of ['deposit', 'balance', 'takedown']) assert.equal(parts[part], partCents(proposal, part), `${part} includes the sales tax`)
  assert.equal(p.proposals[0].plan, 'payin3')
  assert.equal(p.proposals[0].parts.find((x) => x.part === 'balance').due, '2026-11-15')
  assert.deepEqual(p.details, { gateCode: '#1234', hoa: 'Example Lakes', lightsDownBy: 'Jan 15', hazards: 'Sprinklers', pets: 'Dog', emailNotices: false })
  assert.equal(p.price.reinstallBase, 700)
})

test('the payload: what the account page draws, and nothing staff-only', () => {
  const p = build(false)
  assert.deepEqual(Object.keys(p).sort(), ['chat', 'customer', 'details', 'email', 'invoices', 'phone', 'price', 'proposals', 'review', 'schedule', 'service'])
  assert.equal(p.email, 'pat@example.com')
  assert.deepEqual(p.customer, { name: 'Pat Sample', address: '1 Main St, Pearland', emails: ['pat@example.com'], phones: ['+12815550101'] }, 'the emails and phones that sign them in')
  assert.deepEqual(p.invoices.map((i) => i.token), ['new', 'old'], 'sent or paid only, newest first')
  assert.equal(p.schedule.season, '2026')
  assert.equal(p.schedule.plannedDate, 'Nov 13')
  assert.deepEqual(p.service, { days: 2, open: openCall })
  assert.deepEqual(p.chat.messages.map((m) => m.from), ['customer', 'staff'])
  assert.ok(!JSON.stringify(p).includes('katie@'), 'staff emails never reach the page')
  assert.ok(!JSON.stringify(p).includes('staff only'), 'staff notes never reach the page')
  assert.deepEqual(p.review, { show: true }, 'a past customer gets the ★ card')
})

test('no customer record: proposals and invoices only, nothing from a record', () => {
  const p = accountPayload({ who, proposals: [{ id: 'tok1', data: proposal }, { id: 'gone', data: undefined }, { id: 'draft', data: { ...proposal, status: 'draft' } }], invoices: [], customers: [], now: NOW })
  assert.deepEqual(p.proposals.map((x) => x.token), ['tok1'])
  for (const k of ['customer', 'schedule', 'service', 'details', 'chat', 'review', 'price']) assert.equal(p[k], null, k)
  const empty = accountPayload({ who: { email: '', phone: '+12815550101' }, now: NOW })
  assert.deepEqual([empty.proposals, empty.invoices, empty.phone], [[], [], '+12815550101'])
})

test('season: July 1 cutover', () => {
  assert.equal(accountSeason(new Date('2026-10-14T12:00:00Z')), '2026')
  assert.equal(accountSeason(new Date('2027-01-10T12:00:00Z')), '2026')
  assert.equal(accountSeason(new Date('2027-07-02T12:00:00Z')), '2027')
})

test('a preview looks the record up by every email and phone on it', () => {
  const id = previewIdentity({ email: 'Pat@Example.com, pat.work@example.com', otherEmails: ['old@example.com'], phone: '(281) 555-0101', otherPhones: ['832-555-0102'] })
  assert.deepEqual(id, { email: 'pat@example.com', phone: '+12815550101', key: 'pat@example.com', emails: ['pat@example.com', 'pat.work@example.com', 'old@example.com'], phones: ['+12815550101', '+18325550102'] })
  assert.deepEqual(accountQueries(id), [['emailKeys', 'pat@example.com'], ['emailKeys', 'pat.work@example.com'], ['emailKeys', 'old@example.com'], ['phoneKeys', '+12815550101'], ['phoneKeys', '+18325550102']])
  assert.deepEqual(previewIdentity({ phone: '281-555-0101' }), { email: '', phone: '+12815550101', key: '+12815550101', emails: [], phones: ['+12815550101'] })
  const none = previewIdentity({ fullName: 'No Contact' })
  assert.equal(none.key, '', 'nothing they could sign in with')
  assert.deepEqual(accountQueries(none), [])
})

test('a customer’s own sign-in never carries lists (only a staff preview does)', () => {
  const me = accountIdentity({ email: 'pat@example.com', email_verified: true, emails: ['someone@else.com'], phones: ['+18325550199'] })
  assert.deepEqual(accountQueries(me), [['emailKeys', 'pat@example.com']])
})

test('preview request: one customer id', () => {
  assert.deepEqual(previewRequest({ id: ' pat-sample ' }), { id: 'pat-sample' })
  for (const bad of [undefined, {}, { id: '' }, { id: 42 }, { id: 'a/b' }, { id: 'x'.repeat(201) }]) assert.equal(previewRequest(bad).error?.[0], 'invalid-argument', JSON.stringify(bad))
})

test('staff check: only a verified Google sign-in, then the staff list decides', () => {
  const google = { email: 'Katie@Example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } }
  assert.equal(staffTokenEmail(google), 'katie@example.com')
  assert.equal(staffTokenEmail({ ...google, email_verified: false }), '')
  assert.equal(staffTokenEmail({ ...google, firebase: { sign_in_provider: 'password' } }), '', 'an email link never makes anyone staff')
  assert.equal(staffTokenEmail({ ...google, firebase: { sign_in_provider: 'emailLink' } }), '')
  assert.equal(staffTokenEmail({ phone_number: '+12815550101', firebase: { sign_in_provider: 'phone' } }), '', 'nor a phone sign-in')
  assert.equal(staffTokenEmail({ ...google, email: '' }), '')
  assert.equal(staffTokenEmail(undefined), '')
})

// The server code itself (functions/index.js can't be imported without Firebase).
const server = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8')
const block = (start) => { const at = server.indexOf(start); assert.ok(at >= 0, start); return server.slice(at, server.indexOf('\n}', at) + 2) }

test('accountPreview: staff first, the shared payload, and it never writes', () => {
  const fn = block('export const accountPreview')
  const staffAt = fn.indexOf('isStaffToken(req.auth.token)')
  assert.ok(staffAt > 0 && staffAt < fn.indexOf('getFirestore()'), 'the staff check comes before any read')
  assert.match(fn, /throw new HttpsError\('permission-denied', 'Staff only\.'\)/)
  assert.match(fn, /accountFor\(db, who, \{ firstId: r\.id, fill: false \}\)/)
  for (const no of ['recordLogin', 'logWebsite', 'alertStaff', '.set(', '.update(', '.create(', '.delete(', 'runTransaction', 'batch(']) assert.ok(!fn.includes(no), no)
  const shared = block('async function accountFor')
  for (const no of ['recordLogin', 'logWebsite', '.set(', '.update(', '.create(', 'runTransaction', 'batch(']) assert.ok(!shared.includes(no), no)
  assert.match(shared, /if \(fill\) await ensureAccountIndex\(\)/, 'the index fill is the only write, and the preview skips it')
  assert.match(block('export const myAccount'), /return accountFor\(db, who\)/, 'the customer gets the same payload')
  assert.match(block('async function isStaffToken'), /staffTokenEmail\(token\)/)
})

test('the staff app’s link and the page’s words', () => {
  assert.equal(PREVIEW_PARAM, 'preview')
  assert.equal(accountPreviewLink('pat-sample'), '/account/?preview=pat-sample')
  assert.equal(accountPreviewLink('o’neil & co', { base: '/', demo: true }), '/account/?demo&preview=o%E2%80%99neil%20%26%20co')
  assert.equal(previewBanner('Pat Sample'), 'Preview: you’re seeing Pat Sample’s account. Nothing you do here is sent.')
  assert.equal(previewBanner(''), 'Preview: you’re seeing this customer’s account. Nothing you do here is sent.')
  assert.equal(previewProblem({ code: 'functions/permission-denied' }).signIn, true)
  assert.equal(previewProblem({ code: 'functions/not-found', message: 'That customer record is gone.' }).text, 'That customer record is gone.')
  assert.equal(previewProblem({ code: 'functions/internal' }).signIn, false)
})

test('the account page: a preview loads accountPreview, never myAccount, and keeps nothing', () => {
  const page = readFileSync(new URL('../src/account/AccountPage.jsx', import.meta.url), 'utf8')
  assert.match(page, /preview \? a\.loadPreview\(previewId\) : a\.loadAccount\(\)/)
  assert.match(page, /if \(!preview\) markTourDone\(\)/, 'the tour’s seen memory')
  assert.match(page, /if \(demo \|\| preview\) return/, 'sign out')
  for (const fn of ['send', 'save', 'toggle', 'go']) assert.match(page, new RegExp(`async function ${fn}\\([^)]*\\) \\{\\n(?:    e\\.preventDefault\\(\\)\\n)?    if \\(preview\\) return`), fn)
})
