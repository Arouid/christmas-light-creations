// Staff: when a customer last signed in to their own account (/account/).
// Written only by the server (myAccount); staff read customerLogins/{email}.
import { getFirebaseApp } from './firebase.js'

// null = never signed in. Throws if it can't be read (e.g. rules not yet republished).
export async function getCustomerLogin(email) {
  const key = String(email ?? '').trim().toLowerCase()
  if (!key || key.includes('/')) return null
  const [f, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
  const snap = await f.getDoc(f.doc(f.getFirestore(app), 'customerLogins', key))
  if (!snap.exists()) return null
  const d = snap.data()
  return { firstAt: d.firstAt?.toDate?.() ?? null, lastAt: d.lastAt?.toDate?.() ?? null, provider: d.provider ?? '' }
}

const day = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const dayTime = (d) => `${day(d)}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

export function loginLine(rec) {
  if (!rec?.lastAt) return 'Customer login: never'
  const first = rec.firstAt && day(rec.firstAt) !== day(rec.lastAt) ? ` · first ${day(rec.firstAt)}` : ''
  return `Customer login: last signed in ${dayTime(rec.lastAt)}${first}${rec.provider ? ` (${rec.provider})` : ''}`
}
