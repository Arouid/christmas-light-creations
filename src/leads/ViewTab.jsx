import { describeView, matchesView, viewSeason } from '../lib/views'
import SeasonResults from './SeasonResults'
import { blankFor } from './ui'

export default function ViewTab({ view, customers, season, gates, onOpen, onUpdate, onEdit }) {
  const year = viewSeason(view, season)
  const rows = customers.filter((c) => matchesView(c, view, year))

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{view.name} <span className="text-base font-normal text-slate-400">({rows.length})</span></h2>
          <p className="text-sm text-slate-400">{year} · {describeView(view, blankFor(view.mode))}</p>
        </div>
        <button type="button" onClick={onEdit} className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">Edit tab</button>
      </div>
      <SeasonResults rows={rows} mode={view.mode ?? 'install'} season={year} columns={view.columns} gates={gates} onOpen={onOpen} onUpdate={onUpdate} />
    </>
  )
}
