import { useMemo } from 'react'
import { outgoingLight } from '../lib/outgoingMail'
import { useLiveCollection, useLiveQuery } from './staffStore'

const byAt = (a, b) => String(b.at ?? '').localeCompare(String(a.at ?? ''))
const byId = (a, b) => a.id.localeCompare(b.id)

// Home's "Outgoing email" light: every email the app sent (history entries
// with source 'app') plus the scheduled ones, judged by outgoingLight().
// lastSync: from useStaffAlerts; now: a per-minute clock.
export function useOutgoingMail(user, lastSync, now) {
  const sent = useLiveQuery(user, 'messages', 'source', 'app', byAt)
  const scheduled = useLiveCollection(user, 'scheduledEmails', byId)
  return useMemo(() => outgoingLight({ sent: sent ?? [], scheduled: scheduled.items ?? [], lastSync, now }), [sent, scheduled.items, lastSync, now])
}
