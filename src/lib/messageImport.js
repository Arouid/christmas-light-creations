// Text history import (Import tab): entries from scripts/old-site/voice-history.mjs
// carry a phone number; here they're matched to customers by phone. Entries that
// already name a customer (older import files) are kept when that customer exists.
// Pure; tested in tests/messageImport.test.mjs.

// "(281) 555-0101 / 832.555.0102" -> ["+12815550101", "+18325550102"]
export function phonesOf(field) {
  const found = String(field ?? '').match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/g) ?? []
  return [...new Set(found.map((p) => {
    const d = p.replace(/\D/g, '')
    return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith('1') ? `+${d}` : ''
  }).filter(Boolean))]
}

// -> { records: [{ id, data }], customers: n, unmatched: [{ phone, entries, first, last, sample }] }
export function matchMessages(list, customers = []) {
  const known = new Set(customers.map((c) => c.id))
  const byPhone = new Map()
  for (const c of customers) for (const p of phonesOf(c.phone)) if (!byPhone.has(p)) byPhone.set(p, c.id)

  const records = []
  const missing = new Map()
  for (const m of list ?? []) {
    if (!m?.id || !m.data) continue
    const customerId = m.data.customerId ?? byPhone.get(m.data.phone)
    if (customerId && known.has(customerId)) {
      records.push({ id: m.id, data: { ...m.data, customerId } })
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
  return { records, customers: new Set(records.map((r) => r.data.customerId)).size, unmatched }
}

const cell = (v) => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
export function unmatchedCsv(unmatched) {
  const rows = unmatched.map((u) => [u.phone, u.entries, u.first?.slice(0, 10), u.last?.slice(0, 10), u.sample.replace(/\s+/g, ' ')])
  return [['Phone', 'Entries', 'First', 'Last', 'Sample text'], ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}
