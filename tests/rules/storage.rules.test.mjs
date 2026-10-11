// storage.rules against the Storage + Firestore emulators (docs/specs/job-record.md).
// Needs Java 21+. Run: npm run test:rules  (starts and stops both emulators;
// project "demo-clc" never touches the real database or bucket). The rules
// read the Firestore `staff` collection, so both emulators run together.
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import { deleteObject, getBytes, getDownloadURL, getMetadata, ref, uploadBytes } from 'firebase/storage'

let env
const STAFF = 'boss@example.com'
const OTHER = 'helper@example.com'
const OWNER = 'owner@example.com'

const jpeg = (bytes = 2048) => new Uint8Array(bytes).fill(255)
const meta = (by = STAFF, over = {}) => ({ contentType: 'image/jpeg', customMetadata: { by, customerId: 'pat-test', season: '2026' }, ...over })
const PATH = 'customers/pat-test/2026/p1.jpg'
const THUMB = 'customers/pat-test/2026/p1-thumb.jpg'

const google = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).storage()
const as = {
  anon: () => env.unauthenticatedContext().storage(),
  customer: () => env.authenticatedContext('cust', { email: 'cust@example.com', email_verified: true, firebase: { sign_in_provider: 'password' } }).storage(),
  stranger: () => google('str', 'stranger@gmail.com'),
  unverified: () => env.authenticatedContext('unv', { email: STAFF, email_verified: false, firebase: { sign_in_provider: 'google.com' } }).storage(),
  staffEmailLink: () => env.authenticatedContext('boss3', { email: STAFF, email_verified: true, firebase: { sign_in_provider: 'password' } }).storage(),
  staff: () => google('boss', STAFF),
  staffUpper: () => google('boss2', 'Boss@Example.com'),
  other: () => google('helper', OTHER),
  owner: () => google('owner', OWNER),
}
const outsiders = ['anon', 'customer', 'stranger', 'unverified', 'staffEmailLink']

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-clc',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  })
})
after(async () => { await env?.cleanup() })
beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'staff', STAFF), { name: 'Boss' })
    await setDoc(doc(db, 'staff', OTHER), { name: 'Helper' })
    await setDoc(doc(db, 'staff', OWNER), { name: 'Scott', owner: true })
    const st = ctx.storage()
    await uploadBytes(ref(st, PATH), jpeg(), meta(STAFF))
    await uploadBytes(ref(st, THUMB), jpeg(512), meta(STAFF))
  })
})

describe('outsiders get nothing', () => {
  for (const who of outsiders) {
    test(`${who} cannot read, download, upload or delete a customer photo`, async () => {
      const st = as[who]()
      await assertFails(getMetadata(ref(st, PATH)))
      await assertFails(getDownloadURL(ref(st, PATH)))
      await assertFails(getBytes(ref(st, PATH)))
      await assertFails(uploadBytes(ref(st, 'customers/pat-test/2026/p2.jpg'), jpeg(), meta(STAFF)))
      await assertFails(deleteObject(ref(st, PATH)))
    })
  }
})

describe('staff', () => {
  test('staff read and download photos, in any letter case of their email', async () => {
    await assertSucceeds(getMetadata(ref(as.staff(), PATH)))
    await assertSucceeds(getDownloadURL(ref(as.staff(), PATH)))
    await assertSucceeds(getBytes(ref(as.staffUpper(), PATH)))
  })
  test('staff upload a JPEG under 2 MB stamped with their own email, under a season year', async () => {
    const st = as.staff()
    await assertSucceeds(uploadBytes(ref(st, 'customers/pat-test/2026/p2.jpg'), jpeg(), meta(STAFF)))
    await assertSucceeds(uploadBytes(ref(st, 'customers/pat-test/2026/p2-thumb.jpg'), jpeg(300), meta(STAFF)))
    await assertSucceeds(uploadBytes(ref(st, 'customers/another-customer/2025/p9.jpg'), jpeg(), meta(STAFF)))
  })
  test('refused: wrong type, too big, someone else’s name, no name, bad season, outside customers/', async () => {
    const st = as.staff()
    await assertFails(uploadBytes(ref(st, 'customers/pat-test/2026/x.png'), jpeg(), meta(STAFF, { contentType: 'image/png' })))
    await assertFails(uploadBytes(ref(st, 'customers/pat-test/2026/big.jpg'), jpeg(2 * 1024 * 1024 + 1), meta(STAFF)))
    await assertFails(uploadBytes(ref(st, 'customers/pat-test/2026/x.jpg'), jpeg(), meta(OTHER)))
    await assertFails(uploadBytes(ref(st, 'customers/pat-test/2026/x.jpg'), jpeg(), { contentType: 'image/jpeg' }))
    await assertFails(uploadBytes(ref(st, 'customers/pat-test/current/x.jpg'), jpeg(), meta(STAFF)))
    await assertFails(uploadBytes(ref(st, 'customers/pat-test/x.jpg'), jpeg(), meta(STAFF)))
    await assertFails(uploadBytes(ref(st, 'uploads/x.jpg'), jpeg(), meta(STAFF)))
    await assertFails(uploadBytes(ref(st, 'x.jpg'), jpeg(), meta(STAFF)))
  })
  test('a photo is never overwritten', async () => {
    await assertFails(uploadBytes(ref(as.staff(), PATH), jpeg(100), meta(STAFF)))
  })
  test('only the person who added a photo, or the owner, removes it', async () => {
    await assertFails(deleteObject(ref(as.other(), PATH)))
    await assertSucceeds(deleteObject(ref(as.staff(), PATH)))
    await assertSucceeds(deleteObject(ref(as.owner(), THUMB)))
  })
  test('the owner flag only counts on the staff list', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'staff', OTHER), { name: 'Helper', owner: 'yes' })
    })
    await assertFails(deleteObject(ref(as.other(), PATH)))
    await assertFails(deleteObject(ref(as.stranger(), PATH)))
  })
})
