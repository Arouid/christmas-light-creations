import { useState } from 'react'
import { DAILY, DRAFT_DOCS, GOALS, LOG_FIELDS, PHASES, QUESTIONS, WEEKS, WHO } from '../../data/marketingPlan'
import { staffName } from '../../lib/activity'
import { todayISO } from '../../lib/customers'
import { isDone, logPath, missed, phaseFor, progress, tickPath, tickedBy, weekIndexFor, weekLabel } from '../../lib/marketing'
import { findSection } from '../../lib/marketingDocs'
import { DraftSection } from './drafts'
import { DOCS } from './draftDocs'
import { mergePaths } from '../staffStore'

const card = 'space-y-3 rounded-2xl border border-white/10 bg-night-900 p-4'
const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50'
const chipTone = { glow: 'bg-glow-400/15 text-glow-300', pine: 'bg-pine-500/15 text-pine-300', slate: 'bg-white/10 text-slate-300' }
const whenText = (ms) => (ms ? new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

// The season's marketing plan, shared by everyone (docs/specs/marketing-in-app.md):
// this week's jobs for Scott, the team and Claude with a tick everyone sees, the
// draft each one needs (copy buttons, the photo), the daily review habits, the
// Monday numbers, the goals and Scott's open questions.
export default function MarketingView({ user, settings, names, onOpenMessages }) {
  const today = todayISO()
  const current = weekIndexFor(WEEKS, today)
  const [at, setAt] = useState(current)
  const [error, setError] = useState('')
  const week = WEEKS[at]
  const phase = phaseFor(PHASES, week.from < today && today <= week.to ? today : week.from)
  const done = settings?.marketing?.done ?? {}
  const log = settings?.marketing?.log ?? {}
  const p = progress(week.tasks, done)
  const slipped = at === current ? missed(WEEKS, done, today) : []
  const who = (email) => staffName(email, names)

  async function write(paths) {
    setError('')
    try { await mergePaths(user, 'settings', 'app', paths) } catch (e) {
      console.warn('marketing save failed', e)
      setError('That didn’t save. Check your signal and try again.')
    }
  }
  const tick = (task) => write({ [tickPath(task.id)]: isDone(done, task.id) ? null : tickedBy(user.email) })

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-300/80">Season plan {WEEKS[0].from.slice(0, 4)}</p>
        <h2 className="font-display text-3xl font-extrabold">Marketing</h2>
        <p className="text-sm text-slate-400">One plan for everyone: tick a job when it’s done and the others see it. Nothing here posts or sends by itself.</p>
      </header>

      {phase && (
        <section className="rounded-2xl border border-glow-400/40 bg-glow-400/10 p-4" aria-label="This phase">
          <p className="text-xs font-semibold uppercase tracking-wider text-glow-300">Now · {phase.name}</p>
          <p className="mt-1 text-slate-100">{phase.message}</p>
        </section>
      )}

      {error && <p role="alert" className="rounded-xl border border-berry-500/50 bg-berry-600/15 px-3 py-2 text-sm">{error}</p>}

      <section className={card} aria-labelledby="mk-week">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setAt(Math.max(0, at - 1))} disabled={at === 0} className={btn} aria-label="Previous week">◀</button>
          <div className="min-w-0 flex-1">
            <h2 id="mk-week" className="font-display text-xl font-extrabold">{at === current ? 'This week' : 'Week of'} · {weekLabel(week)}</h2>
            <p className="text-sm text-slate-400">{[week.message, week.note].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" onClick={() => setAt(Math.min(WEEKS.length - 1, at + 1))} disabled={at === WEEKS.length - 1} className={btn} aria-label="Next week">▶</button>
          {at !== current && <button type="button" onClick={() => setAt(current)} className={btn}>Back to this week</button>}
        </div>
        <Bar done={p.done} total={p.total} />
        <ul className="space-y-2">
          {week.tasks.map((t) => <Task key={t.id} task={t} done={done[t.id]} who={who} onTick={() => tick(t)} disabled={!user} />)}
        </ul>
      </section>

      {slipped.length > 0 && (
        <section className={card} aria-labelledby="mk-missed">
          <h2 id="mk-missed" className="font-display text-xl font-extrabold">Still open from earlier weeks</h2>
          <p className="text-sm text-slate-400">Do it now if it still makes sense, or tick it off if the moment passed.</p>
          <ul className="space-y-2">
            {slipped.map((t) => <Task key={t.id} task={t} done={done[t.id]} who={who} onTick={() => tick(t)} disabled={!user} weekText={weekLabel(t.week)} />)}
          </ul>
        </section>
      )}

      <section className={card} aria-labelledby="mk-daily">
        <h2 id="mk-daily" className="font-display text-xl font-extrabold">Every day (a few minutes)</h2>
        <p className="text-sm text-slate-400">Reviews are the season’s main job: about 40 by the end of January.</p>
        <ul className="space-y-2">
          {DAILY.map((d) => (
            <li key={d.text} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm">{d.text}</span>
              {d.link === 'messages'
                ? <button type="button" onClick={onOpenMessages} className={btn}>{d.linkLabel}</button>
                : <a href={d.link} className={btn} {...(d.link.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{d.linkLabel}</a>}
            </li>
          ))}
        </ul>
      </section>

      <MondayLog week={week} entry={log[week.id] ?? {}} disabled={!user} onSave={(field, value) => write({ [logPath(week.id, field)]: value || null })} />

      <section className={card} aria-labelledby="mk-goals">
        <h2 id="mk-goals" className="font-display text-xl font-extrabold">Goals</h2>
        <ul className="space-y-2 text-sm">
          {GOALS.map((g) => (
            <li key={g.what} className="rounded-xl bg-white/5 px-3 py-2">
              <span className="font-semibold">{g.what}:</span> {g.target}
              <span className="block text-xs text-slate-400">Where to look: {g.where}</span>
            </li>
          ))}
        </ul>
        <SeasonLog log={log} />
      </section>

      <section className={card} aria-labelledby="mk-questions">
        <h2 id="mk-questions" className="font-display text-xl font-extrabold">Waiting on Scott</h2>
        <ul className="space-y-2">
          {QUESTIONS.map((q) => <Task key={q.id} task={{ ...q, who: 'owner' }} done={done[q.id]} who={who} onTick={() => tick(q)} disabled={!user} doneWord="Answered" />)}
        </ul>
      </section>

      <section className={card} aria-labelledby="mk-drafts">
        <h2 id="mk-drafts" className="font-display text-xl font-extrabold">All the drafts</h2>
        <p className="text-sm text-slate-400">Ready to paste. Scott posts and changes the ads; the team sends the emails from the app. The files live in docs/marketing/.</p>
        {Object.entries(DRAFT_DOCS).map(([key, d]) => (
          <details key={key} className="rounded-xl bg-white/5 px-3 py-2">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{d.label} <span className="ml-2 text-xs font-normal text-slate-400">{DOCS[key].sections.length} parts</span></summary>
            <div className="space-y-3 pb-2 pt-1">
              {DOCS[key].sections.map((s) => <DraftSection key={`${key}-${s.num ?? s.title}`} doc={DOCS[key]} section={s} />)}
            </div>
          </details>
        ))}
      </section>
    </div>
  )
}

function Bar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="space-y-1" aria-label={`${done} of ${total} done`}>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-pine-500" style={{ width: `${pct}%` }} /></div>
      <p className="text-xs text-slate-400">{done} of {total} done</p>
    </div>
  )
}

