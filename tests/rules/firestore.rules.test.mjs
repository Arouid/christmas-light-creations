// firestore.rules against the Firestore emulator (security review 2026-10-09).
// Needs Java 21+. Run: npm run test:rules  (starts and stops the emulator;
// project "demo-clc" never touches the real database).
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

let env
const STAFF = 'boss@example.com'
const HASH = 'a'.repeat(64)

// Who is asking.
const as = {
  anon: () => env.unauthenticatedContext().firestore(),
  customer: () => env.authenticatedContext('cust', { email: 'cust@example.com', email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore(),
  unverified: () => env.authenticatedContext('unv', { email: STAFF, email_verified: false, firebase: { sign_in_provider: 'password' } }).firestore(),
  stranger: () => env.authenticatedContext('str', { email: 'stranger@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore(),
  staff: () => env.authenticatedContext('boss', { email: STAFF, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore(),
  staffEmailLink: () => env.authenticatedContext('boss3', { email: STAFF, email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore(),
  staffUpper: () => env.authenticatedContext('boss2', { email: 'Boss@Example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore(),
}
const outsiders = ['anon', 'customer', 'unverified', 'stranger', 'staffEmailLink']

const stamp = (email = STAFF) => ({ updatedAt: serverTimestamp(), updatedBy: email })
const lead = (over = {}) => ({
  firstName: 'Pat', lastName: 'Test', email: 'pat@example.com', phone: '281', address: '1 Main St', city: 'Pearland', zip: '77581',
  contactMethod: 'Phone', message: 'Lights please', source: 'web', status: 'new', notes: '', createdAt: serverTimestamp(), ...over,
})
const sentProposal = (over = {}) => ({ status: 'sent', docHash: HASH, customer: { name: 'Pat', email: 'cust@example.com' }, items: [{ qty: 1, rate: 500 }], depositPct: 50, ...over })
const signature = (over = {}) => ({ name: 'Pat Test', image: 'data:image/png;base64,AAAA', consent: true, docHash: HASH, userAgent: 'test', ...over })

// A valid staff-style document for every staff-only collection.
const staffDocs = {
  leads: { ...lead(), createdAt: new Date() },
  customers: { fullName: 'Pat Test', email: 'cust@example.com' },
  serviceCalls: { customerId: 'pat-test', status: 'Open' },
  gateCodes: { neighborhood: 'Shadow Creek' },
  views: { name: 'Mine' },
  messages: { customerId: 'pat-test', direction: 'in' },
  pastRequests: { name: 'Old' },
  signs: { corner: 'Broadway 288' },
  routes: { day: '2026-11-01', stops: [] },
  designs: { ownerId: 'pat-test', designJson: '{}' },
  designFiles: { dataUrl: 'data:image/png;base64,AAAA' },
  settings: { alertEmails: [STAFF] },
  customerLogins: { email: 'cust@example.com' },
  accountLinks: { count: 1 },
  staff: { name: 'Boss' },
}

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-clc', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } })
})
after(async () => { await env?.cleanup() })
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'staff', STAFF), { name: 'Boss' })
    for (const [c, data] of Object.entries(staffDocs)) if (c !== 'staff') await setDoc(doc(db, c, 'x1'), data)
    await setDoc(doc(db, 'leads', 'spam1'), { ...staffDocs.leads, status: 'spam' })
    await setDoc(doc(db, 'proposals', 'sent1'), sentProposal())
    await setDoc(doc(db, 'proposals', 'draft1'), sentProposal({ status: 'draft', docHash: null }))
    await setDoc(doc(db, 'proposals', 'signed1'), sentProposal({ status: 'signed', signature: signature() }))
    await setDoc(doc(db, 'proposals', 'voidUnsigned'), sentProposal({ status: 'void' }))
    await setDoc(doc(db, 'proposals', 'voidSigned'), sentProposal({ status: 'void', signature: signature() }))
    await setDoc(doc(db, 'proposals', 'sandboxPaid'), sentProposal({ status: 'signed', signature: signature(), deposit: { status: 'paid', env: 'sandbox' } }))
    await setDoc(doc(db, 'proposals', 'sandboxThenLive'), sentProposal({ status: 'signed', signature: signature(), deposit: { status: 'paid', env: 'sandbox' }, payments: { balance: { status: 'paid', env: 'live' } } }))
    await setDoc(doc(db, 'proposals', 'livePaid'), sentProposal({ status: 'signed', signature: signature(), deposit: { status: 'paid', env: 'live' } }))
    await setDoc(doc(db, 'proposalFiles', 'sent1-render'), { dataUrl: 'data:image/png;base64,AAAA' })
  })
})

describe('staff-only collections: outsiders get nothing', () => {
  for (const [c, data] of Object.entries(staffDocs)) {
    for (const who of outsiders) {
      test(`${c}: ${who} cannot read, list, write or delete`, async () => {
        const db = as[who]()
        await assertFails(getDoc(doc(db, c, 'x1')))
        await assertFails(getDocs(collection(db, c)))
        await assertFails(setDoc(doc(db, c, 'new1'), { ...data, ...stamp(STAFF) }))
        await assertFails(updateDoc(doc(db, c, 'x1'), { ...stamp(STAFF) }))
        await assertFails(deleteDoc(doc(db, c, 'x1')))
      })
    }
  }
})

describe('staff', () => {
  test('staff can read and stamp-write staff collections', async () => {
    const db = as.staff()
    for (const c of ['leads', 'customers', 'serviceCalls', 'gateCodes', 'views', 'messages', 'pastRequests', 'signs', 'routes', 'designs', 'designFiles', 'settings', 'customerLogins', 'staff']) {
      await assertSucceeds(getDocs(collection(db, c)))
    }
    await assertSucceeds(setDoc(doc(db, 'customers', 'new1'), { fullName: 'New', ...stamp() }))
    await assertFails(setDoc(doc(db, 'customers', 'new2'), { fullName: 'New', ...stamp('someone@else.com') }))
    await assertFails(setDoc(doc(db, 'customers', 'new3'), { fullName: 'New', updatedBy: STAFF, updatedAt: new Date(0) }))
  })
  test('staff email in another letter case still matches the staff list', async () => {
    await assertSucceeds(getDocs(collection(as.staffUpper(), 'leads')))
  })
  test('nobody writes the staff list, customer logins or account-link bookkeeping from the app', async () => {
    const db = as.staff()
    await assertFails(setDoc(doc(db, 'staff', 'intruder@gmail.com'), { name: 'x' }))
    await assertFails(setDoc(doc(db, 'customerLogins', 'cust@example.com'), { email: 'cust@example.com' }))
    await assertFails(getDoc(doc(db, 'accountLinks', 'x1')))
    await assertFails(setDoc(doc(db, 'accountLinks', 'x1'), { count: 0 }))
  })
  test('unverified email on the staff list is not staff', async () => {
    await assertFails(getDocs(collection(as.unverified(), 'leads')))
  })
  test('staff email signed in by email link (customer account) is not staff', async () => {
    await assertFails(getDocs(collection(as.staffEmailLink(), 'leads')))
    await assertFails(getDocs(collection(as.staffEmailLink(), 'proposals')))
  })
  test('deletes: only spam leads; customers, messages, settings never', async () => {
    const db = as.staff()
    await assertFails(deleteDoc(doc(db, 'leads', 'x1')))
    await assertSucceeds(deleteDoc(doc(db, 'leads', 'spam1')))
    for (const c of ['customers', 'serviceCalls', 'messages', 'pastRequests', 'settings']) await assertFails(deleteDoc(doc(db, c, 'x1')))
  })
  test('lead updates: only status/notes/link fields, known statuses', async () => {
    const db = as.staff()
    await assertSucceeds(updateDoc(doc(db, 'leads', 'x1'), { status: 'called', notes: 'ok', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'leads', 'x1'), { status: 'hacked', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'leads', 'x1'), { email: 'changed@example.com', ...stamp() }))
  })
})

describe('leads: public estimate form', () => {
  for (const who of ['anon', 'customer', 'stranger']) {
    test(`${who} can add a valid request`, async () => {
      await assertSucceeds(setDoc(doc(as[who](), 'leads', `new-${who}`), lead()))
    })
  }
  const bad = {
    'status other than new': { status: 'booked' },
    'pre-filled notes': { notes: 'hi' },
    'extra field': { admin: true },
    'bad email': { email: 'not-an-email' },
    'empty address': { address: '' },
    'unknown contact method': { contactMethod: 'Fax' },
    'huge message': { message: 'x'.repeat(3001) },
    'client-chosen time': { createdAt: new Date(0) },
    'customerId link': { customerId: 'someone' },
    'source too long': { source: 's'.repeat(61) },
  }
  for (const [name, over] of Object.entries(bad)) {
    test(`refused: ${name}`, async () => { await assertFails(setDoc(doc(as.anon(), 'leads', 'bad'), lead(over))) })
  }
  test('the public cannot overwrite an existing lead', async () => {
    await assertFails(setDoc(doc(as.anon(), 'leads', 'x1'), lead()))
  })
})

describe('proposals: customer link (token = document id)', () => {
  test('anyone with the token can open it, nobody outside staff can list', async () => {
    await assertSucceeds(getDoc(doc(as.anon(), 'proposals', 'sent1')))
    for (const who of outsiders) await assertFails(getDocs(collection(as[who](), 'proposals')))
    await assertSucceeds(getDocs(collection(as.staff(), 'proposals')))
  })
  test('mark viewed: only sent → viewed with the server time', async () => {
    const db = as.anon()
    await assertFails(updateDoc(doc(db, 'proposals', 'sent1'), { status: 'viewed', viewedAt: new Date(0) }))
    await assertFails(updateDoc(doc(db, 'proposals', 'sent1'), { status: 'viewed', viewedAt: serverTimestamp(), depositPct: 0 }))
    await assertSucceeds(updateDoc(doc(db, 'proposals', 'sent1'), { status: 'viewed', viewedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db, 'proposals', 'draft1'), { status: 'viewed', viewedAt: serverTimestamp() }))
  })
  test('sign: once, with the matching fingerprint, nothing else changed', async () => {
    const db = as.anon()
    const ref = doc(db, 'proposals', 'sent1')
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ docHash: 'b'.repeat(64) }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ consent: false }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ admin: true }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ name: '' }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ image: 'x'.repeat(300000) }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ image: 'https://tracker.example/pixel.png' }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ image: 'data:image/svg+xml;base64,PHN2Zz4=' }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ image: 'data:image/png;base64,AA"><script>' }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: new Date(0), signature: signature() }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature(), items: [] }))
    await assertFails(updateDoc(ref, { status: 'countersigned', signedAt: serverTimestamp(), signature: signature() }))
    // A real phone signature is a long PNG: must still pass the picture check.
    await assertSucceeds(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ image: `data:image/png;base64,${'iVBORw0KGgo+/'.repeat(19000)}=` }) }))
    await assertFails(updateDoc(ref, { status: 'signed', signedAt: serverTimestamp(), signature: signature({ name: 'Someone else' }) }))
    await assertFails(updateDoc(doc(db, 'proposals', 'draft1'), { status: 'signed', signedAt: serverTimestamp(), signature: signature({ docHash: null }) }))
    await assertFails(updateDoc(doc(db, 'proposals', 'voidUnsigned'), { status: 'signed', signedAt: serverTimestamp(), signature: signature() }))
  })
  test('payment fields, prices and fingerprint: never from the public', async () => {
    for (const who of outsiders) {
      const db = as[who]()
      await assertFails(updateDoc(doc(db, 'proposals', 'signed1'), { deposit: { status: 'paid', amount: 25000, env: 'live' } }))
      await assertFails(updateDoc(doc(db, 'proposals', 'signed1'), { 'payments.balance': { status: 'paid' } }))
      await assertFails(updateDoc(doc(db, 'proposals', 'signed1'), { requests: { balance: true } }))
      await assertFails(updateDoc(doc(db, 'proposals', 'sent1'), { depositPct: 1 }))
      await assertFails(updateDoc(doc(db, 'proposals', 'sent1'), { docHash: 'b'.repeat(64) }))
      await assertFails(updateDoc(doc(db, 'proposals', 'sent1'), { 'customer.email': 'attacker@example.com' }))
      await assertFails(setDoc(doc(db, 'proposals', 'mine'), sentProposal()))
      await assertFails(deleteDoc(doc(db, 'proposals', 'draft1')))
    }
  })
  test('staff deletes: drafts, unsigned voids and test payments only', async () => {
    const db = as.staff()
    await assertSucceeds(deleteDoc(doc(db, 'proposals', 'draft1')))
    await assertSucceeds(deleteDoc(doc(db, 'proposals', 'voidUnsigned')))
    await assertSucceeds(deleteDoc(doc(db, 'proposals', 'sandboxPaid')))
    for (const id of ['sent1', 'signed1', 'voidSigned', 'livePaid', 'sandboxThenLive']) await assertFails(deleteDoc(doc(db, 'proposals', id)))
  })
  test('staff writes must be stamped by the signed-in staff member', async () => {
    const db = as.staff()
    await assertSucceeds(updateDoc(doc(db, 'proposals', 'sent1'), { title: 'New', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'proposals', 'sent1'), { title: 'New', ...stamp('other@example.com') }))
  })
  test('staff cannot type in payments; asking for one is fine', async () => {
    const db = as.staff()
    await assertFails(updateDoc(doc(db, 'proposals', 'signed1'), { deposit: { status: 'paid', amount: 25000, env: 'live' }, ...stamp() }))
    await assertFails(updateDoc(doc(db, 'proposals', 'signed1'), { 'payments.balance': { status: 'paid' }, ...stamp() }))
    await assertFails(updateDoc(doc(db, 'proposals', 'livePaid'), { 'deposit.status': 'refunded', ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'proposals', 'signed1'), { requests: { balance: true }, ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'proposals', 'livePaid'), { status: 'countersigned', ...stamp() }))
  })
})

describe('proposalFiles: images by token', () => {
  test('anyone with the id can open one; nobody outside staff lists or writes', async () => {
    await assertSucceeds(getDoc(doc(as.anon(), 'proposalFiles', 'sent1-render')))
    for (const who of outsiders) {
      const db = as[who]()
      await assertFails(getDocs(collection(db, 'proposalFiles')))
      await assertFails(setDoc(doc(db, 'proposalFiles', 'sent1-render'), { dataUrl: 'data:,x', ...stamp() }))
      await assertFails(deleteDoc(doc(db, 'proposalFiles', 'sent1-render')))
    }
    await assertSucceeds(setDoc(doc(as.staff(), 'proposalFiles', 'sent1-photo'), { dataUrl: 'data:,x', ...stamp() }))
  })
})

describe('collections nobody named', () => {
  test('anything else is refused, even to staff', async () => {
    for (const who of [...outsiders, 'staff']) {
      const db = as[who]()
      await assertFails(getDocs(collection(db, 'payments')))
      await assertFails(setDoc(doc(db, 'admin', 'x'), { a: 1 }))
      await assertFails(setDoc(doc(db, 'proposals', 'sent1', 'sub', 'x'), { a: 1 }))
    }
  })
})
