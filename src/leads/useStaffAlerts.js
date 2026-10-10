// The 💬 count and list (docs/specs/staff-alerts.md): incoming messages synced
// and website estimate requests from the last 7 days. The count is what nobody
// has taken yet (I've got it / Take it over; requests: still New), the same for
// everyone; opening the list doesn't clear it (owner 2026-10-10). Without the
// activity log it falls back to "since you last looked" (staffPrefs).
import { useMemo, useState } from 'react'
import { countNew, countOpen, listSince, recentIncoming, requestItems, toMs } from '../lib/staffAlerts'
import { prefsId } from './push'
import { SERVER_TIME, mergePaths, useLiveDoc, useLiveSince } from './staffStore'

const LOCAL = 'clcMessagesSeenAt'
const readLocal = () => { try { return Number(localStorage.getItem(LOCAL)) || null } catch { return null } }
const bySynced = (a, b) => (b.syncedAt?.toMillis?.() ?? 0) - (a.syncedAt?.toMillis?.() ?? 0)

// feed: useActivityFeed() (who's on which message). The count is what nobody
// has taken yet; without the activity log it falls back to "since you looked".
export function useStaffAlerts(user, leads, feed) {
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

  const openMode = Boolean(feed && !feed.error)
  const count = loading || (openMode && feed.loading) ? 0 : openMode ? countOpen(list, feed.handling) : countNew(list, seenAt)

  return { list, count, openMode, seenAt, markSeen, prefs, error, loading, lastSync }
}
