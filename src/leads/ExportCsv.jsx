import { useState } from 'react'
import { customersCsv, exportFileName } from '../lib/customersExport'

// "⬇ Export N to spreadsheet": hands the browser a .csv of exactly the rows
// the tab shows (TODO F, 2026-10-13). On a computer it lands in Downloads;
// on a phone in Downloads / Files (iPhone offers the share sheet).
function saveFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

const pill = 'min-h-11 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold lg:min-h-0'

// customers: the filtered list. kind 'customers' | 'season' (+ mode) names the
// file; tag (a saved filter's name, a search) goes in the name too.
export default function ExportCsv({ customers, season, gates = [], kind = 'customers', mode = 'install', tag = '', className = pill }) {
  const [done, setDone] = useState(false)
  if (!customers.length) return null

  function run() {
    saveFile(exportFileName({ kind, season, mode, tag }), customersCsv(customers, { season, gates }))
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }

  return (
    <button type="button" onClick={run} className={className} title="A .csv file: opens in Excel, Numbers or Google Sheets">
      {done ? `${customers.length} exported ✓` : `⬇ Export ${customers.length} to spreadsheet`}
    </button>
  )
}
