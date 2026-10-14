import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountSummary, accountUrl, housePhotoFile, loginRecord, normEmail, providerName, shownInAccount } from '../functions/account.js'
import { itemsFromDesign, newProposal, partAmount } from '../src/proposals/model.js'

const base = () => ({ ...newProposal({ customer: { name: 'Pat', email: 'Pat@Example.com' }, items: itemsFromDesign({ feet: 100, pricePerFoot: 5 }), depositPct: 50 }), status: 'signed' })
const states = (s) => Object.fromEntries(s.parts.map((x) => [x.part, x.state]))

test('emails match in any letter case', () => {
  assert.equal(normEmail(' Pat@Example.COM '), 'pat@example.com')
})

test('sign-in link only returns to the site or local dev', () => {
  assert.equal(accountUrl('http://localhost:5173'), 'http://localhost:5173/account/')
  assert.equal(accountUrl('https://evil.example'), 'https://christmas-light-creations.com/account/')
  assert.equal(accountUrl(undefined), 'https://christmas-light-creations.com/account/')
})

test('drafts hidden; voided shown only if something was paid', () => {
  assert.equal(shownInAccount({ ...base(), status: 'draft' }), false)
  assert.equal(shownInAccount({ ...base(), status: 'void' }), false)
  assert.equal(shownInAccount({ ...base(), status: 'void', deposit: { status: 'paid', amount: 1 } }), true)
  assert.equal(shownInAccount({ ...base(), status: 'sent' }), true)
})

test('what is due follows the payment rules and the page math', () => {
  const p = base()
  assert.deepEqual(states(accountSummary('t', { ...p, status: 'sent' })), { deposit: 'later', balance: 'later', takedown: 'later' })
  assert.deepEqual(states(accountSummary('t', p)), { deposit: 'due', balance: 'later', takedown: 'later' })
  const paid = { ...p, status: 'countersigned', deposit: { status: 'paid', amount: partAmount(p, 'deposit') }, requests: { balance: true, takedown: true } }
  const s = accountSummary('t', paid)
  assert.deepEqual(states(s), { deposit: 'paid', balance: 'due', takedown: 'due' })
  for (const x of s.parts) assert.equal(x.amount, partAmount(p, x.part))
  assert.deepEqual(states(accountSummary('t', { ...paid, items: p.items.filter((i) => i.due !== 'removal') })).takedown, 'free') // $0 takedown shows as Free
})

test('login record keeps the first sign-in and the latest one', () => {
  const a = loginRecord(undefined, { email: 'pat@example.com', authTime: 1000, provider: 'Google' })
  assert.deepEqual(a, { email: 'pat@example.com', firstAt: 1000, lastAt: 1000, provider: 'Google' })
  const b = loginRecord(a, { email: 'pat@example.com', authTime: 5000, provider: 'email link' })
  assert.deepEqual([b.firstAt, b.lastAt, b.provider], [1000, 5000, 'email link'])
  // An older session reopening the page doesn't move "last" back.
  const c = loginRecord(b, { email: 'pat@example.com', authTime: 3000, provider: 'Google' })
  assert.deepEqual([c.firstAt, c.lastAt, c.provider], [1000, 5000, 'email link'])
  assert.equal(providerName('google.com'), 'Google')
  assert.equal(providerName('password'), 'email link')
})

test('house photo: only the picked photo, only from the customer’s own folder', () => {
  const photos = {
    pA1: { path: 'customers/pat-sample/2025/pA1.jpg', url: 'https://x/a', at: 1733000000000 },
    pB2: { path: 'customers/pat-sample/2026/pB2.jpg', url: 'https://x/b', at: 1760000000000 },
    pX: { path: 'customers/someone-else/2026/pX.jpg' },
    pUp: { path: 'customers/pat-sample/../someone-else/2026/pUp.jpg' },
    pThumb: { path: 'customers/pat-sample/2026/pThumb.png' },
  }
  assert.deepEqual(housePhotoFile('pat-sample', { photos, housePhoto: 'pB2' }), { id: 'pB2', path: 'customers/pat-sample/2026/pB2.jpg', at: 1760000000000 })
  assert.equal(housePhotoFile('pat-sample', { photos }), null) // none picked: the page shows Street View
  assert.equal(housePhotoFile('pat-sample', { photos, housePhoto: 'gone' }), null) // the photo was removed
  assert.equal(housePhotoFile('pat-sample', { photos, housePhoto: 'pX' }), null) // another customer's folder
  assert.equal(housePhotoFile('pat-sample', { photos, housePhoto: 'pUp' }), null) // no climbing out of the folder
  assert.equal(housePhotoFile('pat-sample', { photos, housePhoto: 'pThumb' }), null) // not a saved JPEG
  assert.equal(housePhotoFile('pat', { photos, housePhoto: 'pB2' }), null) // a customer id that only starts the same
  assert.equal(housePhotoFile('', { photos, housePhoto: 'pB2' }), null)
  assert.equal(housePhotoFile('pat-sample', { housePhoto: 'pB2' }), null)
  assert.equal(housePhotoFile('pat-sample', undefined), null)
  // An older record with the photos as a list; a photo with no date.
  assert.deepEqual(housePhotoFile('pat-sample', { photos: [{ id: 'pC', path: 'customers/pat-sample/2024/pC.jpg' }], housePhoto: 'pC' }), { id: 'pC', path: 'customers/pat-sample/2024/pC.jpg', at: null })
})

test('email keys: lowercase, every email on a customer incl. linked ones, compared in order', async () => {
  const { customerEmailKeys, proposalEmailKeys, sameKeys } = await import('../functions/account.js')
  assert.deepEqual(proposalEmailKeys({ customer: { email: ' Pat@Example.COM ' } }), ['pat@example.com'])
  assert.deepEqual(proposalEmailKeys({ customer: { email: 'not an email' } }), [])
  assert.deepEqual(customerEmailKeys({ email: 'Pat@Example.com, pat.work@example.com', otherEmails: ['PAT.OLD@example.com', 'pat@example.com'] }),
    ['pat@example.com', 'pat.work@example.com', 'pat.old@example.com'])
  assert.equal(sameKeys(['a@b.co'], ['a@b.co']), true)
  assert.equal(sameKeys(['a@b.co'], undefined), false)
  assert.equal(sameKeys([], undefined), true)
})
