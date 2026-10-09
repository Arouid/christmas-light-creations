// One search box across everyone the business knows: customers, website
// leads and past (old-website) requests. Pure functions, tested.

const digits = (s) => String(s ?? '').replace(/\D/g, '')
const low = (s) => String(s ?? '').toLowerCase()

export function buildIndex({ customers = [], leads = [], past = [] }) {
  const out = []
  for (const c of customers) {
    out.push({
      key: `customer:${c.id}`, kind: 'customer', id: c.id, name: c.fullName ?? '', address: c.address ?? '',
      phone: c.phone ?? '', email: c.email ?? '', extra: [c.neighborhood, c.locationBlock, c.gateCode].filter(Boolean).join(' · '),
    })
  }
  for (const l of leads) {
    if (l.customerId) continue // already a customer: that account covers it
    out.push({
      key: `lead:${l.id}`, kind: 'lead', id: l.id, name: `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(),
      address: [l.address, l.city, l.zip].filter(Boolean).join(', '), phone: l.phone ?? '', email: l.email ?? '', extra: l.status ?? '',
    })
  }
  for (const p of past) {
    out.push({
      key: `past:${p.id}`, kind: 'past', id: p.id, name: p.fullName ?? '', address: [p.address, p.city].filter(Boolean).join(', '),
      phone: p.phone ?? '', email: p.email ?? '', extra: p.lastAsked ? `asked ${p.lastAsked.slice(0, 4)}` : '',
    })
  }
  return out.map((e) => ({ ...e, text: low([e.name, e.address, e.email, e.extra].join(' ')), nameLow: low(e.name), digits: digits(e.phone) }))
}

const KIND_RANK = { customer: 0, lead: 1, past: 2 }

// Every word typed must match somewhere (or the digits must match the phone).
// Name matches rank above address/email matches; customers above leads.
export function searchAccounts(index, query, limit = 8) {
  const q = low(query).trim()
  if (!q) return []
  const words = q.split(/\s+/)
  const qDigits = digits(q)
  const phoneQuery = qDigits.length >= 3 && qDigits.length >= q.replace(/[\s()+.-]/g, '').length - 1
  const scored = []
  for (const e of index) {
    let score = 0
    const textMatch = words.every((w) => e.text.includes(w))
    if (phoneQuery) {
      // Numbers: a phone match first, else the number anywhere (gate codes, streets).
      if (e.digits.includes(qDigits)) score = 6
      else if (textMatch) score = 2
      else continue
    } else {
      if (!words.every((w) => e.text.includes(w))) continue
      if (e.nameLow === q) score += 10
      if (e.nameLow.startsWith(q)) score += 5
      for (const w of words) {
        if (e.nameLow.split(/\s+/).some((part) => part.startsWith(w))) score += 3
        else if (e.nameLow.includes(w)) score += 1
      }
    }
    scored.push({ e, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || KIND_RANK[a.e.kind] - KIND_RANK[b.e.kind] || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((s) => s.e)
}