// One job: the tick (44 px), what to do, who does it, who ticked it, and its draft.
function Task({ task, done, who, onTick, disabled, weekText, doneWord = 'Done' }) {
  const [open, setOpen] = useState(false)
  const w = WHO[task.who] ?? WHO.team
  const doc = task.draft ? DOCS[task.draft.doc] : null
  const section = doc ? findSection(doc, task.draft) : null
  return (
    <li className="rounded-xl bg-white/5 px-3 py-2">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onTick} disabled={disabled} aria-pressed={Boolean(done)} aria-label={`${done ? 'Untick' : 'Tick'}: ${task.text}`}
          className={`mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl border text-lg ${done ? 'border-pine-500 bg-pine-500/20 text-pine-300' : 'border-white/20'}`}>
          {done ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1 space-y-1 py-1">
          <p className={`text-sm ${done ? 'text-slate-400 line-through' : ''}`}>{task.text}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${chipTone[w.tone]}`}>{w.label}</span>
            {weekText && <span className="text-slate-400">week of {weekText}</span>}
            {done && <span className="text-pine-300">{doneWord} · {who(done.by)}{done.at ? ` · ${whenText(done.at)}` : ''}</span>}
          </p>
        </div>
        {section && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={btn}>{open ? 'Hide draft' : '📋 Draft'}</button>
        )}
      </div>
      {open && section && <div className="mt-2"><DraftSection doc={doc} section={section} /></div>}
    </li>
  )
}

// The Monday numbers for the week on screen: saved as you leave each box.
function MondayLog({ week, entry, disabled, onSave }) {
  return (
    <section className={card} aria-labelledby="mk-log">
      <h2 id="mk-log" className="font-display text-xl font-extrabold">Monday numbers · {weekLabel(week)}</h2>
      <p className="text-sm text-slate-400">15 minutes on Monday. Requests from Leads, ads from Home → Google Ads, reviews from the Google profile and Home → Season.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LOG_FIELDS.map(([k, label]) => (
          <label key={`${week.id}-${k}`} className="grid gap-1 text-sm">
            <span className="text-slate-400">{label}</span>
            <input defaultValue={entry[k] ?? ''} disabled={disabled} maxLength={60} onBlur={(e) => { if ((e.target.value.trim() || '') !== (entry[k] ?? '')) onSave(k, e.target.value.trim()) }}
              className="min-h-11 rounded-xl border border-white/15 bg-night-950 px-3" />
          </label>
        ))}
      </div>
    </section>
  )
}

// Every week's numbers so far, in one table.
function SeasonLog({ log }) {
  const rows = WEEKS.filter((w) => log[w.id] && Object.values(log[w.id]).some(Boolean))
  if (!rows.length) return <p className="text-sm text-slate-400">The weeks’ numbers show here once someone fills in Monday numbers.</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm tabular-nums">
        <thead className="bg-white/5 text-xs text-slate-400"><tr><th className="px-3 py-2">Week</th>{LOG_FIELDS.map(([k, label]) => <th key={k} className="px-3 py-2">{label}</th>)}</tr></thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id} className="border-t border-white/10"><td className="whitespace-nowrap px-3 py-2">{weekLabel(w)}</td>{LOG_FIELDS.map(([k]) => <td key={k} className="px-3 py-2">{log[w.id][k] ?? ''}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
