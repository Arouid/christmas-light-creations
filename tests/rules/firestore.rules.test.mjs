// firestore.rules against the Firestore emulator (security review 2026-10-09).
// Needs Java 21+. Run: npm run test:rules  (starts and stops the emulator;
// project "demo-clc" never touches the real database).
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

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
const invoice = (over = {}) => ({
  status: 'open', customerId: 'pat-test', customer: { name: 'Pat Test', email: 'cust@example.com', phone: '', address: '1 Main St' },
  season: '2026', kind: 'install', items: [{ id: 'l1', description: 'Re-install', cents: 45000 }], note: '', terms: 'receipt', dueDate: '2026-11-01', ...over,
})
const offline = (over = {}) => ({ method: 'Check', date: '2026-11-05', note: '#1043', by: STAFF, at: 1700000000000, ...over })
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
    await setDoc(doc(db, 'invoices', 'invOpen'), invoice({ number: 'CLC-2026-0001', sent: { invoice: { at: 1 } } }))
    await setDoc(doc(db, 'invoices', 'invDraft'), invoice({ status: 'draft', dueDate: '' }))
    await setDoc(doc(db, 'invoices', 'invPaidOnline'), invoice({ status: 'paid', number: 'CLC-2026-0002', payment: { status: 'paid', cents: 45000, env: 'live' } }))
    await setDoc(doc(db, 'invoices', 'invPaidOffline'), invoice({ status: 'paid', number: 'CLC-2026-0003', offline: offline() }))
    await setDoc(doc(db, 'invoices', 'invVoid'), invoice({ status: 'void', number: 'CLC-2026-0004' }))
    await setDoc(doc(db, 'invoices', 'invLocked'), invoice({ number: 'CLC-2026-0005', paymentLock: { orderId: 'ORDER123', at: Date.now() } }))
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
    for (const c of ['leads', 'customers', 'serviceCalls', 'gateCodes', 'views', 'messages', 'pastRequests', 'signs', 'routes', 'designs', 'designFiles', 'settings', 'customerLogins', 'invoices', 'staff']) {
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
  test('synced messages: staff link an unmatched one to a customer or dismiss it', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'messages', 'gv-1'), { unmatched: true, direction: 'in', kind: 'text', phone: '+15550100101', source: 'voice-email' })
    })
    const db = as.staff()
    await assertFails(updateDoc(doc(db, 'messages', 'gv-1'), { unmatched: false, ...stamp() }))
    await assertFails(updateDoc(doc(db, 'messages', 'gv-1'), { dismissed: true, ...stamp('someone@else.com') }))
    await assertSucceeds(updateDoc(doc(db, 'messages', 'gv-1'), { dismissed: true, ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'messages', 'gv-1'), { customerId: 'pat-test', unmatched: false, dismissed: false, ...stamp() }))
    await assertFails(setDoc(doc(db, 'messages', 'new-unlinked'), { direction: 'in', dismissed: true, ...stamp() }))
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

