import { useEffect, useState } from 'react'
import { getFirebaseApp } from '../lib/firebase'
import { demoMode } from './demo'
import { demoLeads } from './demoLeads'

// Signed-in user + live list of leads. Without a Firebase config it runs on
// sample data so the page can be previewed.
export function useLeads() {
  const [user, setUser] = useState(demoMode ? { email: 'demo@example.com' } : undefined)
  const [leads, setLeads] = useState(demoMode ? demoLeads : null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (demoMode) return
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
    const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth')
    const auth = getAuth(app)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(auth, provider)
    } catch (err) {
      // The installed app (home-screen mode) can't always open a popup:
      // fall back to a full-page Google sign-in that returns here.
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(err?.code)) {
        await signInWithRedirect(auth, provider)
      } else {
        throw err
      }
    }
  }

  async function signOutUser() {
    if (demoMode) return
    const app = await getFirebaseApp()
    const { getAuth, signOut } = await import('firebase/auth')
    await signOut(getAuth(app))
  }

  async function updateLead(id, changes) {
    if (demoMode) {
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

  return { user, leads, error, signIn, signOut: signOutUser, updateLead, demo: demoMode }
}
