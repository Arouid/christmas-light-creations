// Customer history import (Import tab): entries from scripts/old-site/
// (voice-history.mjs, old-history.mjs) carry a phone number and/or `match`
// keys (phones, emails, names); here they're matched to customers. Entries that
// already name a customer (older import files) are kept when that customer exists.
// Pure; tested in tests/voiceTakeout.test.mjs.

// "(281) 555-0101 / 832.555.0102" -> ["+12815550101", "+18325550102"]
export function phonesOf(field) {
  const found = String(field ?? '').match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? []
  return [...new Set(found.map((p) => {
    const d = p.replace(/\D/g, '')
    return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith('1') ? `+${d}` : ''
  }).filter(Boolean))]
}
const emailsOf = (field) => (String(field ?? '').toLowerCase().match(/[^\s<>,;"']+@[^\s<>,;"']+\.[a-z]{2,}/g) ?? [])
const nameKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()

// Lookup maps: phone / email / full name -> customer id (first customer wins).
export function customerIndex(customers = []) {
  const phone = new Map()
  const email = new Map()
  const name = new Map()
  const add = (map, k, id) => { if (k && !map.has(k)) map.set(k, id) }
  for (const c of customers) {
    phonesOf(c.phone).forEach((p) => add(phone, p, c.id))
    emailsOf(c.email).forEach((e) => add(email, e, c.id))
    for (const n of [c.fullName, [c.firstName, c.lastName].filter(Boolean).join(' ')]) {
      const k = nameKey(n)
      if (k.includes(' ')) add(name, k, c.id)
    }
  }
  return { phone, email, name }
}

// -> { records: [{ id, data }], customers: n, unmatched: [{ phone, entries, first, last, sample }], byKind }
export function matchMessages(list, customers = []) {
  const known = new Set(customers.map((c) => c.id))
  const ix = customerIndex(customers)
  const find = (m) => {
    const keys = m.match ?? {}
    for (const p of [m.data.phone, ...(keys.phones ?? [])]) if (ix.phone.get(p)) return ix.phone.get(p)
    for (const e of keys.emails ?? []) if (ix.email.get(e)) return ix.email.get(e)
    for (const n of keys.names ?? []) if (ix.name.get(nameKey(n))) return ix.name.get(nameKey(n))
    return null
  }

  const records = []
  const byKind = {}
  const missing = new Map()
  for (const m of list ?? []) {
    if (!m?.data || !(m.id || m.idBase)) continue
    if (m.idBase) {
      // An email: one entry per customer it was with (same ids as the live sync).
      const seen = new Set()
      for (const addr of m.match?.emails ?? []) {
        const customerId = ix.email.get(addr)
        if (!customerId || seen.has(customerId)) continue
        seen.add(customerId)
        records.push({ id: `${m.idBase}-${customerId}`, data: { ...m.data, email: addr, customerId } })
        byKind[m.data.kind] = (byKind[m.data.kind] ?? 0) + 1
      }
      continue
    }
    const customerId = m.data.customerId ?? find(m)
    if (customerId && known.has(customerId)) {
      records.push({ id: m.id, data: { ...m.data, customerId } })
      byKind[m.data.kind] = (byKind[m.data.kind] ?? 0) + 1
    } else if (m.data.phone) {
      const u = missing.get(m.data.phone) ?? { phone: m.data.phone, entries: 0, first: m.data.at, last: m.data.at, sample: '' }
      u.entries++
      if (m.data.at < u.first) u.first = m.data.at
      if (m.data.at > u.last) u.last = m.data.at
      if (!u.sample && m.data.direction === 'in' && m.data.text) u.sample = m.data.text.slice(0, 120)
      missing.set(m.data.phone, u)
    }
  }
  const unmatched = [...missing.values()].sort((a, b) => b.entries - a.entries)
  return { records, customers: new Set(records.map((r) => r.data.customerId)).size, unmatched, byKind }
}

const cell = (v) => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
export function unmatchedCsv(unmatched) {
  const rows = unmatched.map((u) => [u.phone, u.entries, u.first?.slice(0, 10), u.last?.slice(0, 10), u.sample.replace(/\s+/g, ' ')])
  return [['Phone', 'Entries', 'First', 'Last', 'Sample text'], ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}
