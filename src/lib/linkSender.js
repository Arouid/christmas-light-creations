// Linking an unmatched text or email to a customer (Leads → "messages from
// people we don't know yet" → Link to customer) teaches the record the
// sender, so the next message from that number or address lands on the
// customer by itself (the sync matches phone + otherPhones, email +
// otherEmails; docs/specs/message-sync.md, owner 2026-10-14: "emails are
// appearing in the history correctly but text messages aren't"). Pure;
// tested in tests/linkSender.test.mjs.
import { normalizeKey, senderKey } from '../../functions/blocklist.js'
import { phonesOf } from './messageImport.js'

const emailsOf = (s) => String(s ?? '').toLowerCase().match(/[^\s<>,;"']+@[^\s<>,;"']+\.[a-z]{2,}/g) ?? []

// The customer fields to set so this message's sender is on the record: {} when it already is.
export function contactPatch(customer, m) {
  const c = customer ?? {}
  if (m?.phone) {
    const key = normalizeKey(m.phone)
    const have = new Set(phonesOf([c.phone, ...(c.otherPhones ?? [])].join(' / ')))
    return key && !have.has(key) ? { otherPhones: [...(c.otherPhones ?? []), key] } : {}
  }
  if (m?.email) {
    const key = normalizeKey(m.email)
    const have = new Set([...emailsOf(c.email), ...(c.otherEmails ?? []).map((e) => String(e).toLowerCase())])
    return key && !have.has(key) ? { otherEmails: [...(c.otherEmails ?? []), key] } : {}
  }
  return {}
}

// The other open unmatched messages from the same sender, to link along with this one.
export const sameSender = (items, m) => {
  const key = senderKey(m)
  return key ? (items ?? []).filter((x) => x.id !== m.id && !x.dismissed && senderKey(x) === key) : []
}
