// Live check of firestore.rules against the real project, as an anonymous
// visitor. Every attempt here must be REFUSED, so nothing is ever written.
// Run: npm run check:rules
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocsFromServer, serverTimestamp, terminate } from 'firebase/firestore'
import { firebaseConfig } from '../src/lib/firebase.js'

const db = getFirestore(initializeApp(firebaseConfig))

const valid = {
  firstName: 'Rules', lastName: 'Check', email: 'rules-check@example.com', phone: '',
  address: '1 Test St', city: 'Pearland', zip: '77581', contactMethod: 'Phone',
  message: 'Automated rules check, should be refused.', status: 'new', notes: '', createdAt: serverTimestamp(),
}

const cases = [
  ['Public can read leads', () => getDocsFromServer(collection(db, 'leads'))],
  ['Public can read staff list', () => getDocsFromServer(collection(db, 'staff'))],
  ['Create with status other than new', () => addDoc(collection(db, 'leads'), { ...valid, status: 'booked' })],
  ['Create with an extra field', () => addDoc(collection(db, 'leads'), { ...valid, admin: true })],
  ['Create without an address', () => addDoc(collection(db, 'leads'), { ...valid, address: '' })],
  ['Create with a bad email', () => addDoc(collection(db, 'leads'), { ...valid, email: 'not-an-email' })],
  ['Create with pre-filled notes', () => addDoc(collection(db, 'leads'), { ...valid, notes: 'hi' })],
  ['Write to staff list', () => addDoc(collection(db, 'staff'), { name: 'intruder' })],
]

let failed = 0
for (const [name, run] of cases) {
  try {
    await run()
    failed++
    console.log(`FAIL  ${name}: was ALLOWED`)
  } catch (e) {
    const ok = e.code === 'permission-denied'
    if (!ok) failed++
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}: ${e.code}`)
  }
}
await terminate(db)
console.log(failed ? `\n${failed} problem(s)` : '\nAll refused as expected')
process.exit(failed ? 1 : 0)
