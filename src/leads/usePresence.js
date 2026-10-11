import { useEffect, useMemo, useState } from 'react'
import { getFirebaseApp } from '../lib/firebase'
import { toMs } from '../lib/activity'
import { BEAT_MS, deviceLabel, presenceRows } from '../lib/presence'
import { demoMode } from './demo'
import { useLiveCollection, useLiveSince } from './staffStore'

const byId = (a, b) => a.id.localeCompare(b.id)

// Check in while the app is on screen: now, every BEAT_MS, and on coming back
// to the tab. Only your own presence doc (firestore.rules).
export function usePresenceBeat(user) {
  useEffect(() => {
    if (demoMode || !user?.email) return
    const homeScreen = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
    const device = deviceLabel(navigator.userAgent, homeScreen)
    let stopped = false
    async function beat() {
      if (stopped || document.visibilityState !== 'visible') return
      try {
        const [fs, app] = await Promise.all([import('firebase/firestore'), getFirebaseApp()])
        await fs.setDoc(fs.doc(fs.getFirestore(app), 'presence', user.email.toLowerCase()), { lastSeen: fs.serverTimestamp(), device })
      } catch (e) {
        console.warn('Presence not saved', e.code ?? e.message) // rules not published yet
      }
    }
    beat()
    const timer = setInterval(beat, BEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [user?.email])
}

// Everyone on the staff list with on now / last seen / never.
export function usePresence(user, names, now) {
  const staff = useLiveCollection(user, 'staff', byId)
  const seen = useLiveCollection(user, 'presence', byId)
  const rows = useMemo(() => presenceRows(staff.items ?? [], seen.items ?? [], names, now), [staff.items, seen.items, names, now])
  return { rows, error: seen.error, loading: !staff.items }
}

const DAYS = 7
const newestFirst = (a, b) => toMs(b.at) - toMs(a.at)

// The last 7 days of staff sign-in attempts (src/lib/signInLog.js).
export function useSignIns(user) {
  const [since] = useState(() => new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000))
  const { items, error } = useLiveSince(user, 'signInLog', 'at', since, newestFirst)
  return { entries: items ?? [], error }
}
