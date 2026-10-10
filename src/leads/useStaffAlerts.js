// The 💬 New messages count and list for the signed-in staff member
// (docs/specs/staff-alerts.md): incoming messages synced and website
// estimate requests received in the last 7 days,
// "new" since they last opened the list (kept in their staffPrefs doc, or on
// this device if the database rules for it aren't published yet).
import { useMemo, useState } from 'react'
import { countNew, listSince, recentIncoming, requestItems, toMs } from '../lib/staffAlerts'
import { prefsId } from './push'
import { SERVER_TIME, mergePaths, useLiveDoc, useLiveSince } from './staffStore'

const LOCAL = 'clcMessagesSeenAt'
const readLocal = () => { try { return Number(localStorage.getItem(LOCAL)) || null } catch { return null } }
const bySynced = (a, b) => (b.syncedAt?.toMillis?.() ?? 0) - (a.syncedAt?.toMillis?.() ?? 0)

export function useStaffAlerts(user, leads) {
  const [since] = useState(() => new Date(listSince()))
  const { items, error } = useLiveSince(user, 'messages', 'syncedAt', since, bySynced)
  const prefs = useLiveDoc(user, 'staffPrefs', prefsId(user))
  const [localSeen, setLocalSeen] = useState(readLocal)
  const list = useMemo(() => recentIncoming([...(items ?? []), ...requestItems(leads)]), [items, leads])
  const loading = !items || (prefs.data === undefined && !prefs.error)
  const seenAt = prefs.error ? localSeen : prefs.data?.messagesSeenAt ?? null

  function markSeen() {
    if (prefs.error) {
      const now = Date.now()
      try { localStorage.setItem(LOCAL, String(now)) } catch { /* fine */ }
      setLocalSeen(now)
      return
    }
    mergePaths(user, 'staffPrefs', prefsId(user), { messagesSeenAt: SERVER_TIME }).catch((e) => console.warn('messagesSeenAt', e))
  }

  // Last time the sync filed anything (Home's status light).
  const lastSync = useMemo(() => Math.max(0, ...(items ?? []).map((m) => toMs(m.syncedAt))), [items])

  return { list, count: loading ? 0 : countNew(list, seenAt), seenAt, markSeen, prefs, error, loading, lastSync }
}
