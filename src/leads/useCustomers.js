import { useEffect, useState } from 'react'
import { getFirebaseApp } from '../lib/firebase'
import { byName, customerId, setPath } from '../lib/customers'
import { demoMode } from './demo'
import { demoCustomers } from './demoCustomers'

async function db() {
  const [fs, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
  return { fs, db: fs.getFirestore(app) }
}

// Live list of customers for a signed-in staff member, plus edit helpers.
// Every write stamps updatedAt/updatedBy (required by firestore.rules).
export function useCustomers(user) {
  const [customers, setCustomers] = useState(demoMode ? demoCustomers : null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (demoMode || !user) return
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const { fs, db: store } = await db()
      if (cancelled) return
      unsub = fs.onSnapshot(
        fs.collection(store, 'customers'),
        (snap) => setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byName)),
        (err) => setError(err.code === 'permission-denied' ? 'not-staff' : err.message),
      )
    })()
    return () => { cancelled = true; unsub() }
  }, [user])

  // path like "gateCode" or "seasons.2026.install.paid"
  async function update(id, path, value) {
    if (demoMode) {
      setCustomers((cs) => cs.map((c) => (c.id === id ? setPath(c, path, value) : c)))
      return
    }
    const { fs, db: store } = await db()
    await fs.updateDoc(fs.doc(store, 'customers', id), {
      [path]: value,
      updatedAt: fs.serverTimestamp(),
      updatedBy: user.email,
    })
  }

  async function create(fields) {
    const id = customerId(fields.fullName)
    if (demoMode) {
      setCustomers((cs) => [...cs, { id, ...fields }].sort(byName))
      return id
    }
    const { fs, db: store } = await db()
    const ref = fs.doc(store, 'customers', id)
    if ((await fs.getDoc(ref)).exists()) throw new Error(`A customer named "${fields.fullName}" already exists.`)
    await fs.setDoc(ref, { ...fields, updatedAt: fs.serverTimestamp(), updatedBy: user.email })
    return id
  }

  // Merge-writes imported records; existing app-only fields are kept.
  async function importMany(records, onProgress) {
    if (demoMode) {
      setCustomers((cs) => {
        const map = new Map(cs.map((c) => [c.id, c]))
        records.forEach(({ id, data }) => map.set(id, { ...map.get(id), id, ...data }))
        return [...map.values()].sort(byName)
      })
      onProgress?.(records.length)
      return
    }
    const { fs, db: store } = await db()
    for (let i = 0; i < records.length; i += 400) {
      const batch = fs.writeBatch(store)
      records.slice(i, i + 400).forEach(({ id, data }) => batch.set(
        fs.doc(store, 'customers', id),
        { ...data, importedAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp(), updatedBy: user.email },
        { merge: true },
      ))
      await batch.commit()
      onProgress?.(Math.min(i + 400, records.length))
    }
  }

  return { customers, error, update, create, importMany }
}
