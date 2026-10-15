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
import { basename, join, sep } from 'node:path'
import Papa from 'papaparse'
import { phonesOf } from '../../functions/messageSync.js'
import { checkSheetDates, contactsOf, joinSheetPayments, nameKey, sheetPayments } from './customerLists.mjs'
import { readEmail, streamMbox, unfold } from './mbox.mjs'
import { formRequest, paymentEntry, paymentOf, personEmail, requestEntry, reviewAlert } from './oldHistory.mjs'
import { namesToPhones } from './voiceTakeout.mjs'
import { readXlsx } from './xlsx.mjs'
import { cleanRow } from '../../src/lib/oldEstimates.js'

const DIR = 'old-site-backup'
const inputs = process.argv.slice(2)
if (!inputs.length) {
  console.error('Usage: node scripts/old-site/old-history.mjs <takeout .zip | .mbox | contacts .csv> …')
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
const reviews = [] // Google review alerts, for the missing-reviews case
const seenPay = new Set()

function onMessage(raw) {
  const e = readEmail(raw)
  const review = reviewAlert(e)
  if (review) { reviews.push(review); return tally('google review alert') }
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
  const contactFiles = [] // Google Contacts exports (Google CSV): saved names for numbers
  const voiceHtml = []
  const sheetFiles = [] // old customer spreadsheets in a Drive Takeout
  for (const input of inputs) {
    if (input.endsWith('.mbox')) { mboxes.push(input); continue }
    if (input.endsWith('.csv')) { contactFiles.push(input); continue }
    const dir = mkdtempSync(join(tmpdir(), 'clc-takeout-'))
    temps.push(dir)
    if (process.platform === 'win32') execFileSync(join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-xf', input, '-C', dir])
    else execFileSync('unzip', ['-q', input, '-d', dir])
    for (const f of walk(dir)) {
      if (f.endsWith('.mbox')) mboxes.push(f)
      else if (/[\\/]Voice[\\/]Calls[\\/].*\.html$/.test(f)) voiceHtml.push(f)
      else if (f.toLowerCase().endsWith('.xlsx') && f.split(sep).includes('Drive')) sheetFiles.push(f)
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

  // Old yearly customer spreadsheets (Drive Takeout): payments no email shows
  // (Zelle, check, Venmo, cash), and PayPal/Square ones the mail missed.
  const sheetPays = []
  const sheetContacts = []
  for (const f of sheetFiles) {
    for (const s of readXlsx(f)) {
      sheetPays.push(...sheetPayments(s.rows, basename(f)))
      sheetContacts.push(...contactsOf(s.rows))
    }
  }
  const sheets = joinSheetPayments(sheetPays, sheetContacts, payments)
  if (sheets.dropped) tally('sheet payment already in PayPal/Square mail', sheets.dropped)
  if (sheets.invoiceDated) tally('sheet payment dated by its invoice email', sheets.invoiceDated)
  for (const p of sheets.kept) keep(paymentEntry(p), `${p.via} payment (customer list)`)
  payments.push(...sheets.kept)

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

  // Every sheet payment's date checked against the person's texts and emails,
  // and tagged with where it comes from (customerLists.mjs, checkSheetDates).
  // A full name's other phones and emails, from anywhere (owner: "or anywhere for
  // that matter"): the contact books and saved Voice names, the PayPal/Square
  // emails, the estimate request emails and the old website's requests. The 2022
  // workbook has names only, so this is how its lines find their texts.
  const nameContacts = new Map()
  const addNameContact = (name, value) => {
    const k = nameKey(name)
    if (k.includes(' ') && value) nameContacts.set(k, [...(nameContacts.get(k) ?? []), String(value)])
  }
  for (const [name, phone] of namesToPhones(voiceHtml.map((f) => readFileSync(f, 'utf8')))) addNameContact(name, phone)
  for (const f of contactFiles) {
    for (const c of Papa.parse(readFileSync(f, 'utf8').replace(/^﻿/, ''), { header: true, skipEmptyLines: true }).data) {
      const name = [c['First Name'], c['Middle Name'], c['Last Name']].filter(Boolean).join(' ')
      for (const p of phonesOf([c['Phone 1 - Value'], c['Phone 2 - Value']].filter(Boolean).join(' / ').replace(/:::/g, ' / '))) addNameContact(name, p)
    }
  }
  for (const p of payments) addNameContact(p.name, p.email)
  for (const f of forms) { addNameContact(f.name, f.email); addNameContact(f.name, f.phone) }
  for (const row of site.data) {
    const r = cleanRow(row)
    if (r) { addNameContact(r.name, r.email); addNameContact(r.name, r.phone) }
  }
  const checked = checkSheetDates(sheets.kept, [...entries.values()], nameContacts)
  for (const [what, n] of Object.entries(checked.counts)) if (n) tally(what, n)
  const checkedById = new Map(checked.pays.map((p) => [p.id, p]))
  for (const p of checked.pays) entries.set(p.id, paymentEntry(p))
  for (let i = 0; i < payments.length; i++) payments[i] = checkedById.get(payments[i].id) ?? payments[i]

  const messages = [...entries.values()].sort((a, b) => a.data.at.localeCompare(b.data.at))
  writeFileSync(join(DIR, 'customer-history.json'), JSON.stringify({ builtAt: new Date().toISOString(), messages }))
  // Review alerts, oldest first, one line per notification (duplicates across mailboxes collapse).
  const seenReview = new Set()
  const reviewRows = reviews.sort((a, b) => a.date.localeCompare(b.date)).filter((r) => { const k = `${r.date}|${r.reviewer}|${r.subject}`; if (seenReview.has(k)) return false; seenReview.add(k); return true })
  writeFileSync(join(DIR, 'review-alerts.csv'), `\ufeff${Papa.unparse(reviewRows, { columns: ['date', 'reviewer', 'stars', 'quote', 'subject'] })}`)
  console.log(`review-alerts.csv: ${reviewRows.length} Google review alerts`)

  // ---- Past requests + win-backs ----
  const extra = []
  const row = (o) => ({ Date: '', Source: '', Form: '', 'First name': '', 'Last name': '', Email: '', Phone: '', Address: '', City: '', Message: '', 'All fields': '', Kind: '', Amount: '', Invoice: '', Items: '', ...o })
  const day = (iso) => iso.replace('T', ' ').slice(0, 19)
  for (const f of forms) {
    extra.push(row({ Date: day(f.date), Source: f.source, Email: f.email, Phone: f.phone, Address: f.address, City: f.city, Message: f.message, 'All fields': f.name ? `Name: ${f.name}` : '' }))
  }
  for (const p of payments) {
    extra.push(row({ Date: day(p.date), Source: p.via, Email: p.email, Phone: p.phone, Address: p.address, 'All fields': p.name ? `Name: ${p.name}` : '', Kind: p.kind, Amount: p.amount, Invoice: p.invoice, Items: p.items.join(' · ') }))
  }
  // Voice: numbers with a saved contact name, or real back-and-forth texting.
  const names = new Map([...namesToPhones(voiceHtml.map((f) => readFileSync(f, 'utf8')))].map(([n, p]) => [p, n]))
  for (const f of contactFiles) {
    for (const c of Papa.parse(readFileSync(f, 'utf8').replace(/^﻿/, ''), { header: true, skipEmptyLines: true }).data) {
      const name = [c['First Name'], c['Middle Name'], c['Last Name']].filter(Boolean).join(' ').trim() || c.Nickname || c['Organization Name'] || ''
      if (!name) continue
      for (const p of phonesOf([c['Phone 1 - Value'], c['Phone 2 - Value']].filter(Boolean).join(' / ').replace(/:::/g, ' / '))) if (!names.has(p)) names.set(p, name)
    }
  }
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