describe('invoices: customer link (token = document id)', () => {
  test('anyone with the link can open it; only staff list', async () => {
    await assertSucceeds(getDoc(doc(as.anon(), 'invoices', 'invOpen')))
    for (const who of outsiders) await assertFails(getDocs(collection(as[who](), 'invoices')))
    await assertSucceeds(getDocs(collection(as.staff(), 'invoices')))
  })
  test('the public can only note it was opened, once, with the server time', async () => {
    const db = as.anon()
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { viewedAt: new Date(0) }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { viewedAt: serverTimestamp(), status: 'paid' }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invDraft'), { viewedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invOpen'), { viewedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { viewedAt: serverTimestamp() }))
  })
  test('outsiders (customers too) never write payments, amounts or anything else', async () => {
    for (const who of outsiders) {
      const db = as[who]()
      await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid' }))
      await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { payment: { status: 'paid', cents: 45000, env: 'live' } }))
      await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid', offline: offline({ by: 'cust@example.com' }) }))
      await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { items: [{ id: 'l1', description: 'Re-install', cents: 1 }] }))
      await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { 'customer.email': 'attacker@example.com' }))
      await assertFails(setDoc(doc(db, 'invoices', 'mine'), invoice()))
      await assertFails(deleteDoc(doc(db, 'invoices', 'invDraft')))
    }
  })
  test('staff create drafts or sent invoices, stamped, never with server fields', async () => {
    const db = as.staff()
    await assertSucceeds(setDoc(doc(db, 'invoices', 'new1'), { ...invoice({ status: 'draft', dueDate: '' }), ...stamp() }))
    await assertSucceeds(setDoc(doc(db, 'invoices', 'new2'), { ...invoice(), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'new3'), { ...invoice(), ...stamp('other@example.com') }))
    await assertFails(setDoc(doc(db, 'invoices', 'new4'), { ...invoice({ status: 'paid' }), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'new5'), { ...invoice({ number: 'CLC-2026-9999' }), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'new6'), { ...invoice({ payment: { status: 'paid' } }), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'new7'), { ...invoice({ offline: offline() }), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'new8'), { ...invoice({ items: [] }), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'new9'), { ...invoice({ dueDate: '' }), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'newA'), { ...invoice({ kind: 'storage' }), ...stamp() }))
    await assertFails(setDoc(doc(db, 'invoices', 'newB'), { ...invoice({ customer: { name: 'x', admin: true } }), ...stamp() }))
  })
  test('staff edit, send and void unpaid ones; a sent one never goes back to draft', async () => {
    const db = as.staff()
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invDraft'), { status: 'open', dueDate: '2026-11-01', ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invOpen'), { items: [{ id: 'l1', description: 'Re-install', cents: 40000 }], emailAgainAt: serverTimestamp(), ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'draft', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { number: 'CLC-2026-0100', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { 'sent.invoice': null, ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { paymentLock: null, ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'void', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invVoid'), { status: 'open', ...stamp() }))
  })
  test('Mark paid: offline method by the signed-in staff member, never over an online payment or a payment in progress', async () => {
    const db = as.staff()
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid', offline: offline({ by: 'other@example.com' }), ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid', offline: offline({ method: 'Bitcoin' }), ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid', offline: offline(), items: [{ id: 'l1', description: 'x', cents: 1 }], ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid', payment: { status: 'paid' }, offline: offline(), ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invLocked'), { status: 'paid', offline: offline(), ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invOpen'), { status: 'paid', offline: offline(), ...stamp() }))
    // A lock left by a crashed payment (older than 2 minutes) doesn't block it forever.
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invoices', 'invStaleLock'), invoice({ number: 'CLC-2026-0006', paymentLock: { orderId: 'ORDER9', at: Date.now() - 10 * 60 * 1000 } }))
    })
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invStaleLock'), { status: 'paid', offline: offline(), ...stamp() }))
  })
  test('Undo Mark paid; online payments and paid invoices stay as they are', async () => {
    const db = as.staff()
    await assertFails(updateDoc(doc(db, 'invoices', 'invPaidOnline'), { status: 'open', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invPaidOnline'), { status: 'void', ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invPaidOnline'), { items: [{ id: 'l1', description: 'x', cents: 1 }], ...stamp() }))
    await assertFails(updateDoc(doc(db, 'invoices', 'invPaidOffline'), { items: [{ id: 'l1', description: 'x', cents: 1 }], ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invPaidOnline'), { remindersOff: true, ...stamp() }))
    await assertSucceeds(updateDoc(doc(db, 'invoices', 'invPaidOffline'), { status: 'open', offline: deleteField(), ...stamp() }))
  })
  test('staff delete only never-sent drafts', async () => {
    const db = as.staff()
    await assertSucceeds(deleteDoc(doc(db, 'invoices', 'invDraft')))
    for (const id of ['invOpen', 'invPaidOnline', 'invPaidOffline', 'invVoid']) await assertFails(deleteDoc(doc(db, 'invoices', id)))
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

describe('staffPrefs: each staff member’s own alert state (docs/specs/staff-alerts.md)', () => {
  const OTHER = 'katie@example.com'
  const asOther = () => env.authenticatedContext('katie', { email: OTHER, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore()
  const devices = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`fid${i}`, { name: 'iPhone', at: 1 }]))
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'staff', OTHER), { name: 'Katie' })
      await setDoc(doc(ctx.firestore(), 'staffPrefs', OTHER), { pushDevices: { fidK: { name: 'Android phone', at: 1 } } })
    })
  })
  test('staff read and write only their own doc, stamped, known fields', async () => {
    const db = as.staff()
    await assertSucceeds(setDoc(doc(db, 'staffPrefs', STAFF), { messagesSeenAt: serverTimestamp(), ...stamp() }, { merge: true }))
    await assertSucceeds(setDoc(doc(db, 'staffPrefs', STAFF), { pushDevices: { fid1: { name: 'iPhone', at: 1 } }, ...stamp() }, { merge: true }))
    await assertSucceeds(updateDoc(doc(db, 'staffPrefs', STAFF), { 'pushDevices.fid1': deleteField(), ...stamp() }))
    await assertSucceeds(getDoc(doc(db, 'staffPrefs', STAFF)))
    await assertFails(setDoc(doc(db, 'staffPrefs', STAFF), { messagesSeenAt: serverTimestamp(), ...stamp('someone@else.com') }, { merge: true }))
    await assertFails(setDoc(doc(db, 'staffPrefs', STAFF), { isOwner: true, ...stamp() }, { merge: true }))
    await assertFails(setDoc(doc(db, 'staffPrefs', STAFF), { messagesSeenAt: 'yesterday', ...stamp() }, { merge: true }))
    await assertFails(setDoc(doc(db, 'staffPrefs', STAFF), { pushDevices: devices(11), ...stamp() }, { merge: true }))
    await assertSucceeds(setDoc(doc(db, 'staffPrefs', STAFF), { pushDevices: devices(10), ...stamp() }, { merge: true }))
    await assertFails(deleteDoc(doc(db, 'staffPrefs', STAFF)))
  })
  test('nobody reads or changes another staff member’s doc, and outsiders get nothing', async () => {
    const db = as.staff()
    await assertFails(getDoc(doc(db, 'staffPrefs', OTHER)))
    await assertFails(getDocs(collection(db, 'staffPrefs')))
    await assertFails(setDoc(doc(db, 'staffPrefs', OTHER), { pushDevices: {}, ...stamp() }, { merge: true }))
    await assertSucceeds(getDoc(doc(asOther(), 'staffPrefs', OTHER)))
    for (const who of outsiders) {
      await assertFails(getDoc(doc(as[who](), 'staffPrefs', STAFF)))
      await assertFails(setDoc(doc(as[who](), 'staffPrefs', STAFF), { messagesSeenAt: serverTimestamp(), ...stamp() }))
    }
  })
  test('the doc id must be the lowercase email (another letter case is refused)', async () => {
    await assertFails(setDoc(doc(as.staff(), 'staffPrefs', 'Boss@Example.com'), { messagesSeenAt: serverTimestamp(), ...stamp() }))
    await assertSucceeds(setDoc(doc(as.staffUpper(), 'staffPrefs', STAFF), { messagesSeenAt: serverTimestamp(), ...stamp('Boss@Example.com') }))
  })
})

