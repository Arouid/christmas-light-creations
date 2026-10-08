import { useEffect, useState } from 'react'
import { firebaseReady, getFirebaseApp } from '../lib/firebase'
import { demoLeads } from './demoLeads'

// Signed-in user + live list of leads. Without a Firebase config it runs on
// sample data so the page can be previewed.
export function useLeads() {
  const [user, setUser] = useState(firebaseReady ? undefined : { email: 'demo@example.com' })
  const [leads, setLeads] = useState(firebaseReady ? null : demoLeads)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!firebaseReady) return
    let unsubLeads = () => {}
    let unsubAuth = () => {}
    let cancelled = false

    ;(async () => {
      const app = await getFirebaseApp()
      const { getAuth, onAuthStateChanged } = await import('firebase/auth')
      const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore')
      if (cancelled) return
      const db = getFirestore(app)
      unsubAuth = onAuthStateChanged(getAuth(app), (u) => {
        unsubLeads()
        setUser(u)
        setLeads(null)
        setError(null)
        if (!u) return
        unsubLeads = onSnapshot(
          query(collection(db, 'leads'), orderBy('createdAt', 'desc')),
          (snap) => setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }))),
          (err) => setError(err.code === 'permission-denied' ? 'not-staff' : err.message),
        )
      })
    })()

    return () => {
      cancelled = true
      unsubLeads()
      unsubAuth()
    }
  }, [])

  async function signIn() {
    const app = await getFirebaseApp()
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
    await signInWithPopup(getAuth(app), new GoogleAuthProvider())
  }

  async function signOutUser() {
    if (!firebaseReady) return
    const app = await getFirebaseApp()
    const { getAuth, signOut } = await import('firebase/auth')
    await signOut(getAuth(app))
  }

  async function updateLead(id, changes) {
    if (!firebaseReady) {
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...changes } : l)))
      return
    }
    const app = await getFirebaseApp()
    const { getFirestore, doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    await updateDoc(doc(getFirestore(app), 'leads', id), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy: user.email,
    })
  }

  return { user, leads, error, signIn, signOut: signOutUser, updateLead, demo: !firebaseReady }
}
