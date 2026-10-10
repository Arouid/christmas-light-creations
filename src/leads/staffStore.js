// Shared data access for the staff app: live collections, stamped writes and
// imports. In demo mode (?demo in dev, or no Firebase config) the same calls
// run against an in-memory copy of the sample data.
import { useEffect, useState } from 'react'
import { getFirebaseApp } from '../lib/firebase'
import { setPath } from '../lib/customers'
import { demoMode } from './demo'
import { demoData } from './demoData'

const demo = { data: structuredClone(demoData), listeners: new Set() }
const demoList = (coll) => Object.entries(demo.data[coll] ?? {}).map(([id, d]) => ({ id, ...d }))
function demoWrite(coll, id, fn) {
  demo.data[coll] ??= {}
  demo.data[coll][id] = fn(demo.data[coll][id])
  demo.listeners.forEach((f) => f())
}

async function fire() {
  const [fs, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
  return { fs, db: fs.getFirestore(app) }
}
// firestore.rules requires every staff write to carry these.
const stamp = (fs, user) => ({ updatedAt: fs.serverTimestamp(), updatedBy: user.email })

// `sort` must be a stable (module-level) function.
export function useLiveCollection(user, coll, sort) {
  const [items, setItems] = useState(demoMode ? demoList(coll).sort(sort) : null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (demoMode) {
      const refresh = () => setItems(demoList(coll).sort(sort))
      demo.listeners.add(refresh)
      return () => demo.listeners.delete(refresh)
    }
    if (!user) return
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const { fs, db } = await fire()
      if (cancelled) return
      unsub = fs.onSnapshot(
        fs.collection(db, coll),
        (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sort)),
        (err) => setError(err.code === 'permission-denied' ? 'not-staff' : err.message),
      )
    })()
    return () => { cancelled = true; unsub() }
  }, [user, coll, sort])

  return { items, error }
}

// Live records where `field == value` (e.g. one customer's text history).
// Sorted here, not in the query, so no Firestore index is needed.
export function useLiveQuery(user, coll, field, value, sort) {
  const pick = () => demoList(coll).filter((d) => d[field] === value).sort(sort)
  const [items, setItems] = useState(demoMode ? pick : null)

  useEffect(() => {
    if (demoMode) {
      const refresh = () => setItems(pick())
      refresh()
      demo.listeners.add(refresh)
      return () => demo.listeners.delete(refresh)
    }
    if (!user || !value) return
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const { fs, db } = await fire()
      if (cancelled) return
      unsub = fs.onSnapshot(
        fs.query(fs.collection(db, coll), fs.where(field, '==', value)),
        (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sort)),
        () => setItems([]),
      )
    })()
    return () => { cancelled = true; unsub() }
  }, [user, coll, field, value, sort]) // eslint-disable-line react-hooks/exhaustive-deps -- pick() reads the same args

  return items
}

// Live records where `field >= since` (a Date; e.g. messages synced this
// week). Single-field range: no Firestore index needed.
export function useLiveSince(user, coll, field, since, sort) {
  const ms = since.getTime()
  const pick = () => demoList(coll).filter((d) => toMillis(d[field]) >= ms).sort(sort)
  const [items, setItems] = useState(demoMode ? pick : null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (demoMode) {
      const refresh = () => setItems(pick())
      refresh()
      demo.listeners.add(refresh)
      return () => demo.listeners.delete(refresh)
    }
    if (!user) return
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const { fs, db } = await fire()
      if (cancelled) return
      unsub = fs.onSnapshot(
        fs.query(fs.collection(db, coll), fs.where(field, '>=', new Date(ms))),
        (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sort)),
        (err) => setError(err.code === 'permission-denied' ? 'not-staff' : err.message),
      )
    })()
    return () => { cancelled = true; unsub() }
  }, [user, coll, field, ms, sort]) // eslint-disable-line react-hooks/exhaustive-deps -- pick() reads the same args

  return { items, error }
}
const toMillis = (t) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : Date.parse(t ?? '') || 0)

// One record, live: undefined while loading, null if it doesn't exist.
export function useLiveDoc(user, coll, id) {
  const [data, setData] = useState(() => (demoMode ? demo.data[coll]?.[id] ?? null : undefined))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (demoMode) {
      const refresh = () => setData(demo.data[coll]?.[id] ?? null)
      refresh()
      demo.listeners.add(refresh)
      return () => demo.listeners.delete(refresh)
    }
    if (!user || !id) return
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const { fs, db } = await fire()
      if (cancelled) return
      unsub = fs.onSnapshot(
        fs.doc(db, coll, id),
        // 'estimate': a just-written server time shows at once instead of null.
        (snap) => setData(snap.exists() ? snap.data({ serverTimestamps: 'estimate' }) : null),
        (err) => setError(err.code === 'permission-denied' ? 'not-staff' : err.message),
      )
    })()
    return () => { cancelled = true; unsub() }
  }, [user, coll, id])

  return { data, error }
}

