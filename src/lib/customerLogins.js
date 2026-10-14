// Staff: when a customer last signed in to their own account (/account/), and
// whether they have the app on their phone (owner 2026-10-12: "can we see who
// has chosen to install the app"). Written only by the server (myAccount);
// staff read customerLogins/{key}: one doc per lowercase email, and one per
// E.164 phone for phone sign-ins (docs/specs/phone-sign-in.md).
import { getFirebaseApp } from './firebase.js'
import { customerEmailKeys, customerPhoneKeys } from '../../functions/account.js'

// null = never signed in. Throws if it can't be read (e.g. rules not yet republished).
export async function getCustomerLogin(email) {
  const key = String(email ?? '').trim().toLowerCase()
  if (!key || key.includes('/')) return null
  const [f, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
  const snap = await f.getDoc(f.doc(f.getFirestore(app), 'customerLogins', key))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    firstAt: d.firstAt?.toDate?.() ?? null, lastAt: d.lastAt?.toDate?.() ?? null, provider: d.provider ?? '',
    app: d.app ? { device: String(d.app.device ?? ''), at: d.app.at?.toDate?.() ?? null } : null,
  }
}

// Every key a record can sign in by: its emails and its phones (incl. the
// ones linked from old records). Pure.
export const loginKeys = (rec) => [...customerEmailKeys(rec ?? {}), ...customerPhoneKeys(rec ?? {})]

// The newest sign-in across all of a record's keys (a customer may use Google
// one day and their phone the next), keeping the earliest first sign-in and
// the app note from whichever doc has it. null = never.
export function newestLogin(recs) {
  const list = recs.filter(Boolean)
  if (!list.length) return null
  const newest = list.reduce((a, b) => ((b.lastAt ?? 0) > (a.lastAt ?? 0) ? b : a))
  const first = list.map((r) => r.firstAt).filter(Boolean).sort((a, b) => a - b)[0] ?? null
  return { ...newest, firstAt: first, app: newest.app ?? list.find((r) => r.app)?.app ?? null }
}
export async function getLatestLogin(rec) {
  return newestLogin(await Promise.all(loginKeys(rec).map(getCustomerLogin)))
}

const day = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const dayTime = (d) => `${day(d)}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

export function loginLine(rec) {
  if (!rec?.lastAt) return 'Customer login: never'
  const first = rec.firstAt && day(rec.firstAt) !== day(rec.lastAt) ? ` · first ${day(rec.firstAt)}` : ''
  const app = rec.app ? ` · 📱 has the app${rec.app.device ? ` (${rec.app.device}` : ''}${rec.app.at ? `${rec.app.device ? ', ' : ' ('}since ${day(rec.app.at)}` : ''}${rec.app.device || rec.app.at ? ')' : ''}` : ''
  return `Customer login: last signed in ${dayTime(rec.lastAt)}${first}${rec.provider ? ` (${rec.provider})` : ''}${app}`
}
