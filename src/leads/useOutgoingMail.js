import { useMemo } from 'react'
import { openBounces, outgoingLight } from '../lib/outgoingMail'
import { useLiveCollection, useLiveQuery } from './staffStore'

const byAt = (a, b) => String(b.at ?? '').localeCompare(String(a.at ?? ''))
const byId = (a, b) => a.id.localeCompare(b.id)

// Home's "Outgoing email" light: every email the app sent (history entries
// with source 'app') plus the scheduled ones, and any email that bounced
// (docs/specs/email-bounces.md), judged by outgoingLight(). lastSync: from
// useStaffAlerts; now: a per-minute clock; customers / leads: to see whether
// a bounced address was fixed since.
export function useOutgoingMail(user, lastSync, now, customers, leads) {
  const sent = useLiveQuery(user, 'messages', 'source', 'app', byAt)
  const bouncedEntries = useLiveQuery(user, 'messages', 'bounced', true, byAt)
  const scheduled = useLiveCollection(user, 'scheduledEmails', byId)
  return useMemo(() => {
    const bounced = openBounces(bouncedEntries ?? [], { customers: customers ?? [], leads: leads ?? [] }, now)
    return outgoingLight({ sent: sent ?? [], scheduled: scheduled.items ?? [], bounced, lastSync, now })
  }, [sent, bouncedEntries, scheduled.items, customers, leads, lastSync, now])
}
