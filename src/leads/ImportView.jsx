import { useState } from 'react'
import { buildCustomers, buildGateCodes } from '../lib/importSheet'
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
  return { rows: data.length, kept: kept.length, updates: people.filter((p) => known.has(p.id)).length, records: people.map(({ id, ...rest }) => ({ id, data: rest })) }
}

const fileInput = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-900 px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-100'

const FILES = [
  ['scheduling', 'Scheduling tab (.csv)'],
  ['accounts', 'Accounts tab (.csv)'],
  ['gates', 'Gate Codes tab (.csv), optional'],
  ['messages', 'Text history (.json, made by Claude from the Voice export), optional'],
  ['past', 'Old website estimate requests (past-requests-all.csv from old-site-backup), optional'],
]

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
        const known = new Set(existing.map((c) => c.id))
        const list = (parsed.messages ?? []).filter((m) => m.id && known.has(m.data?.customerId))
        p.messages = list
        p.messageCustomers = new Set(list.map((m) => m.data.customerId)).size
        p.messageSkipped = (parsed.messages ?? []).length - list.length
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
            <p><strong>{preview.messages.length}</strong> past texts and calls for <strong>{preview.messageCustomers}</strong> customers
              {preview.messageSkipped > 0 && <span className="text-slate-400"> ({preview.messageSkipped} skipped: customer not in the app)</span>}.</p>
          )}
          {preview.past && (
            <p><strong>{preview.past.records.length}</strong> people from the old website’s estimate requests
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
