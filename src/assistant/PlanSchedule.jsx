import { useMemo, useState } from 'react'
import { todayISO } from '../lib/customers'
import { EmailQueue } from '../leads/BulkEmail'
import { select } from '../leads/ui'
import { proposeSchedule } from './scheduleApi'
import {
  MAX_CUSTOMERS, MAX_INSTRUCTION_CHARS, MAX_RANGE_DAYS, currentOf, daysBetween, dayLoads, defaultRange, diffPlans, dropFrom, monthDayOf, moveTo, unscheduled, weekdayOf, writesFor,
} from '../../functions/assistant/schedulePrompt.js'

// ✨ Plan with Claude (docs/specs/schedule-assistant.md): staff pick a date
// range and who still needs an install day; Claude proposes a day for each
// with a reason; staff move or drop people, then Apply writes the Season
// fields (same client writes as the Season tab) and offers the "You are on
// the schedule" email batch. "Tell Claude a change" sends the plan as it
// stands (with staff's own moves) plus one instruction and shows what moved.
// Nothing is written until Apply.
const primary = 'rounded-full bg-glow-400 px-5 py-3 font-semibold text-night-950 disabled:opacity-40'
const short = (day) => `${weekdayOf(day).slice(0, 3)} ${monthDayOf(day)}`