describe('activity: recent staff actions on Home (docs/specs/dashboard.md)', () => {
  const entry = (over = {}) => ({ at: serverTimestamp(), by: STAFF, action: 'email', target: { type: 'customer', id: 'pat-test', name: 'Pat Test' }, text: 'Your 2026 install', ...over })
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'activity', 'a1'), { ...entry(), at: new Date() }) })
  })
  test('staff add entries as themselves with the server time, known fields only', async () => {
    const db = as.staff()
    await assertSucceeds(getDocs(collection(db, 'activity')))
    await assertSucceeds(setDoc(doc(db, 'activity', 'n1'), entry()))
    await assertSucceeds(setDoc(doc(db, 'activity', 'n2'), entry({ action: 'call', target: { type: 'phone', id: '2815550166', name: '(281) 555-0166' }, text: '' })))
    await assertSucceeds(setDoc(doc(db, 'activity', 'n3'), { at: serverTimestamp(), by: STAFF, action: 'handling', target: { type: 'message', id: 'gv-1' } }))
    await assertFails(setDoc(doc(db, 'activity', 'n4'), entry({ by: 'someone@else.com' })))
    await assertFails(setDoc(doc(db, 'activity', 'n5'), entry({ at: new Date(0) })))
    await assertFails(setDoc(doc(db, 'activity', 'n6'), entry({ extra: true })))
    await assertFails(setDoc(doc(db, 'activity', 'n7'), entry({ action: '' })))
    await assertFails(setDoc(doc(db, 'activity', 'n8'), entry({ target: { type: 'customer', id: 'x', name: 'y', admin: true } })))
    await assertFails(setDoc(doc(db, 'activity', 'n9'), entry({ text: 'x'.repeat(301) })))
    await assertFails(setDoc(doc(db, 'activity', 'n10'), entry({ by: 'website' })))
  })
  test('nobody changes or deletes an entry; outsiders get nothing', async () => {
    await assertFails(updateDoc(doc(as.staff(), 'activity', 'a1'), { text: 'changed' }))
    await assertFails(deleteDoc(doc(as.staff(), 'activity', 'a1')))
    for (const who of outsiders) {
      await assertFails(getDoc(doc(as[who](), 'activity', 'a1')))
      await assertFails(getDocs(collection(as[who](), 'activity')))
      await assertFails(setDoc(doc(as[who](), 'activity', 'x'), entry()))
    }
  })
})

