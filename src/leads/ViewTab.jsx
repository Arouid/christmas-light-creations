import { describeView, matchesView, viewSeason } from '../lib/views'
import BulkEmail from './BulkEmail'
import ExportCsv from './ExportCsv'
import SeasonResults from './SeasonResults'
import { blankFor } from './ui'

export default function ViewTab({ view, customers, season, gates, onOpen, onUpdate, onEdit, onDelete }) {
  const year = viewSeason(view, season)
  const rows = customers.filter((c) => matchesView(c, view, year))

  return (
    <>
      {/* Phones: title, then the buttons wrapping under it (four buttons side by side would push the page wider than the screen). */}
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{view.name} <span className="text-base font-normal text-slate-400">({rows.length})</span></h2>
          <p className="text-sm text-slate-400">{year} · {describeView(view, blankFor(view.mode))}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
          <BulkEmail rows={rows} season={year} onUpdate={onUpdate} />
          <ExportCsv customers={rows} season={year} gates={gates} tag={view.name} />
          <button type="button" onClick={onEdit} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">Edit filter</button>
          <button type="button" className="rounded-full border border-berry-500/40 px-4 py-2 text-sm font-semibold text-berry-500 hover:bg-berry-600/10"
            onClick={() => { if (window.confirm(`Delete the "${view.name}" filter for everyone? Customers are not affected.`)) onDelete() }}>
            Delete
          </button>
        </div>
      </div>
      <SeasonResults rows={rows} mode={view.mode ?? 'install'} season={year} columns={view.columns} gates={gates} onOpen={onOpen} onUpdate={onUpdate} />
    </>
  )
}
