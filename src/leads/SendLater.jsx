import { useMemo, useState } from 'react'
import { MAX_AHEAD_DAYS, addDays, atNight, centralParts, centralToMs, quickPicks, sendAtProblem, whenText } from '../../functions/scheduleTime.js'
import { field } from './EmailParts'

// "Send later" time choice (docs/specs/scheduled-email.md): Tomorrow 8 am,
// Tomorrow 1 pm, Monday 8 am, or any date and time, always Central.
// Controlled: calls onChange(ms) on every change; `value` sets the start
// (an edit opens on its current time).
export function TimePicker({ value, onChange }) {
  const [now] = useState(() => Date.now())
  const picks = useMemo(() => quickPicks(now), [now])
  const start = Number.isFinite(value) && value > now ? centralParts(value) : null
  const [choice, setChoice] = useState(() => (start ? picks.find((p) => p.at === value)?.label ?? 'custom' : picks[0].label))
  const [day, setDay] = useState(start?.day ?? addDays(centralParts(now).day, 1))
  const [time, setTime] = useState(start?.time ?? '08:00')
  const today = centralParts(now).day

  function choose(label, nextDay = day, nextTime = time) {
    setChoice(label)
    setDay(nextDay)
    setTime(nextTime)
    onChange(label === 'custom' ? centralToMs(nextDay, nextTime) : picks.find((p) => p.label === label).at)
  }

  const chip = (on) => `min-h-11 rounded-xl px-3 py-2 text-left text-sm ${on ? 'bg-glow-400 text-night-950' : 'bg-white/10 text-slate-100'}`
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {picks.map((p) => (
          <button key={p.label} type="button" onClick={() => choose(p.label)} aria-pressed={choice === p.label} className={chip(choice === p.label)}>
            <span className="block font-semibold">{p.label}</span>
            <span className={`block text-xs ${choice === p.label ? 'text-night-950/70' : 'text-slate-400'}`}>{shortDate(p.at)}</span>
          </button>
        ))}
        <button type="button" onClick={() => choose('custom')} aria-pressed={choice === 'custom'} className={chip(choice === 'custom')}>
          <span className="block font-semibold">Pick date &amp; time</span>
          <span className={`block text-xs ${choice === 'custom' ? 'text-night-950/70' : 'text-slate-400'}`}>up to {MAX_AHEAD_DAYS} days</span>
        </button>
      </div>
      {choice === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0 text-sm text-slate-400">Date
            <input type="date" value={day} min={today} max={addDays(today, MAX_AHEAD_DAYS)} onChange={(e) => choose('custom', e.target.value, time)} className={field} />
          </label>
          <label className="block min-w-0 text-sm text-slate-400">Time (Central)
            <input type="time" value={time} step={300} onChange={(e) => choose('custom', day, e.target.value)} className={field} />
          </label>
        </div>
      )}
    </div>
  )
}

const shortDate = (ms) => new Date(`${centralParts(ms).day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })

// What to say under the picker: why it can't be used, or a night-time note.
export function TimeNote({ at }) {
  const problem = sendAtProblem(at)
  if (problem) return <p role="alert" className="text-sm text-berry-500">{problem}</p>
  return atNight(at) ? <p className="text-sm text-glow-300">That’s at night for customers ({whenText(at)} Central).</p> : null
}

// The "Send later" box under an email: pick a time, then one button.
// count > 1: a list ("Schedule 12 emails for …").
export default function SendLater({ count = 1, busy, onSchedule, onBack }) {
  const [at, setAt] = useState(() => quickPicks(Date.now())[0].at)
  const ok = !sendAtProblem(at)
  return (
    <div className="space-y-3 rounded-2xl border border-glow-400/40 p-3">
      <p className="text-sm font-semibold">⏰ Send later <span className="font-normal text-slate-400">· Central time, goes within 5 minutes after</span></p>
      <TimePicker value={at} onChange={setAt} />
      <TimeNote at={at} />
      <button type="button" onClick={() => onSchedule(at)} disabled={busy || !ok}
        className="w-full rounded-full bg-glow-400 py-3 font-semibold text-night-950 disabled:opacity-50">
        {busy ? 'Scheduling…' : `Schedule ${count > 1 ? `${count} emails ` : ''}for ${ok ? whenText(at) : '…'}`}
      </button>
      <button type="button" onClick={onBack} disabled={busy} className="block min-h-11 w-full text-center text-sm text-slate-400 underline">Back</button>
    </div>
  )
}
