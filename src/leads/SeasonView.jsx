import { useMemo, useState } from 'react'
import { business } from '../data/content'
import { BLANK_LABEL, INSTALL_STATUSES, TAKEDOWN_STATUSES, withOption } from '../lib/customers'
import Icon from '../components/Icon'
import DataTable from './DataTable'

const select = 'rounded-xl border border-white/15 bg-night-900 px-3 py-2.5 text-sm'

const STAGES = {
  install: { key: 'installStatus', list: INSTALL_STATUSES, blank: BLANK_LABEL.installStatus },
  takedown: { key: 'takedownStatus', list: TAKEDOWN_STATUSES, blank: BLANK_LABEL.takedownStatus },
}

const confirmText = (c, year) =>
  `Hi ${c.firstName || 'there'}, this is ${business.name}! We're scheduling ${year} installs. Would you like your lights again this year? Reply YES and any timing preferences.`

export default function SeasonView({ customers, season, onOpen, onUpdate }) {
  const [mode, setMode] = useState('install')
  const [stage, setStage] = useState('all')
  const [area, setArea] = useState('')
  const [type, setType] = useState('')
  const { key, list, blank } = STAGES[mode]

  const areas = useMemo(() => [...new Set(customers.map((c) => c.locationBlock).filter(Boolean))].sort(), [customers])
  const inFilters = (c) => (!area || c.locationBlock === area) && (!type || c.installType === type)
  const statusOf = (c) => c.seasons?.[season]?.[key] ?? ''

  const counts = new Map(list.map((s) => [s, 0]))
  customers.filter(inFilters).forEach((c) => counts.set(statusOf(c), (counts.get(statusOf(c)) ?? 0) + 1))
  const stages = [...counts]

  const shown = customers
    .filter((c) => inFilters(c) && (stage === 'all' || statusOf(c) === stage))
    .sort((a, b) => (a.locationBlock ?? '').localeCompare(b.locationBlock ?? '') || (a.fullName ?? '').localeCompare(b.fullName ?? ''))

  return (
    <>
      <div className="flex gap-2" role="tablist" aria-label="Install or takedown">
        {['install', 'takedown'].map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setStage('all') }}
            className={`flex-1 rounded-xl py-2.5 font-semibold capitalize ${mode === m ? 'bg-white text-night-950' : 'bg-white/10'}`}>
            {m}s {season}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select value={area} onChange={(e) => setArea(e.target.value)} className={select} aria-label="Location block">
          <option value="">All areas</option>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={select} aria-label="Install type">
          <option value="">Early + regular</option>
          <option>Early Install</option>
          <option>Regular Install</option>
        </select>
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2" aria-label="Filter by status">
        <button type="button" onClick={() => setStage('all')}
          className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${stage === 'all' ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
          All <span className="opacity-70">{customers.filter(inFilters).length}</span>
        </button>
        {stages.filter(([, n]) => n > 0).map(([s, n]) => (
          <button key={s || 'blank'} type="button" onClick={() => setStage(s)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${stage === s ? 'bg-glow-400 text-night-950' : 'bg-white/10'}`}>
            {s || blank} <span className="opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 hidden lg:block">
        <DataTable label={`${mode}s ${season}`} rows={shown} onRowClick={onOpen} columns={[
          { key: 'name', label: 'Name', get: (c) => c.fullName, render: (c) => <span className="font-medium">{c.fullName}</span> },
          { key: 'area', label: 'Area', get: (c) => c.locationBlock, className: 'max-w-[14rem] truncate' },
          { key: 'type', label: 'Type', get: (c) => c.installType?.replace(' Install', '') },
          { key: 'week', label: 'Week of', get: (c) => c.seasons?.[season]?.weekOf, className: 'whitespace-nowrap' },
          { key: 'day', label: 'Day', get: (c) => c.seasons?.[season]?.day },
          { key: 'date', label: 'Date', get: (c) => c.seasons?.[season]?.plannedDate, className: 'whitespace-nowrap' },
          { key: 'timeframe', label: 'Timeframe', get: (c) => c.seasons?.[season]?.timeframe, className: 'max-w-[12rem] truncate' },
          { key: 'status', label: 'Status', get: (c) => statusOf(c) || blank, render: (c) => (
            <select value={statusOf(c)} onClick={(e) => e.stopPropagation()} aria-label={`${mode} status for ${c.fullName}`}
              onChange={(e) => onUpdate(c.id, `seasons.${season}.${key}`, e.target.value)} className={`${select} bg-night-950 py-1.5`}>
              {withOption(list, statusOf(c)).map((o) => <option key={o} value={o}>{o || blank}</option>)}
            </select>
          ) },
          { key: 'ask', label: '', get: () => '', render: (c) => {
            const phone = c.phone?.replace(/[^\d+]/g, '')
            return phone && mode === 'install' && ['', 'Not Confirmed'].includes(statusOf(c)) ? (
              <a href={`sms:${phone}?&body=${encodeURIComponent(confirmText(c, season))}`} onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium"><Icon name="chat" className="size-3.5" /> Ask</a>
            ) : null
          } },
        ]} />
      </div>
      <ul className="mt-2 space-y-2 lg:hidden">
        {shown.map((c) => {
          const s = c.seasons?.[season] ?? {}
          const phone = c.phone?.replace(/[^\d+]/g, '')
          const when = [s.weekOf, s.day, s.plannedDate].filter(Boolean).join(' · ')
          const needsAsking = mode === 'install' && ['', 'Not Confirmed'].includes(s.installStatus ?? '')
          return (
            <li key={c.id} className="rounded-2xl border border-white/10 bg-night-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 text-left">
                  <span className="block truncate font-medium underline-offset-4 hover:underline">{c.fullName}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {[c.locationBlock, c.installType, when || s.timeframe].filter(Boolean).join(' · ') || 'No details yet'}
                  </span>
                </button>
                {phone && needsAsking && (
                  <a href={`sms:${phone}?&body=${encodeURIComponent(confirmText(c, season))}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
                    <Icon name="chat" className="size-3.5" /> Ask
                  </a>
                )}
              </div>
              <select value={s[key] ?? ''} aria-label={`${mode} status for ${c.fullName}`}
                onChange={(e) => onUpdate(c.id, `seasons.${season}.${key}`, e.target.value)}
                className={`mt-2 w-full ${select} bg-night-950`}>
                {withOption(list, s[key]).map((o) => <option key={o} value={o}>{o || blank}</option>)}
              </select>
            </li>
          )
        })}
        {shown.length === 0 && <li className="py-6 text-center text-slate-400">Nobody here.</li>}
      </ul>
    </>
  )
}