export default function PlanSchedule({ customers, season, onUpdate, onClose }) {
  const today = todayISO()
  const [range, setRange] = useState(() => defaultRange(today, season))
  const candidates = useMemo(() => unscheduled(customers, season), [customers, season])
  const [unticked, setUnticked] = useState(() => new Set())
  const [step, setStep] = useState('pick') // pick | thinking | plan | applying | done
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')
  const [setStatus, setSetStatus] = useState(true)
  const [applied, setApplied] = useState({ written: [], skipped: [], failed: [] })
  const [emailing, setEmailing] = useState(false)
  const [note, setNote] = useState('') // "Tell Claude a change"
  const [lastNote, setLastNote] = useState('')
  const [changed, setChanged] = useState(new Map()) // customerId → { from, to } after a re-plan
  const [replanning, setReplanning] = useState(false)
  const [removed, setRemoved] = useState(new Set()) // taken out with ✕: never placed again, not written

  const picked = candidates.filter((c) => !unticked.has(c.id))
  const rangeDays = daysBetween(range.from, range.to) + 1
  const rangeProblem = range.to < range.from ? 'The end date is before the start.' : rangeDays > MAX_RANGE_DAYS ? `Keep the range under ${MAX_RANGE_DAYS} days.` : ''
  const pickProblem = rangeProblem || (picked.length > MAX_CUSTOMERS ? `At most ${MAX_CUSTOMERS} people per plan: untick some or narrow the area filter first.` : '')

  async function makePlan() {
    setError('')
    setStep('thinking')
    try {
      const p = await proposeSchedule({ from: range.from, to: range.to, customerIds: picked.map((c) => c.id) }, customers)
      setPlan(p)
      setChanged(new Map())
      setRemoved(new Set())
      setLastNote('')
      setStep('plan')
    } catch (err) {
      setError(err.message)
      setStep('pick')
    }
  }

  // Re-plan: the plan as it stands (moves and removals included) plus the note;
  // Claude revises it and fills freed spots from everyone not placed, including
  // people unticked at the start who still need a day.
  const removedList = [...removed]
  const canReplan = Boolean(note.trim()) || removedList.length > 0
  async function replan() {
    const instruction = note.trim()
    if (!canReplan || replanning) return
    setError('')
    setReplanning(true)
    try {
      const ids = [...new Set([...plan.customers.map((c) => c.id), ...candidates.map((c) => c.id)])].slice(0, MAX_CUSTOMERS)
      const p = await proposeSchedule({ from: range.from, to: range.to, customerIds: ids, instruction, current: currentOf(plan, removedList) }, customers)
      setChanged(new Map(diffPlans(plan, p).filter((c) => !removed.has(c.customerId)).map((c) => [c.customerId, c])))
      setPlan(p)
      setLastNote(instruction || (removedList.length ? `fill the spot${removedList.length === 1 ? '' : 's'} left by ${removedList.map((id) => nameOf(id).name).join(', ')}` : ''))
      setNote('')
    } catch (err) {
      setError(err.message)
    } finally {
      setReplanning(false)
    }
  }

  const nameOf = (id) => plan?.customers.find((c) => c.id === id) ?? { id, name: customers.find((c) => c.id === id)?.fullName ?? id, area: '', installType: '', wish: '' }
  function remove(id) {
    setPlan((p) => dropFrom(p, id, 'Removed by staff'))
    setRemoved((r) => new Set([...r, id]))
  }
  function place(id, day) {
    setPlan((p) => moveTo(p, id, day))
    setRemoved((r) => { const n = new Set(r); n.delete(id); return n })
  }
  const loads = plan ? dayLoads(plan.assignments, plan.days) : []
  const overDays = loads.filter((d) => d.over)

  async function apply() {
    setStep('applying')
    const written = []
    const skipped = []
    const failed = []
    for (const w of writesFor(plan.assignments, season, { setStatus })) {
      const c = customers.find((x) => x.id === w.customerId)
      const s = c?.seasons?.[season] ?? {}
      if (!c) { skipped.push({ id: w.customerId, why: 'record gone' }); continue }
      if (s.plannedDate || s.weekOf) { skipped.push({ id: w.customerId, why: `already has ${s.plannedDate || `week of ${s.weekOf}`}` }); continue }
      try {
        for (const [path, value] of Object.entries(w.fields)) await onUpdate(w.customerId, path, value)
        written.push(w.customerId)
      } catch (err) {
        failed.push({ id: w.customerId, why: err.message })
      }
    }
    setApplied({ written, skipped, failed })
    setPlan((p) => ({ ...p, assignments: p.assignments.filter((a) => failed.some((f) => f.id === a.customerId)) }))
    setStep('done')
  }

  const writtenRows = customers.filter((c) => applied.written.includes(c.id))

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Plan with Claude">
      <div className="mx-auto flex min-h-svh max-w-3xl flex-col p-4">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 bg-night-950/95 px-4 pb-3 pt-1">
          <h2 className="font-display text-2xl font-extrabold">✨ Plan with Claude</h2>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold">{step === 'done' ? 'Done' : 'Close'}</button>
        </div>

        {(step === 'pick' || step === 'thinking') && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Claude proposes an install day for everyone below: their wishes and notes first, early installs before the discount deadline, days not over the website’s capacity, grouped by area. You adjust, then Apply. Nothing is written until then.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-400">From
                <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={`mt-1 w-full ${select}`} />
              </label>
              <label className="text-sm text-slate-400">To
                <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={`mt-1 w-full ${select}`} />
              </label>
            </div>
            {candidates.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-night-900 p-4 text-sm text-slate-300">
                Nobody needs a day: everyone who said yes this season already has a planned date or week. Set Install status to “Confirmed - Needs to be Scheduled” (or Wants lights? to Confirmed) for the people to plan.
              </p>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-night-900 p-3">
                <div className="flex items-center justify-between gap-2 px-1 pb-2">
                  <p className="text-sm font-semibold">{picked.length} of {candidates.length} to plan</p>
                  <button type="button" onClick={() => setUnticked(unticked.size ? new Set() : new Set(candidates.map((c) => c.id)))} className="text-sm text-slate-400 underline">
                    {unticked.size ? 'Tick all' : 'Untick all'}
                  </button>
                </div>
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
                        <input type="checkbox" checked={!unticked.has(c.id)} onChange={(e) => { const n = new Set(unticked); if (e.target.checked) n.delete(c.id); else n.add(c.id); setUnticked(n) }} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{c.fullName} {c.installType === 'Early Install' && <span className="text-glow-300">⭐</span>}</span>
                          <span className="block truncate text-xs text-slate-400">{[c.locationBlock, c.seasons?.[season]?.timeframe].filter(Boolean).join(' · ') || 'No area or timeframe on file'}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(pickProblem || error) && <p role="alert" className="rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">{pickProblem || error}</p>}
            {candidates.length > 0 && (
              <button type="button" onClick={makePlan} disabled={step === 'thinking' || !picked.length || !!pickProblem} className={`w-full ${primary}`}>
                {step === 'thinking' ? 'Planning… (up to a minute)' : `Make a plan for ${picked.length}`}
              </button>
            )}
          </div>
        )}

        {(step === 'plan' || step === 'applying') && plan && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-glow-400/30 bg-glow-400/5 p-4">
              {lastNote && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-glow-300">After your note: “{lastNote}”</p>}
              <p className="text-sm leading-relaxed text-slate-100">{plan.explanation}</p>
              <p className="mt-2 text-xs text-slate-400">
                {short(range.from)} to {short(range.to)}{plan.deadline && ` · early-install deadline ${monthDayOf(`${season}-${plan.deadline}`)}`} · {plan.assignments.length} placed, {plan.unplaced.length} not
              </p>
            </div>
            {overDays.length > 0 && (
              <p role="alert" className="rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">
                Over capacity: {overDays.map((d) => `${short(d.day)} (${d.total} of ${d.capacity})`).join(', ')}. Move someone before you apply, or raise the day in ⚙ Settings.
              </p>
            )}

            {loads.filter((d) => d.proposed > 0).map((d) => (
              <section key={d.day} aria-label={short(d.day)} className="rounded-2xl border border-white/10 bg-night-900 p-3">
                <h3 className="flex items-center justify-between gap-2 px-1 pb-2">
                  <span className="font-semibold">{weekdayOf(d.day)} {monthDayOf(d.day)}</span>
                  <span className={`text-xs ${d.over ? 'text-berry-500' : 'text-slate-400'}`}>{d.total} of {d.capacity}{d.booked ? ` (${d.booked} already booked)` : ''}</span>
                </h3>
                <ul className="space-y-2">
                  {plan.assignments.filter((a) => a.day === d.day).map((a) => <Person key={a.customerId} a={a} c={nameOf(a.customerId)} days={plan.days} onPlace={place} onRemove={remove} change={changed.get(a.customerId)} />)}
                </ul>
              </section>
            ))}

            {plan.unplaced.length > 0 && (
              <section aria-label="Not placed" className="rounded-2xl border border-white/10 bg-night-900 p-3">
                <h3 className="px-1 pb-2 font-semibold text-slate-300">Not placed <span className="text-xs text-slate-400">({plan.unplaced.length})</span></h3>
                <ul className="space-y-2">
                  {plan.unplaced.map((u) => <Person key={u.customerId} a={u} c={nameOf(u.customerId)} days={plan.days} onPlace={place} onRemove={remove} removed={removed.has(u.customerId)} change={changed.get(u.customerId)} />)}
                </ul>
              </section>
            )}

            <div className="rounded-2xl border border-white/10 bg-night-900 p-3">
              <label htmlFor="plan-note" className="block px-1 text-sm font-semibold">Tell Claude a change</label>
              <p className="px-1 text-xs text-slate-400">“Move Alice to the 20th with Debbie”, “keep Monday open”, “Kay and Leann must stay together”, “Donna can go in November after all”. Your own moves above are kept. Took someone out with ✕? Re-plan fills their spot from the people not placed{candidates.length > plan.customers.length ? ' (including anyone you unticked at the start)' : ''}.</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <textarea id="plan-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, MAX_INSTRUCTION_CHARS))} rows={2} disabled={replanning || step === 'applying'}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); replan() } }}
                  className={`${select} min-h-11 flex-1 resize-y`} placeholder="What should change?" />
                <button type="button" onClick={replan} disabled={replanning || !canReplan || step === 'applying'}
                  className="min-h-11 rounded-full bg-white px-5 font-semibold text-night-950 disabled:opacity-40">
                  {replanning ? 'Re-planning…' : removedList.length && !note.trim() ? `↻ Re-plan: fill ${removedList.length} spot${removedList.length === 1 ? '' : 's'}` : '↻ Re-plan'}
                </button>
              </div>
              {error && <p role="alert" className="mt-2 rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">{error}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={setStatus} onChange={(e) => setSetStatus(e.target.checked)} />
              Also set Install status to “Install Scheduled”
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { setPlan(null); setStep('pick') }} disabled={step === 'applying'} className="rounded-full border border-white/20 px-5 py-3 font-semibold disabled:opacity-40">← Start over</button>
              <button type="button" onClick={apply} disabled={step === 'applying' || !plan.assignments.length} className={`flex-1 ${primary}`}>
                {step === 'applying' ? 'Writing dates…' : `Apply: set ${plan.assignments.length} planned date${plan.assignments.length === 1 ? '' : 's'}`}
              </button>
            </div>
            <p className="text-xs text-slate-400">Apply writes Planned date, Day and Week of on each customer, as if typed in the Season tab. Then you can email them “You are on the schedule”.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <p className="text-lg font-semibold">{applied.written.length ? `${applied.written.length} scheduled.` : 'Nothing was written.'}</p>
            {applied.skipped.length > 0 && (
              <div className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">
                <p className="font-semibold">Skipped (someone scheduled them meanwhile):</p>
                <ul className="mt-1 list-disc pl-5">{applied.skipped.map((s) => <li key={s.id}>{nameOf(s.id).name}: {s.why}</li>)}</ul>
              </div>
            )}
            {applied.failed.length > 0 && (
              <div role="alert" className="rounded-xl bg-berry-600/20 px-3 py-2 text-sm text-berry-500">
                <p className="font-semibold">Not written (try Apply again):</p>
                <ul className="mt-1 list-disc pl-5">{applied.failed.map((s) => <li key={s.id}>{nameOf(s.id).name}: {s.why}</li>)}</ul>
                <button type="button" onClick={() => setStep('plan')} className="mt-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100">Back to the plan</button>
              </div>
            )}
            {writtenRows.length > 0 && (
              <>
                <p className="text-sm text-slate-300">Tell them? Each gets their own “You are on the schedule” email from info@ with the date just set; you see each one before it goes.</p>
                <button type="button" onClick={() => setEmailing(true)} className={`w-full ${primary}`}>
                  ✉ Email these {writtenRows.filter((c) => c.email?.includes('@')).length}
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="w-full rounded-full border border-white/20 py-3 font-semibold">Done</button>
          </div>
        )}
      </div>
      {emailing && <EmailQueue rows={writtenRows} season={season} onUpdate={onUpdate} templateId="schedule-confirm" onClose={() => setEmailing(false)} />}
    </div>
  )
}

