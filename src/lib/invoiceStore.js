// Firestore access for the customer's invoice page (no sign-in): read one
// invoice by its link token and note that it was opened. firestore.rules
// allow exactly that from the public; payments go through the server.
import { getFirebaseApp } from './firebase.js'

async function fs() {
  const [mod, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
  return { ...mod, db: mod.getFirestore(app) }
}

export async function getInvoice(token) {
  const f = await fs()
  const snap = await f.getDoc(f.doc(f.db, 'invoices', token))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function markInvoiceViewed(token) {
  const f = await fs()
  await f.updateDoc(f.doc(f.db, 'invoices', token), { viewedAt: f.serverTimestamp() })
}
