// Cross-references an exported Google Contacts CSV (Google CSV, e.g. Takeout
// "All Contacts.csv") with the business records from the old backups, so the
// owner can tell business contacts from personal ones before re-adding them to
// clc.voicemail.01. Run old-history.mjs first.
//
//   node scripts/old-site/contacts-crossref.mjs "<path to All Contacts.csv>"
//
// Writes old-site-backup/contacts-crossref.csv (not in git: personal data).
import { readFileSync, writeFileSync } from 'node:fs'
import Papa from 'papaparse'
import { phonesOf } from '../../functions/messageSync.js'
import { cleanRow, mergePeople } from '../../src/lib/oldEstimates.js'

const DIR = 'old-site-backup'
const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/old-site/contacts-crossref.mjs "<All Contacts.csv>"')
  process.exit(1)
}
const csv = (path) => Papa.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''), { header: true, skipEmptyLines: true }).data
const nameKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
const yearsOf = (dates) => {
  const ys = dates.filter(Boolean).map((d) => d.slice(0, 4)).sort()
  return !ys.length ? '' : ys[0] === ys.at(-1) ? ys[0] : `${ys[0]}–${ys.at(-1)}`
}

// People from payments, estimate requests and Voice (same merge as the app).
const people = mergePeople(csv(`${DIR}/past-requests-plus.csv`).map(cleanRow).filter(Boolean))
const byPhone = new Map()
const byEmail = new Map()
const byName = new Map()
for (const p of people) {
  phonesOf(p.phone).forEach((x) => byPhone.set(x, p))
  ;[p.email, ...(p.otherEmails ?? [])].filter(Boolean).forEach((e) => byEmail.set(e.toLowerCase(), p))
  if (nameKey(p.fullName).includes(' ')) byName.set(nameKey(p.fullName), p)
}
// Texts/calls and emails per number / address.
const history = JSON.parse(readFileSync(`${DIR}/customer-history.json`, 'utf8')).messages
const voice = new Map()
const mail = new Map()
for (const m of history) {
  if (m.data.phone && ['text', 'call', 'missed', 'voicemail'].includes(m.data.kind)) {
    const v = voice.get(m.data.phone) ?? { n: 0, dates: [] }
    v.n++; v.dates.push(m.data.at); voice.set(m.data.phone, v)
  }
  if (m.data.kind === 'email') for (const e of m.match?.emails ?? []) {
    const v = mail.get(e) ?? { n: 0, dates: [] }
    v.n++; v.dates.push(m.data.at); mail.set(e, v)
  }
}

const PERSONAL = /\b(mom|mother|dad|father|grand(ma|pa|mother|father)|nana|papa|aunt|uncle|cousin|sister|brother|bro|sis|wife|husband|babe|baby|son|daughter|niece|nephew|in[- ]law|doctor|dr\.?|dentist|dds|recruiter|school|teacher|church|pastor|vet|pharmacy|bank|insurance|lawyer|attorney)\b/i

const rows = []
for (const c of csv(file)) {
  const name = [c['First Name'], c['Middle Name'], c['Last Name']].filter(Boolean).join(' ').trim() || c.Nickname || c['File As'] || c['Organization Name'] || ''
  const phones = [...new Set([c['Phone 1 - Value'], c['Phone 2 - Value'], c['Phone 3 - Value']].flatMap((v) => phonesOf(String(v ?? '').replace(/:::/g, ' / '))))]
  const emails = [...new Set([c['E-mail 1 - Value'], c['E-mail 2 - Value']].flatMap((v) => String(v ?? '').toLowerCase().split(/\s*:::\s*/)).filter((e) => e.includes('@')))]
  if (!name && !phones.length && !emails.length) continue

  const person = phones.map((x) => byPhone.get(x)).find(Boolean) ?? emails.map((e) => byEmail.get(e)).find(Boolean) ?? byName.get(nameKey(name))
  const v = phones.map((x) => voice.get(x)).filter(Boolean)
  const e = emails.map((x) => mail.get(x)).filter(Boolean)
  const evidence = []
  if (person?.payments?.length) evidence.push(person.paid > 0 ? `Paid $${Math.round(person.paid)} (${yearsOf(person.payments.map((x) => x.date))})` : `Invoiced (${yearsOf(person.payments.map((x) => x.date))})`)
  if (person?.requests?.length) evidence.push(`Estimate request (${yearsOf(person.requests.map((x) => x.date))})`)
  if (v.length) evidence.push(`${v.reduce((a, x) => a + x.n, 0)} texts/calls with business line (${yearsOf(v.flatMap((x) => x.dates))})`)
  if (e.length) evidence.push(`${e.reduce((a, x) => a + x.n, 0)} emails with business (${yearsOf(e.flatMap((x) => x.dates))})`)

  const hint = PERSONAL.test(`${name} ${c.Notes ?? ''} ${c['Organization Name'] ?? ''}`)
  const suggested = person?.payments?.length ? 'Business: customer (paid before)'
    : person?.requests?.length ? 'Business: asked for estimate'
      : evidence.length && !hint ? 'Business? contacted us'
        : hint ? 'Personal (name says so)'
          : 'Personal? no business record'
  rows.push({
    Suggested: suggested, Name: name, Phones: phones.join(' / '), Emails: emails.join(' / '),
    Address: c['Address 1 - Formatted']?.replace(/\s*\n\s*/g, ', ') ?? '', Evidence: evidence.join('; '),
    Saved: (c.Labels ?? '').includes('Other Contacts') ? 'Auto-saved from email' : (c.Labels ?? '').includes('Samsung') ? 'Old Samsung phone' : 'Saved contact',
    Notes: c.Notes ?? '',
  })
}
const order = ['Business: customer (paid before)', 'Business: asked for estimate', 'Business? contacted us', 'Personal (name says so)', 'Personal? no business record']
rows.sort((a, b) => order.indexOf(a.Suggested) - order.indexOf(b.Suggested) || a.Name.localeCompare(b.Name))
writeFileSync(`${DIR}/contacts-crossref.csv`, `﻿${Papa.unparse(rows)}`)
const counts = Object.fromEntries(order.map((k) => [k, rows.filter((r) => r.Suggested === k).length]))
console.table(counts)
console.log(`${rows.length} contacts -> ${DIR}/contacts-crossref.csv`)
