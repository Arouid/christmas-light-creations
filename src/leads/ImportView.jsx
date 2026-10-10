import { useState } from 'react'
import { buildCustomers, buildGateCodes } from '../lib/importSheet'
import { CONTACT_GROUPS, contactGroups, toVcard } from '../lib/contactsExport'
import { matchMessages, unmatchedCsv } from '../lib/messageImport'
import { cleanRow, mergePeople, reuseIds } from '../lib/oldEstimates'

async function readCsv(file) {
  const { default: Papa } = await import('papaparse')
  const { data, errors } = Papa.parse(await file.text(), { skipEmptyLines: false })
  if (errors.length && !data.length) throw new Error(`Couldn't read ${file.name}: ${errors[0].message}`)
  return data
}

// Old website export: one row per form entry, with a header row.
async function readPastRequests(file, existingPast) {
  const { default: Papa } = await import('papaparse')
  const { data } = Papa.parse((await file.text()).replace(/^﻿/, ''), { header: true, skipEmptyLines: true })
  const kept = data.map(cleanRow).filter(Boolean)
  const people = reuseIds(mergePeople(kept), existingPast)
  const known = new Set(existingPast.map((e) => e.id))
  return { rows: data.length, kept: kept.length, winbacks: people.filter((p) => p.payments?.length).length, updates: people.filter((p) => known.has(p.id)).length, records: people.map(({ id, ...rest }) => ({ id, data: rest })) }
}

