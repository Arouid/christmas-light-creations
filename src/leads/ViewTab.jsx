import { describeView, matchesView, viewSeason } from '../lib/views'
import BulkEmail from './BulkEmail'
import SeasonResults from './SeasonResults'
import { blankFor } from './ui'

export default function ViewTab({ view, customers, season, gates, onOpen, onUpdate, onEdit, onDelete }) {
  const year = viewSeason(view, season)
  const rows = customers.filter((c) => matchesView(c, view, year))

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{view.name} <span className="text-base font-normal text-slate-400">({rows.length})</span></h2>
          <p className="text-sm text-slate-400">{year} · {describeView(view, blankFor(view.mode))}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <BulkEmail rows={rows} season={year} onUpdate={onUpdate} />
          <button type="button" onClick={onEdit} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">Edit tab</button>
          <button type="button" className="rounded-full border border-berry-500/40 px-4 py-2 text-sm font-semibold text-berry-500 hover:bg-berry-600/10"
            onClick={() => { if (window.confirm(`Delete the "${view.name}" tab for everyone? Customers are not affected.`)) onDelete() }}>
            Delete
          </button>
        </div>
      </div>
      <SeasonResults rows={rows} mode={view.mode ?? 'install'} season={year} columns={view.columns} gates={gates} onOpen={onOpen} onUpdate={onUpdate} />
    </>
  )
}
