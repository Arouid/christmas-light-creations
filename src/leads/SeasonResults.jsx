import { INSTALL_STATUSES, TAKEDOWN_STATUSES, gateFor, todayISO, withOption } from '../lib/customers'
import { textMessages } from '../lib/messages'
import { DEFAULT_COLUMNS, VIEW_COLUMNS, statusKey } from '../lib/views'
import DataTable from './DataTable'
import { TextButton } from './Reach'
import { blankFor, select } from './ui'

const STATUS_LIST = { install: INSTALL_STATUSES, takedown: TAKEDOWN_STATUSES }


const sortByArea = (a, b) =>
  (a.locationBlock ?? '').localeCompare(b.locationBlock ?? '') || (a.fullName ?? '').localeCompare(b.fullName ?? '')

// Customers for one season as a sortable table (desktop) or cards (phones),
// with the status editable in place. Used by the Season tab and custom tabs.
export default function SeasonResults({ rows, mode, season, columns = DEFAULT_COLUMNS, gates = [], onOpen, onUpdate }) {
  const key = statusKey(mode)
  const list = STATUS_LIST[mode]
  const blank = blankFor(mode)
  const sorted = [...rows].sort(sortByArea)
  const s = (c) => c.seasons?.[season] ?? {}
  const statusOf = (c) => s(c)[key] ?? ''
  const phoneOf = (c) => c.phone?.replace(/[^\d+]/g, '')
  const askable = (c) => mode === 'install' && phoneOf(c) && ['', 'Not Confirmed'].includes(statusOf(c))
  const setStatus = (c, v) => onUpdate(c.id, `seasons.${season}.${key}`, v)

  const statusSelect = (c, className) => (
    <select value={statusOf(c)} onClick={(e) => e.stopPropagation()} aria-label={`${mode} status for ${c.fullName}`}
      onChange={(e) => setStatus(c, e.target.value)} className={`${select} bg-night-950 ${className}`}>
      {withOption(list, statusOf(c)).map((o) => <option key={o} value={o}>{o || blank}</option>)}
    </select>
  )
  const smallPill = 'inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium'
  const askLink = (c) => <TextButton phone={c.phone} label="Ask" className={smallPill} message={textMessages.confirm(c, season)} />
  const reviewable = (c) => s(c).installStatus === 'Install Completed' && phoneOf(c)
  const reviewLink = (c) => (s(c).reviewAsked
    ? <span className="text-xs text-slate-500">asked {s(c).reviewAsked}</span>
    : <TextButton phone={c.phone} label="★ Review" className={smallPill} message={textMessages.review(c)}
        onSent={() => onUpdate(c.id, `seasons.${season}.reviewAsked`, todayISO())} />)

  const ALL = {
    name: { get: (c) => c.fullName, render: (c) => <span className="font-medium">{c.fullName}</span> },
    area: { get: (c) => c.locationBlock, className: 'max-w-[14rem] truncate' },
    type: { get: (c) => c.installType?.replace(' Install', '') },
    phone: { get: (c) => c.phone, className: 'whitespace-nowrap' },
    address: { get: (c) => c.address, className: 'max-w-xs truncate' },
    city: { get: (c) => c.city },
    week: { get: (c) => s(c).weekOf, className: 'whitespace-nowrap' },
    day: { get: (c) => s(c).day },
    date: { get: (c) => s(c).plannedDate, className: 'whitespace-nowrap' },
    timeframe: { get: (c) => s(c).timeframe, className: 'max-w-[12rem] truncate' },
    gate: { get: (c) => gateFor(c, gates)?.code, className: 'whitespace-nowrap' },
    notes: { get: (c) => s(c).schedulingNotes, className: 'max-w-xs truncate' },
    status: { get: (c) => statusOf(c) || blank, render: (c) => statusSelect(c, 'py-1.5') },
    ask: { get: () => '', render: (c) => (askable(c) ? askLink(c) : null) },
    review: { get: (c) => s(c).reviewAsked ?? '', render: (c) => (reviewable(c) ? reviewLink(c) : null) },
  }
  const labels = Object.fromEntries(VIEW_COLUMNS)
  const tableColumns = columns.filter((k) => ALL[k]).map((k) => ({ key: k, label: k === 'ask' ? '' : k === 'review' ? 'Review' : labels[k], ...ALL[k] }))

  if (sorted.length === 0) return <p className="py-6 text-center text-slate-400">Nobody here.</p>

  return (
    <>
      <div className="hidden lg:block">
        <DataTable label={`${mode}s ${season}`} rows={sorted} onRowClick={onOpen} columns={tableColumns} />
      </div>
      <ul className="space-y-2 lg:hidden">
        {sorted.map((c) => {
          const when = [s(c).weekOf, s(c).day, s(c).plannedDate].filter(Boolean).join(' · ')
          const gate = columns.includes('gate') && gateFor(c, gates)
          return (
            <li key={c.id} className="rounded-2xl border border-white/10 bg-night-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 text-left">
                  <span className="block truncate font-medium underline-offset-4 hover:underline">{c.fullName}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {[c.locationBlock, c.installType, when || s(c).timeframe].filter(Boolean).join(' · ') || 'No details yet'}
                  </span>
                  {gate && <span className="block text-xs text-glow-300">Gate {gate.code}</span>}
                </button>
                {columns.includes('ask') && askable(c) && askLink(c)}
                {columns.includes('review') && reviewable(c) && reviewLink(c)}
              </div>
              {columns.includes('status') && statusSelect(c, 'mt-2 w-full')}
            </li>
          )
        })}
      </ul>
    </>
  )
}
