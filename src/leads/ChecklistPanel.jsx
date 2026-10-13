import { useState } from 'react'
import { CHECKLIST, GROUP_LABEL, STORE_KEY, doneCount, storeTicks, ticksFor, toggleTick } from '../lib/checklist'
import { label, panel } from './HomePanels'

// "My checklist" on Home (src/lib/checklist.js, owner 2026-10-13): Katie's
// list where she'll see it. Ticks are per device; today's clear each day,
// the week's each Monday. "Open" jumps to the place the item is done.
const read = () => { try { return localStorage.getItem(STORE_KEY) } catch { return null } }
const write = (ticks) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(storeTicks(ticks))) } catch { /* private mode: fine */ } }

export default function ChecklistPanel({ wall, onOpenMessages }) {
  const [ticks, setTicks] = useState(() => ticksFor(read()))
  const [group, setGroup] = useState('daily')
  const set = (id, on) => { const next = toggleTick(ticksFor(storeTicks(ticks)), group, id, on); setTicks(next); write(next) }
  const open = (where) => (where === 'messages' ? onOpenMessages?.() : where && window.location.assign(`#${where}`))
  const items = CHECKLIST[group]
  const done = doneCount(ticks, group)
  return (
    <section className={panel} aria-label="My checklist">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={label}>My checklist</h2>
        <span className="text-xs text-slate-400 tabular-nums">{done} of {items.length}</span>
      </div>
      <div className="mt-2 flex gap-1" role="tablist" aria-label="Which list">
        {Object.keys(CHECKLIST).map((g) => (
          <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => setGroup(g)}
            className={`min-h-9 rounded-full px-3 text-xs font-semibold ${group === g ? 'bg-glow-400 text-night-950' : 'border border-white/15 text-slate-300'}`}>
            {GROUP_LABEL[g]}{doneCount(ticks, g) === CHECKLIST[g].length ? ' ✓' : ''}
          </button>
        ))}
      </div>
      <ul className={`mt-3 space-y-1 ${wall ? 'text-lg' : 'text-sm'}`}>
        {items.map(([id, what, where]) => {
          const on = ticks[group].has(id)
          return (
            <li key={id} className="flex items-start gap-2">
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 py-1.5">
                <input type="checkbox" checked={on} onChange={(e) => set(id, e.target.checked)} className="mt-1 size-5 shrink-0 accent-glow-400" />
                <span className={`min-w-0 ${on ? 'text-slate-500 line-through decoration-pine-500' : 'text-slate-200'}`}>{what}</span>
              </label>
              {where && !wall && <button type="button" onClick={() => open(where)} className="min-h-11 shrink-0 px-2 text-xs font-semibold text-glow-300">Open</button>}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-500">{group === 'daily' ? 'Clears every morning.' : group === 'weekly' ? 'Clears every Monday.' : 'Stays until you untick it.'} Ticks live on this device.</p>
    </section>
  )
}