function downloadCsv(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([type === 'text/csv' ? `﻿${text}` : text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const KIND_NAMES = { text: 'text', call: 'call', missed: 'missed call', voicemail: 'voicemail', email: 'email', payment: 'payment', invoice: 'invoice', request: 'estimate request' }

const fileInput = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-900 px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-100'

const FILES = [
  ['scheduling', 'Scheduling tab (.csv)'],
  ['accounts', 'Accounts tab (.csv)'],
  ['gates', 'Gate Codes tab (.csv), optional'],
  ['messages', 'Customer history (customer-history.json from old-site-backup: texts, calls, emails, payments, estimate requests), optional'],
  ['past', 'Past requests and win-backs (past-requests-plus.csv from old-site-backup), optional'],
]

// Contacts for the business Google account, so Voice shows names.
function ContactsExport({ customers, past }) {
  const groups = contactGroups(customers, past)
  const [pick, setPick] = useState({ customers: true, winback: true, voice: true, asked: false })
  const chosen = CONTACT_GROUPS.filter(([k]) => pick[k]).flatMap(([k]) => groups[k])
  return (
    <div className="rounded-2xl border border-white/10 bg-night-900 p-4 text-sm text-slate-300">
      <p className="font-semibold text-slate-100">Export contacts for Google Voice</p>
      <p className="mt-1 text-slate-400">A contacts file (.vcf) for clc.voicemail.01, so texts and calls show names. Only people with a name and a phone; anyone filed as Deceased, Personal or Junk is left out.</p>
      <div className="mt-3 space-y-1">
        {CONTACT_GROUPS.map(([k, label]) => (
          <label key={k} className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={pick[k]} onChange={(e) => setPick({ ...pick, [k]: e.target.checked })} className="size-5" />
            <span>{label} <span className="text-slate-500">{groups[k].length}</span></span>
          </label>
        ))}
      </div>
      <button type="button" disabled={!chosen.length} onClick={() => downloadCsv('clc-contacts.vcf', toVcard(chosen), 'text/vcard')}
        className="mt-3 min-h-11 w-full rounded-full bg-white/10 px-4 font-semibold disabled:opacity-50">
        Download {chosen.length} contacts (.vcf)
      </button>
      <p className="mt-2 text-xs text-slate-500">Then sign in to contacts.google.com as clc.voicemail.01 → Import → pick the file.</p>
    </div>
  )
}

export default function ImportView({ existing, existingPast = [], onImport, onImportGates, onImportMessages, onImportPast }) {
  const [files, setFiles] = useState({})
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  async function check(next) {
    setFiles(next)
    setPreview(null)
    setError(null)
    setProgress(null)
    try {
      const p = {}
      if (next.scheduling) {
        const result = buildCustomers(await readCsv(next.scheduling), next.accounts ? await readCsv(next.accounts) : [])
        const ids = new Set(existing.map((c) => c.id))
        Object.assign(p, result, { updates: result.customers.filter((c) => ids.has(c.id)).length })
      }
      if (next.gates) p.gates = buildGateCodes(await readCsv(next.gates))
      if (next.messages) {
        const parsed = JSON.parse(await next.messages.text())
        const { records, customers, unmatched, byKind } = matchMessages(parsed.messages, existing)
        p.messages = records
        p.messageCustomers = customers
        p.messageSkipped = (parsed.messages ?? []).length - records.length
        p.unmatched = unmatched
        p.messageKinds = byKind
      }
      if (next.past) p.past = await readPastRequests(next.past, existingPast)
      if (p.customers || p.gates || p.messages || p.past) setPreview(p)
    } catch (err) {
      setError(err.message)
    }
  }

  async function run() {
    setProgress(0)
    try {
      if (preview.customers) await onImport(preview.customers, setProgress)
      if (preview.gates) await onImportGates(preview.gates)
      if (preview.messages) await onImportMessages(preview.messages, setProgress)
      if (preview.past) await onImportPast(preview.past.records, setProgress)
      setProgress('done')
    } catch (err) {
      setError(err.message)
      setProgress(null)
    }
  }

  const total = preview?.customers?.length ?? 0
  const warnings = preview?.warnings ?? []

  return (
    <div className="space-y-4">
      {existing.length > 0 && <ContactsExport customers={existing} past={existingPast} />}
      <div className="rounded-2xl border border-white/10 bg-night-900 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">From the Google Sheet</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open the <strong>Scheduling</strong> tab → <strong>File → Download → Comma-separated values (.csv)</strong>.</li>
          <li>Do the same for the <strong>Accounts</strong> tab (and <strong>Gate Codes</strong> if it changed).</li>
          <li>Pick the files below, check the preview, then Import.</li>
        </ol>
        <p className="mt-2 text-slate-400">Importing again later is safe: it updates the same records instead of adding copies. Blank cells in the sheet never erase what was typed here; filled cells do replace it.</p>
      </div>

      {FILES.map(([key, label]) => (
        <label key={key} className="block text-sm text-slate-400">{label}
          <input type="file" accept={key === 'messages' ? '.json,application/json' : '.csv,text/csv'} className={fileInput} onChange={(e) => check({ ...files, [key]: e.target.files[0] })} />
        </label>
      ))}

      {error && <p className="rounded-xl bg-berry-600/20 p-3 text-sm text-berry-500" role="alert">{error}</p>}

      {preview && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4">
          {preview.customers && (
            <>
              <p><strong>{total}</strong> customers found (<strong>{total - preview.updates}</strong> new, <strong>{preview.updates}</strong> already here and will be updated).</p>
              <p className="text-sm text-slate-400">Seasons: statuses and rates go to {preview.currentSeason}; payments and last year’s dates go to {preview.previousSeason}.</p>
              {!files.accounts && <p className="text-sm text-glow-300">No Accounts file picked: prices and payments won’t be imported.</p>}
            </>
          )}
          {preview.gates && <p><strong>{preview.gates.length}</strong> neighborhood gate codes.</p>}
          {preview.messages && (
            <>
              <p><strong>{preview.messages.length}</strong> history entries for <strong>{preview.messageCustomers}</strong> customers
                {preview.messageSkipped > 0 && <span className="text-slate-400"> ({preview.messageSkipped} about people who aren’t customers)</span>}.</p>
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {Object.entries(preview.messageKinds ?? {}).sort((a, b) => b[1] - a[1]).map(([kind, n]) => (
                  <li key={kind} className="rounded-full bg-white/10 px-2.5 py-1">{n} {KIND_NAMES[kind] ?? kind}{n === 1 ? '' : 's'}</li>
                ))}
              </ul>
            </>
          )}
          {preview.unmatched?.length > 0 && (
            <button type="button" onClick={() => downloadCsv('numbers-not-on-a-customer.csv', unmatchedCsv(preview.unmatched))}
              className="min-h-11 w-full rounded-full border border-white/20 px-4 text-sm font-semibold">
              Download the {preview.unmatched.length} {preview.unmatched.length === 1 ? 'number' : 'numbers'} on no customer (.csv)
            </button>
          )}
          {preview.past && (
            <p><strong>{preview.past.records.length}</strong> people from old estimate requests, payments and texts
              {preview.past.winbacks > 0 && <> (<strong>{preview.past.winbacks}</strong> paid or were invoiced before: win-backs)</>}
              <span className="text-slate-400"> ({preview.past.rows} entries: {preview.past.rows - preview.past.kept} spam/junk dropped, repeat requests merged)</span>.
              They go to the <strong>Past requests</strong> tab, not Customers.
              {preview.past.updates > 0 && <> <strong>{preview.past.updates}</strong> are already there and will be updated (statuses and notes kept).</>}</p>
          )}
          {warnings.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-glow-300">{warnings.length} {warnings.length === 1 ? 'thing' : 'things'} to check</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </details>
          )}
          {progress === 'done' ? (
            <p className="font-semibold text-emerald-400" role="status">Imported ✓</p>
          ) : (
            <button type="button" onClick={run} disabled={progress !== null}
              className="w-full rounded-full bg-glow-400 py-3.5 font-semibold text-night-950 disabled:opacity-60">
              {progress === null ? 'Import' : `Importing… ${progress}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
