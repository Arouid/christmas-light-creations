import { useEffect, useState } from 'react'
import { STATUS_LABELS, getFirebaseApp } from '../lib/firebase'
import { redirectOutcome, signInWithGoogle } from '../lib/googleSignIn'
import { logSignIn } from '../lib/signInLog'
import { logActivity } from './activity'
import { demoMode } from './demo'
import { demoLeads } from './demoLeads'

// Signed-in user + live list of leads. Without a Firebase config it runs on
// sample data so the page can be previewed.
export function useLeads() {
  const [user, setUser] = useState(demoMode ? { email: 'demo@example.com' } : undefined)
  const [leads, setLeads] = useState(demoMode ? demoLeads : null)
  const [error, setError] = useState(null)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (demoMode) return
    let unsubLeads = () => {}
    let unsubAuth = () => {}
    let cancelled = false

    ;(async () => {
      const app = await getFirebaseApp()
      const fb = await import('firebase/auth')
      const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore')
      if (cancelled) return
      const db = getFirestore(app)
      const auth = fb.getAuth(app)
      // Back from a same-page Google sign-in (iPhone): log it; say so if it failed.
      redirectOutcome(fb, auth).then((r) => {
        if (r.user) logSignIn({ ok: true, email: r.user.email })
        else if (r.code) logSignIn({ ok: false, code: r.code })
        if (!cancelled) setAuthError(r.message ?? null)
      })
      unsubAuth = fb.onAuthStateChanged(auth, (u) => {
        unsubLeads()
        setUser(u)
        setLeads(null)
        setError(null)
        if (!u) return
        unsubLeads = onSnapshot(
          query(collection(db, 'leads'), orderBy('createdAt', 'desc')),
          (snap) => setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }))),
          (err) => {
            setError(err.code === 'permission-denied' ? 'not-staff' : err.message)
            if (err.code === 'permission-denied') logSignIn({ ok: false, email: u.email, code: 'not-staff' })
          },
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
    const fb = await import('firebase/auth')
    setAuthError(null)
    try {
      const cred = await signInWithGoogle(fb, fb.getAuth(app))
      if (cred?.user) logSignIn({ ok: true, email: cred.user.email }) // popup; redirect logs on return
    } catch (err) {
      logSignIn({ ok: false, code: err?.code ?? err?.message })
      throw err
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
      logStatus(id, changes)
      return
    }
    const app = await getFirebaseApp()
    const { getFirestore, doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    await updateDoc(doc(getFirestore(app), 'leads', id), {
      ...changes,
      updatedAt: serverTimestamp(),
      updatedBy: user.email,
    })
    logStatus(id, changes)
  }

  // Recent activity (docs/specs/dashboard.md): status changes only, not notes.
  function logStatus(id, changes) {
    if (changes.status && changes.status !== 'new') logActivity('lead-status', { type: 'lead', id }, STATUS_LABELS[changes.status] ?? changes.status)
  }

  // Only for leads marked Spam / test (the rules refuse anything else).
  async function deleteLead(id) {
    if (demoMode) {
      setLeads((ls) => ls.filter((l) => l.id !== id))
      return
    }
    const app = await getFirebaseApp()
    const { getFirestore, doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(getFirestore(app), 'leads', id))
  }

  return { user, leads, error, authError, signIn, signOut: signOutUser, updateLead, deleteLead, demo: demoMode }
}
