// Contacts file (.vcf, vCard 3.0) for the business Google account
// (clc.voicemail.01), so Google Voice shows names on texts and calls.
// Built from Customers and the Past requests list; anyone filed away
// (deceased, personal, junk) is left out. Pure; tested in tests/contactsExport.test.mjs.
import { FILED_STATUSES, findCustomer, pastGroup } from './oldEstimates.js'
import { phonesOf } from './messageImport.js'

export const CONTACT_GROUPS = [
  ['customers', 'Customers'],
  ['winback', 'Win-backs (paid before)'],
  ['voice', 'Texted us (saved contacts and regulars)'],
  ['asked', 'Past requests (asked for an estimate)'],
]
const LABEL = { customers: 'CLC customer', winback: 'CLC former customer', voice: 'CLC contact', asked: 'CLC estimate request' }

// -> { customers: [...], winback: [...], voice: [...], asked: [...] } of
// { name, first, last, phones, emails, note, group }. Only people with a name and a
// phone: a nameless contact adds nothing in Voice, a phoneless one doesn't help it.
export function contactGroups(customers = [], past = []) {
  const out = Object.fromEntries(CONTACT_GROUPS.map(([k]) => [k, []]))
  const add = (group, p) => {
    const phones = phonesOf(p.phone)
    const emails = String(p.email ?? '').toLowerCase().match(/[^\s<>,;"']+@[^\s<>,;"']+\.[a-z]{2,}/g) ?? []
    const name = (p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || '').trim()
    if (!phones.length || !name || name.includes('@') || /^\+?[\d\s()-]+$/.test(name)) return
    out[group].push({ name, first: p.firstName ?? '', last: p.lastName ?? '', phones, emails, note: p.note, group })
  }
  for (const c of customers) {
    if (FILED_STATUSES.includes(c.status)) continue
    add('customers', { ...c, note: [LABEL.customers, c.since && `since ${c.since}`, c.address].filter(Boolean).join(' · ') })
  }
  for (const r of past) {
    if (FILED_STATUSES.includes(r.status) || r.customerId || findCustomer(r, customers)) continue
    const group = pastGroup(r)
    const years = r.payments?.length ? `paid ${(r.firstPaid || '').slice(0, 4)}–${(r.lastPaid || '').slice(0, 4)}` : r.lastAsked ? `last ${r.lastAsked.slice(0, 4)}` : ''
    add(group, { ...r, note: [LABEL[group], years, [r.address, r.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ') })
  }
  return out
}

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

export function toVcard(list) {
  return list.map((p) => {
    const first = p.name ? (p.first || p.name.split(' ')[0]) : ''
    const last = p.name ? (p.last || p.name.split(' ').slice(1).join(' ')) : ''
    const display = p.name || p.emails[0] || p.phones[0]
    return [
      'BEGIN:VCARD', 'VERSION:3.0',
      `N:${esc(last)};${esc(first)};;;`, `FN:${esc(display)}`,
      ...p.phones.map((t) => `TEL;TYPE=CELL:${t}`),
      ...p.emails.map((e) => `EMAIL;TYPE=INTERNET:${e}`),
      p.note && `NOTE:${esc(p.note)}`,
      'END:VCARD',
    ].filter(Boolean).join('\r\n')
  }).join('\r\n') + '\r\n'
}