// Records where `field == value`, read once (e.g. a lead's messages).
export async function queryOnce(coll, field, value) {
  if (demoMode) return demoList(coll).filter((d) => d[field] === value)
  const { fs, db } = await fire()
  const snap = await fs.getDocs(fs.query(fs.collection(db, coll), fs.where(field, '==', value)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// path like "gateCode" or "seasons.2026.install.paid"
export async function updateField(user, coll, id, path, value) {
  if (demoMode) return demoWrite(coll, id, (d) => setPath(d ?? {}, path, value))
  const { fs, db } = await fire()
  await fs.updateDoc(fs.doc(db, coll, id), { [path]: value, ...stamp(fs, user) })
}

// New record with an automatic id; returns the id.
export async function addRecord(user, coll, data) {
  if (demoMode) {
    const id = `demo-${Date.now()}`
    demoWrite(coll, id, () => ({ ...data, updatedBy: user.email }))
    return id
  }
  const { fs, db } = await fire()
  const ref = await fs.addDoc(fs.collection(db, coll), { ...data, createdAt: fs.serverTimestamp(), ...stamp(fs, user) })
  return ref.id
}

// New record with a chosen id; refuses to overwrite an existing one.
export async function createRecord(user, coll, id, data) {
  if (demoMode) {
    if (demo.data[coll]?.[id]) throw new Error('already-exists')
    demoWrite(coll, id, () => ({ ...data, updatedBy: user.email }))
    return id
  }
  const { fs, db } = await fire()
  const ref = fs.doc(db, coll, id)
  if ((await fs.getDoc(ref)).exists()) throw new Error('already-exists')
  await fs.setDoc(ref, { ...data, createdAt: fs.serverTimestamp(), ...stamp(fs, user) })
  return id
}

// Merge-writes imported records; fields only set in the app are kept.
// Like Firestore's set(..., { merge: true }): nested maps merge, other values replace.
const deepMerge = (a, b) => {
  const out = { ...(a ?? {}) }
  for (const [k, v] of Object.entries(b ?? {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? deepMerge(out[k], v) : v
  return out
}

export async function mergeMany(user, coll, records, onProgress) {
  if (demoMode) {
    records.forEach(({ id, data }) => demoWrite(coll, id, (d) => deepMerge(d, data)))
    onProgress?.(records.length)
    return
  }
  const { fs, db } = await fire()
  for (let i = 0; i < records.length; i += 400) {
    const batch = fs.writeBatch(db)
    records.slice(i, i + 400).forEach(({ id, data }) => batch.set(
      fs.doc(db, coll, id), { ...data, importedAt: fs.serverTimestamp(), ...stamp(fs, user) }, { merge: true },
    ))
    await batch.commit()
    onProgress?.(Math.min(i + 400, records.length))
  }
}

// Create-or-replace fields of one record (arrays are replaced, not merged).
export async function saveRecord(user, coll, id, data) {
  if (demoMode) return demoWrite(coll, id, (d) => ({ ...d, ...data, updatedBy: user.email }))
  const { fs, db } = await fire()
  await fs.setDoc(fs.doc(db, coll, id), { ...data, ...stamp(fs, user) }, { merge: true })
}

// Set nested fields of one record, creating it if needed, in one stamped
// write: { 'pushDevices.<id>': {...} }. null removes the field; SERVER_TIME
// is the server's clock.
export const SERVER_TIME = Symbol('server time')
export async function mergePaths(user, coll, id, paths) {
  if (demoMode) {
    return demoWrite(coll, id, (d) => {
      const next = structuredClone({ ...d, updatedBy: user.email })
      for (const [path, v] of Object.entries(paths)) {
        const keys = path.split('.')
        const last = keys.pop()
        const parent = keys.reduce((o, k) => (o[k] ??= {}), next)
        if (v === null) delete parent[last]
        else parent[last] = v === SERVER_TIME ? Date.now() : v
      }
      return next
    })
  }
  const { fs, db } = await fire()
  const data = { ...stamp(fs, user) }
  for (const [path, v] of Object.entries(paths)) {
    const keys = path.split('.')
    const last = keys.pop()
    const parent = keys.reduce((o, k) => (o[k] ??= {}), data)
    parent[last] = v === null ? fs.deleteField() : v === SERVER_TIME ? fs.serverTimestamp() : v
  }
  await fs.setDoc(fs.doc(db, coll, id), data, { merge: true })
}

// Remove fields from a record (and set others) in one stamped write.
export async function clearFields(user, coll, id, fields, data = {}) {
  if (demoMode) return demoWrite(coll, id, (d) => { const next = { ...d, ...data, updatedBy: user.email }; fields.forEach((f) => delete next[f]); return next })
  const { fs, db } = await fire()
  await fs.updateDoc(fs.doc(db, coll, id), { ...data, ...Object.fromEntries(fields.map((f) => [f, fs.deleteField()])), ...stamp(fs, user) })
}

export async function deleteRecord(coll, id) {
  if (demoMode) {
    delete demo.data[coll]?.[id]
    demo.listeners.forEach((f) => f())
    return
  }
  const { fs, db } = await fire()
  await fs.deleteDoc(fs.doc(db, coll, id))
}

// One record, read once (e.g. a design's photo). null if it doesn't exist.
export async function getRecord(coll, id) {
  if (demoMode) {
    const d = demo.data[coll]?.[id]
    return d ? { id, ...d } : null
  }
  const { fs, db } = await fire()
  const snap = await fs.getDoc(fs.doc(db, coll, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