describe('leadDesigns: a design sent with an estimate request (docs/specs/public-designer.md)', () => {
  const jpeg = (n = 100) => `data:image/jpeg;base64,${'A'.repeat(n)}`
  const design = (over = {}) => ({ design: '{"version":1,"strands":[]}', photo: jpeg(), image: jpeg(), createdAt: serverTimestamp(), ...over })
  test('anyone can add one within the limits; the sample house needs no photo', async () => {
    for (const who of ['anon', 'customer', 'staff']) await assertSucceeds(setDoc(doc(as[who](), 'leadDesigns', `d-${who}`), design()))
    await assertSucceeds(setDoc(doc(as.anon(), 'leadDesigns', 'sample'), design({ photo: 'sample' })))
  })
  test('refused: extra fields, too big, not a JPEG, empty design, made-up time', async () => {
    const db = as.anon()
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x1'), design({ admin: true })))
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x2'), design({ photo: jpeg(450001) })))
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x3'), design({ image: jpeg(450001) })))
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x4'), design({ image: 'data:image/png;base64,AAAA' })))
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x5'), design({ photo: 'https://evil.example.com/x.jpg' })))
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x6'), design({ design: '' })))
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x7'), design({ design: 'x'.repeat(100001) })))
    await assertFails(setDoc(doc(db, 'leadDesigns', 'x8'), design({ createdAt: new Date(0) })))
  })
  test('only staff read them; nobody changes or deletes one', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'leadDesigns', 'kept'), { ...design(), createdAt: new Date() }) })
    for (const who of outsiders) {
      await assertFails(getDoc(doc(as[who](), 'leadDesigns', 'kept')))
      await assertFails(getDocs(collection(as[who](), 'leadDesigns')))
    }
    await assertSucceeds(getDoc(doc(as.staff(), 'leadDesigns', 'kept')))
    for (const who of ['anon', 'staff']) {
      await assertFails(updateDoc(doc(as[who](), 'leadDesigns', 'kept'), { design: '{}' }))
      await assertFails(deleteDoc(doc(as[who](), 'leadDesigns', 'kept')))
    }
  })
  test('an estimate request may point to its design', async () => {
    await assertSucceeds(setDoc(doc(as.anon(), 'leads', 'with-design'), lead({ designId: 'abc123' })))
    await assertFails(setDoc(doc(as.anon(), 'leads', 'bad-design'), lead({ designId: 'x'.repeat(61) })))
    await assertFails(setDoc(doc(as.anon(), 'leads', 'empty-design'), lead({ designId: '' })))
  })
})
