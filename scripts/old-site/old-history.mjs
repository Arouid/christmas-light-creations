// Everything in the old backups about people, in two files for the staff app:
//   old-site-backup/customer-history.json  Import → "Customer history": texts, calls,
//     voicemails (from voice-history.json), emails, PayPal/Square payments and
//     invoices, estimate requests. Matched to customers at import.
//   old-site-backup/past-requests-plus.csv  Import → "Past requests": the old
//     website requests plus estimate emails, payers (win-backs) and named Voice
//     contacts.
// Run voice-history.mjs first, then:
//   node scripts/old-site/old-history.mjs old-site-backup/takeout-*.zip old-site-backup/Archived-002.mbox
// Not in git: customer data. Spec: docs/specs/old-history.md.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Papa from 'papaparse'
import { phonesOf } from '../../functions/messageSync.js'
import { readEmail, streamMbox, unfold } from './mbox.mjs'
import { formRequest, paymentEntry, paymentOf, personEmail, requestEntry } from './oldHistory.mjs'
import { namesToPhones } from './voiceTakeout.mjs'
import { cleanRow } from '../../src/lib/oldEstimates.js'

const DIR = 'old-site-backup'
const inputs = process.argv.slice(2)
if (!inputs.length) {
  console.error('Usage: node scripts/old-site/old-history.mjs <takeout .zip | .mbox> …')
  process.exit(1)
}
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : [p]
})
const counts = {}
const tally = (k, n = 1) => { counts[k] = (counts[k] ?? 0) + n }

const entries = new Map() // id or idBase -> entry
const keep = (e, what) => {
  const key = e.id ?? e.idBase
  if (entries.has(key)) return tally('duplicate')
  entries.set(key, e)
  tally(what)
}
const forms = []
const payments = []
const seenPay = new Set()

function onMessage(raw) {
  const e = readEmail(raw)
  const form = formRequest(e)
  if (form) {
    const entry = requestEntry(form)
    if (!entries.has(entry.id)) forms.push(form)
    return keep(entry, 'estimate request (email)')
  }
  const pay = paymentOf(e)
  if (pay) {
    if (seenPay.has(pay.id)) return tally('duplicate')
    seenPay.add(pay.id)
    return payments.push(pay)
  }
  const mail = personEmail(e)
  if (mail) keep(mail, 'email with a person')
}
// Skip the body of mail that can't be about a customer.
const want = (head) => {
  const h = unfold(head)
  if (/@txt\.voice\.google\.com|voice-noreply@google\.com/i.test(h.from ?? '')) return false // voice-history.mjs
  return true
}

