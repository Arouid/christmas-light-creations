import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountSummary, accountUrl, normEmail, shownInAccount } from '../functions/account.js'
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
  assert.deepEqual(states(accountSummary('t', { ...paid, items: p.items.filter((i) => i.due !== 'removal') })).takedown, 'none')
})
