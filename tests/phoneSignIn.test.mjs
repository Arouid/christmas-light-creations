// Phone-number sign-in (docs/specs/phone-sign-in.md): the pure parts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { phoneKey, phonesIn, prettyPhone } from '../functions/phone.js'
import { accountIdentity, accountQueries, customerPhoneKeys, loginRecord, proposalPhoneKeys, providerName, sameKeys } from '../functions/account.js'
import { recipientFor } from '../functions/chat.js'
import { NOT_A_CODE, NOT_A_NUMBER, codeInput, demoCodeStep, demoPhoneStep, phoneError, phoneInput } from '../src/account/phoneSignIn.js'
import { loginLine } from '../src/lib/customerLogins.js'

test('a US number however it is written becomes one E.164 key; anything else is nothing', () => {
  for (const raw of ['(281) 555-0101', '281.555.0101', '+1 281 555 0101', '12815550101', ' 2815550101 ', '1-281-555-0101']) assert.equal(phoneKey(raw), '+12815550101', raw)
  for (const raw of ['', null, undefined, '555-0101', '+44 20 7946 0958', '281555010', 'call me']) assert.equal(phoneKey(raw), '', String(raw))
  assert.equal(prettyPhone('+12815550101'), '(281) 555-0101')
  assert.equal(prettyPhone('+442079460958'), '+442079460958')
  assert.equal(prettyPhone(''), '')
})

test('phoneKeys: every number on a record, unique, incl. ones linked from old records', () => {
  assert.deepEqual(phonesIn('281-555-0101 / (832) 555 0102, 2815550101'), ['+12815550101', '+18325550102'])
  assert.deepEqual(proposalPhoneKeys({ customer: { phone: '(281) 555-0101' } }), ['+12815550101'])
  assert.deepEqual(proposalPhoneKeys({ customer: { phone: '' } }), [])
  assert.deepEqual(proposalPhoneKeys({}), [])
  assert.deepEqual(customerPhoneKeys({ phone: '281-555-0101 / 832-555-0102', otherPhones: ['+12815550101', '(713) 555-0103'] }), ['+12815550101', '+18325550102', '+17135550103'])
  assert.deepEqual(customerPhoneKeys({ phone: 'none' }), [])
  // Written only when they changed (the trigger compares in order).
  assert.equal(sameKeys(['+12815550101'], ['+12815550101']), true)
  assert.equal(sameKeys(['+12815550101'], undefined), false)
})

test('who is signed in: verified email, phone, or both; never an unverified email, never nobody', () => {
  assert.deepEqual(accountIdentity({ email: 'Pat@Example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } }), { email: 'pat@example.com', phone: '', key: 'pat@example.com' })
  assert.deepEqual(accountIdentity({ phone_number: '+12815550101', firebase: { sign_in_provider: 'phone' } }), { email: '', phone: '+12815550101', key: '+12815550101' })
  assert.deepEqual(accountIdentity({ email: 'pat@example.com', email_verified: true, phone_number: '+12815550101' }), { email: 'pat@example.com', phone: '+12815550101', key: 'pat@example.com' })
  assert.equal(accountIdentity({ email: 'pat@example.com', email_verified: false }), null)
  assert.equal(accountIdentity({ phone_number: '2815550101' }), null) // not E.164: not from Firebase
  assert.equal(accountIdentity({}), null)
  assert.equal(accountIdentity(undefined), null)
})

test('the lookup asks the index for each key the token has, and nothing for a stranger', () => {
  assert.deepEqual(accountQueries({ email: 'pat@example.com', phone: '', key: 'pat@example.com' }), [['emailKeys', 'pat@example.com']])
  assert.deepEqual(accountQueries({ email: '', phone: '+12815550101', key: '+12815550101' }), [['phoneKeys', '+12815550101']])
  assert.deepEqual(accountQueries({ email: 'pat@example.com', phone: '+12815550101', key: 'pat@example.com' }), [['emailKeys', 'pat@example.com'], ['phoneKeys', '+12815550101']])
  assert.deepEqual(accountQueries(null), [])
  // The index holds what the records hold: a phone-only customer is found by phone, an email-only one by email.
  const records = [
    { id: 'phone-only', emailKeys: [], phoneKeys: ['+12815550101'] },
    { id: 'email-only', emailKeys: ['pat@example.com'], phoneKeys: [] },
    { id: 'both', emailKeys: ['pat@example.com'], phoneKeys: ['+12815550101'] },
  ]
  const find = (who) => [...new Set(accountQueries(who).flatMap(([field, value]) => records.filter((r) => r[field].includes(value)).map((r) => r.id)))]
  assert.deepEqual(find(accountIdentity({ phone_number: '+12815550101' })), ['phone-only', 'both'])
  assert.deepEqual(find(accountIdentity({ email: 'pat@example.com', email_verified: true })), ['email-only', 'both'])
  assert.deepEqual(find(accountIdentity({ phone_number: '+18325550199' })), [])
})

test('login record and staff line for a phone sign-in', () => {
  const rec = loginRecord(undefined, { email: '', phone: '+12815550101', authTime: 1000, provider: providerName('phone') })
  assert.deepEqual(rec, { email: '', phone: '+12815550101', firstAt: 1000, lastAt: 1000, provider: 'phone' })
  // An email sign-in record stays exactly as before (no phone field).
  assert.deepEqual(loginRecord(undefined, { email: 'pat@example.com', authTime: 1000, provider: 'Google' }), { email: 'pat@example.com', firstAt: 1000, lastAt: 1000, provider: 'Google' })
  assert.match(loginLine({ firstAt: new Date('2026-10-14T15:05:00'), lastAt: new Date('2026-10-14T15:05:00'), provider: 'phone' }), /signed in Oct 14, .* \(phone\)$/)
})

test('a chat reply never goes to a phone number: the record’s email instead', () => {
  const doc = { messages: [{ from: 'customer', by: '+12815550101', text: 'Hi', at: '' }] }
  assert.equal(recipientFor(doc, { email: 'pat@example.com' }), 'pat@example.com')
  assert.equal(recipientFor(doc, { phone: '281-555-0101' }), '')
})

test('the screen: what they typed, the code, plain words for Firebase errors', () => {
  assert.equal(phoneInput('281 555 0101'), '+12815550101')
  assert.equal(phoneInput('555-0101'), '')
  assert.equal(codeInput('123 456'), '123456')
  assert.equal(codeInput('12345'), '')
  assert.equal(phoneError({ code: 'auth/invalid-phone-number' }), NOT_A_NUMBER)
  assert.equal(phoneError('auth/invalid-verification-code'), 'That code isn’t right. Check the text and try again.')
  assert.match(phoneError({ code: 'auth/too-many-requests' }), /Wait a while/)
  assert.match(phoneError({ code: 'auth/operation-not-allowed' }), /isn’t switched on yet/)
  assert.match(phoneError({ code: 'auth/code-expired' }), /Send again/)
  assert.equal(phoneError({ code: 'auth/something-new' }), 'Something went wrong. Please try again, or call us. (auth/something-new)')
  assert.equal(phoneError(new Error('boom')), 'Something went wrong. Please try again, or call us.')
})

test('demo mode signs in with any 6 digits and sends nothing', () => {
  assert.deepEqual(demoPhoneStep('(281) 555-0101'), { ok: true, phone: '+12815550101' })
  assert.deepEqual(demoPhoneStep('12'), { error: NOT_A_NUMBER })
  assert.deepEqual(demoCodeStep('000000'), { ok: true })
  assert.deepEqual(demoCodeStep('12'), { error: NOT_A_CODE })
})