const temps = []
try {
  const mboxes = []
  const voiceHtml = []
  for (const input of inputs) {
    if (input.endsWith('.mbox')) { mboxes.push(input); continue }
    const dir = mkdtempSync(join(tmpdir(), 'clc-takeout-'))
    temps.push(dir)
    if (process.platform === 'win32') execFileSync(join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-xf', input, '-C', dir])
    else execFileSync('unzip', ['-q', input, '-d', dir])
    for (const f of walk(dir)) {
      if (f.endsWith('.mbox')) mboxes.push(f)
      else if (/[\\/]Voice[\\/]Calls[\\/].*\.html$/.test(f)) voiceHtml.push(f)
    }
  }
  for (const m of mboxes) {
    console.log(`Reading ${m}…`)
    await streamMbox(m, want, onMessage)
  }

  // Card payments without a name: take it from the invoice they paid.
  const byInvoice = new Map()
  for (const p of payments) if (p.invoice && (p.name || p.email)) byInvoice.set(`${p.via}|${p.invoice}`, byInvoice.get(`${p.via}|${p.invoice}`) ?? p)
  for (const p of payments) {
    const known = byInvoice.get(`${p.via}|${p.invoice}`)
    if (known && !p.name) p.name = known.name
    if (known && !p.email) p.email = known.email
    keep(paymentEntry(p), `${p.via} ${p.kind}`)
  }

  // Old website requests (WordPress export): history entries too.
  const csvPath = join(DIR, 'past-requests-all.csv')
  const site = Papa.parse(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''), { header: true, skipEmptyLines: true })
  for (const row of site.data) {
    const r = cleanRow(row)
    // Site times are Central; date-only rows count as noon.
    const at = new Date(`${String(row.Date).trim().replace(' ', 'T')}${String(row.Date).trim().length <= 10 ? 'T12:00:00' : ''}-06:00`)
    if (r && !Number.isNaN(at.getTime())) keep(requestEntry({ ...r, date: at.toISOString() }), 'estimate request (old website)')
    else if (r) tally('skipped: old website row without a date')
  }

  // Texts, calls, voicemails.
  const voice = JSON.parse(readFileSync(join(DIR, 'voice-history.json'), 'utf8')).messages
  voice.forEach((v) => keep(v, 'voice'))

  const messages = [...entries.values()].sort((a, b) => a.data.at.localeCompare(b.data.at))
  writeFileSync(join(DIR, 'customer-history.json'), JSON.stringify({ builtAt: new Date().toISOString(), messages }))

  // ---- Past requests + win-backs ----
  const extra = []
  const row = (o) => ({ Date: '', Source: '', Form: '', 'First name': '', 'Last name': '', Email: '', Phone: '', Address: '', City: '', Message: '', 'All fields': '', Kind: '', Amount: '', Invoice: '', Items: '', ...o })
  const day = (iso) => iso.replace('T', ' ').slice(0, 19)
  for (const f of forms) {
    extra.push(row({ Date: day(f.date), Source: f.source, Email: f.email, Phone: f.phone, Address: f.address, City: f.city, Message: f.message, 'All fields': f.name ? `Name: ${f.name}` : '' }))
  }
  for (const p of payments) {
    extra.push(row({ Date: day(p.date), Source: p.via, Email: p.email, Address: p.address, 'All fields': p.name ? `Name: ${p.name}` : '', Kind: p.kind, Amount: p.amount, Invoice: p.invoice, Items: p.items.join(' · ') }))
  }
  // Voice: numbers with a saved contact name, or real back-and-forth texting.
  const names = new Map([...namesToPhones(voiceHtml.map((f) => readFileSync(f, 'utf8')))].map(([n, p]) => [p, n]))
  const byPhone = new Map()
  for (const v of voice) {
    const u = byPhone.get(v.data.phone) ?? { n: 0, textsIn: 0, first: v.data.at, last: v.data.at }
    u.n++
    if (v.data.kind === 'text' && v.data.direction === 'in') u.textsIn++
    if (v.data.at < u.first) u.first = v.data.at
    if (v.data.at > u.last) u.last = v.data.at
    byPhone.set(v.data.phone, u)
  }
  for (const [phone, u] of byPhone) {
    const name = names.get(phone) ?? ''
    if (!name && u.textsIn < 3) continue
    const years = u.first.slice(0, 4) === u.last.slice(0, 4) ? u.first.slice(0, 4) : `${u.first.slice(0, 4)}–${u.last.slice(0, 4)}`
    extra.push(row({ Date: day(u.last), Source: 'Voice', Phone: phonesOf(phone)[0]?.slice(2) ?? '', Kind: 'voice', Amount: u.n, Message: `${u.n} texts/calls with the business line, ${years}`, 'All fields': name ? `Name: ${name}` : '' }))
  }
  const all = [...site.data, ...extra]
  writeFileSync(join(DIR, 'past-requests-plus.csv'), `﻿${Papa.unparse(all, { columns: Object.keys(row({})) })}`)

  console.table(Object.entries(counts).sort().map(([what, n]) => ({ what, n })))
  console.log(`customer-history.json: ${messages.length} entries · past-requests-plus.csv: ${site.data.length} website rows + ${forms.length} estimate emails + ${payments.length} payments/invoices + ${extra.length - forms.length - payments.length} Voice contacts`)
} finally {
  temps.forEach((d) => rmSync(d, { recursive: true, force: true }))
}