// One person in the plan: name, area, reason, where to move them, ✕ to take
// them out, and what the last re-plan changed for them.
function Person({ a, c, days, onPlace, onRemove, removed = false, change }) {
  const placed = Boolean(a.day)
  return (
    <li className={`flex flex-col gap-2 rounded-xl bg-night-950 p-3 sm:flex-row sm:items-start ${change ? 'ring-1 ring-glow-400/60' : ''} ${removed ? 'opacity-70' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {c.name} {c.installType === 'early' && <span className="text-glow-300">⭐</span>}
          {change && <span className="ml-2 rounded-full bg-glow-400 px-2 py-0.5 text-xs font-semibold text-night-950">Changed · was {change.from ? short(change.from) : 'not placed'}</span>}
        </p>
        {(c.area || c.wish) && <p className="truncate text-xs text-slate-400">{[c.area, c.wish].filter(Boolean).join(' · ')}</p>}
        <p className="mt-1 text-sm text-slate-300">{a.reason}</p>
      </div>
      <div className="flex gap-2">
        <select value={placed ? a.day : ''} aria-label={`Day for ${c.name}`} className={`${select} min-h-11 flex-1 sm:w-40`}
          onChange={(e) => (e.target.value ? onPlace(a.customerId, e.target.value) : onRemove(a.customerId))}>
          <option value="">{placed ? 'Take out' : removed ? 'Removed · pick a day to put back' : 'Not placed'}</option>
          {days.map((d) => <option key={d.day} value={d.day}>{short(d.day)}{d.capacity === 0 ? ' (closed)' : ''}</option>)}
        </select>
        {placed && (
          <button type="button" onClick={() => onRemove(a.customerId)} aria-label={`Remove ${c.name} from the plan`} title="Take out of the plan"
            className="min-h-11 min-w-11 rounded-xl border border-white/15 px-3 text-lg text-slate-300 hover:bg-white/10">✕</button>
        )}
      </div>
    </li>
  )
}
