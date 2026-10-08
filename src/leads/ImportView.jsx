import { useState } from 'react'
import { buildCustomers } from '../lib/importSheet'

async function readCsv(file) {
  const { default: Papa } = await import('papaparse')
  const text = await file.text()
  const { data, errors } = Papa.parse(text, { skipEmptyLines: false })
  if (errors.length && !data.length) throw new Error(`Couldn't read ${file.name}: ${errors[0].message}`)
  return data
}

const fileInput = 'mt-1 block w-full rounded-xl border border-white/15 bg-night-900 px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-100'

export default function ImportView({ existing, onImport }) {
  const [files, setFiles] = useState({})
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  async function check(nextFiles) {
    setFiles(nextFiles)
    setPreview(null)
    setError(null)
    setProgress(null)
    if (!nextFiles.scheduling) return
    try {
      const scheduling = await readCsv(nextFiles.scheduling)
      const accounts = nextFiles.accounts ? await readCsv(nextFiles.accounts) : []
      const result = buildCustomers(scheduling, accounts)
      const ids = new Set(existing.map((c) => c.id))
      setPreview({ ...result, updates: result.customers.filter((c) => ids.has(c.id)).length })
    } catch (err) {
      setError(err.message)
    }
  }

  async function run() {
    setProgress(0)
    try {
      await onImport(preview.customers, setProgress)
      setProgress('done')
    } catch (err) {
      setError(err.message)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-night-900 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">From the Google Sheet</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open the <strong>Scheduling</strong> tab → <strong>File → Download → Comma-separated values (.csv)</strong>.</li>
          <li>Do the same for the <strong>Accounts</strong> tab.</li>
          <li>Pick both files below, check the preview, then Import.</li>
        </ol>
        <p className="mt-2 text-slate-400">Importing again later is safe: it updates the same customers instead of adding copies. Blank cells in the sheet never erase what was typed here; filled cells do replace it.</p>
      </div>

      <label className="block text-sm text-slate-400">Scheduling tab (.csv)
        <input type="file" accept=".csv,text/csv" className={fileInput} onChange={(e) => check({ ...files, scheduling: e.target.files[0] })} />
      </label>
      <label className="block text-sm text-slate-400">Accounts tab (.csv)
        <input type="file" accept=".csv,text/csv" className={fileInput} onChange={(e) => check({ ...files, accounts: e.target.files[0] })} />
      </label>

      {error && <p className="rounded-xl bg-berry-600/20 p-3 text-sm text-berry-500" role="alert">{error}</p>}

      {preview && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4">
          <p><strong>{preview.customers.length}</strong> customers found
            {' '}(<strong>{preview.customers.length - preview.updates}</strong> new, <strong>{preview.updates}</strong> already here and will be updated).</p>
          <p className="text-sm text-slate-400">Seasons: statuses and rates go to {preview.currentSeason}; payments and last year's dates go to {preview.previousSeason}.</p>
          {!files.accounts && <p className="text-sm text-glow-300">No Accounts file picked: prices and payments won't be imported.</p>}
          {preview.warnings.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-glow-300">{preview.warnings.length} {preview.warnings.length === 1 ? "thing" : "things"} to check</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </details>
          )}
          {progress === 'done' ? (
            <p className="font-semibold text-emerald-400" role="status">Imported ✓ Check the Customers tab.</p>
          ) : (
            <button type="button" onClick={run} disabled={progress !== null}
              className="w-full rounded-full bg-glow-400 py-3.5 font-semibold text-night-950 disabled:opacity-60">
              {progress === null ? `Import ${preview.customers.length} customers` : `Importing… ${progress}/${preview.customers.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
