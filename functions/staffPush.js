// New-message alerts for staff (texts, voicemails, missed calls, emails
// filed by messageSync, and new website estimate requests): what the phone
// notification says, which devices get
// it, and which FCM answers mean a device is gone. Pure: no Firebase. Shared
// with the staff app (src/lib/staffAlerts.js) so the 💬 list and the
// notification say the same thing. Spec: docs/specs/staff-alerts.md.

export const KIND_WORD = { text: 'Text', voicemail: 'Voicemail', missed: 'Missed call', email: 'Email', request: 'Estimate request' }
export const PREVIEW_CHARS = 120
export const MAX_DEVICES = 10
// A catch-up of old mail (sync down for a while) doesn't buzz phones.
export const PUSH_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000

export const prettyPhone = (p) => {
  const d = String(p ?? '').replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(p ?? '')
}

// Where a message shows: its customer, else its lead, else Unmatched (Leads tab).
export const targetKey = (m) => (m.customerId ? `customer:${m.customerId}` : m.leadId ? `lead:${m.leadId}` : '')
export const messageLink = (m) => (m.customerId ? `#accounts/customer/${encodeURIComponent(m.customerId)}`
  : m.leadId ? `#accounts/lead/${encodeURIComponent(m.leadId)}` : '#leads')

// names: { 'customer:<id>': 'Full Name', 'lead:<id>': 'First Last' }.
export const whoOf = (m, names = {}) =>
  names[targetKey(m)] || (m.phone ? prettyPhone(m.phone) : '') || m.name || m.email || 'Unknown number'

const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

export function previewOf(m, max = PREVIEW_CHARS) {
  const text = [m.kind === 'email' ? m.subject : '', m.text].filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim()
  if (!text) return m.kind === 'missed' ? 'No voicemail left' : ''
  return clip(text, max)
}

// A new website estimate request (newLeadAlert) -> its notification.
export function requestPush(lead, id) {
  const name = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || 'someone'
  const body = [lead.city, lead.message].filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim()
  return { title: `New estimate request from ${name}`, body: clip(body, PREVIEW_CHARS) || 'Tap to open', link: messageLink({ leadId: id }), tag: `lead:${id}` }
}

// Messages that alert: from a customer (or unknown number), a synced kind, not dismissed.
export const isAlert = (m) => m?.direction === 'in' && Boolean(KIND_WORD[m.kind]) && !m.dismissed

const newestFirst = (a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0)

// Messages just saved by one sync call -> one notification { title, body, link, tag }, or null.
export function pushFor(saved, names = {}, now = Date.now()) {
  const list = saved.filter((m) => isAlert(m) && now - Date.parse(m.at) < PUSH_MAX_AGE_MS).sort(newestFirst)
  if (!list.length) return null
  const [m] = list
  const tag = targetKey(m) || `from:${m.phone || m.name || m.email || ''}`
  const people = [...new Set(list.map((x) => whoOf(x, names)))]
  if (people.length === 1) {
    return {
      title: list.length === 1 ? `${KIND_WORD[m.kind]} from ${people[0]}` : `${list.length} messages from ${people[0]}`,
      body: previewOf(m) || 'Tap to open', link: messageLink(m), tag,
    }
  }
  const more = people.length > 3 ? `, +${people.length - 3} more` : ''
  return { title: `${list.length} new customer messages`, body: `${people.slice(0, 3).join(', ')}${more}`, link: '#messages', tag: 'messages' }
}

export const TEST_PUSH = { title: 'CLC Staff: test notification', body: 'Notifications work on this device ✓', link: '#messages', tag: 'test' }

// staffPrefs docs [{ email, pushDevices: { <fid>: {...} } }] -> [{ email, fid }], each device once.
export function devicesOf(prefs) {
  const seen = new Set()
  const out = []
  for (const p of prefs ?? []) {
    for (const fid of Object.keys(p?.pushDevices ?? {})) {
      if (!fid || seen.has(fid)) continue
      seen.add(fid)
      out.push({ email: p.email, fid })
    }
  }
  return out
}

// FCM HTTP v1 body for one device. Data-only (strings): our service worker
// (public/leads/sw.js) shows it and opens the link on tap.
export const fcmMessage = (fid, push) => ({
  message: {
    fid,
    data: { title: String(push.title), body: String(push.body ?? ''), link: String(push.link ?? ''), tag: String(push.tag ?? '') },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
  },
})

// An FCM error answer -> true when the device is gone for good (app removed,
// notifications turned off, registration expired). Only FCM's own error codes
// count: a 404 from a wrong URL must never wipe everyone's devices.
export function deviceGone(body) {
  const codes = (body?.error?.details ?? []).map((d) => d?.errorCode)
  return codes.includes('UNREGISTERED') || codes.includes('SENDER_ID_MISMATCH')
}
