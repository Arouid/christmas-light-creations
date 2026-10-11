import { useState } from 'react'
import { GUIDE_UPDATED, SECTIONS, groupedTasks, howSteps } from './guide'
import Rich from './Rich'

// The staff guide (? button in the header): what the app does and where to
// find it. Content in guide.js. Everything is folded up (tap a line to open
// it); searching opens what matches.
const plain = (s) => String(s).replaceAll('**', '').toLowerCase()
const summary = 'flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 py-2 text-base font-semibold text-slate-100 [&::-webkit-details-marker]:hidden'
const chevron = 'ml-auto shrink-0 text-glow-400 transition group-open:rotate-90'

function Answer({ how }) {
  const steps = howSteps(how)
  if (!steps) return <p className="text-base leading-relaxed text-slate-300"><Rich text={how} /></p>
  return (
    <ol className="list-decimal space-y-1.5 pl-6 text-base leading-relaxed text-slate-300 marker:font-semibold marker:text-glow-400">
      {steps.map((s, i) => <li key={i}><Rich text={s} /></li>)}
    </ol>
  )
}

export default function GuidePanel({ onClose, onTour }) {
  const [q, setQ] = useState('')
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const searching = words.length > 0
  const hit = (text) => words.every((w) => plain(text).includes(w))
  const groups = groupedTasks().map(([name, tasks]) => [name, tasks.filter(([title, how]) => hit(`${title} ${how}`))]).filter(([, tasks]) => tasks.length)
  // A section shows whole when its title/summary matches, else only matching lines.
  const sections = SECTIONS.map((s) => {
    if (!searching || hit(`${s.title} ${s.summary}`)) return s
    const items = s.items.filter(hit)
    return items.length ? { ...s, items } : null
  }).filter(Boolean)
  const go = (tab) => { onClose(); window.location.assign(`#${tab}`) }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-night-950/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Staff guide">
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-16">
        <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-night-950/95 px-4 pb-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold">Staff guide</h2>
            <div className="flex gap-2">
              {onTour && <button type="button" onClick={onTour} className="min-h-11 rounded-full border border-glow-400/40 px-4 text-sm font-semibold text-glow-300">🧭 Take the tour</button>}
              <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold">Done</button>
            </div>
          </div>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: payment, route, gate code, review…" aria-label="Search the guide"
            className="min-h-11 w-full rounded-full border border-white/20 bg-night-900 px-5 text-base focus:border-glow-400 focus:outline-none" />
          {!searching && <p className="text-sm text-slate-400">Tap a line to open it.</p>}
        </div>

        {groups.length > 0 && (
          <section className="space-y-3 rounded-3xl border border-glow-400/30 bg-night-900 p-4">
            <h3 className="font-display text-xl font-extrabold text-glow-300">How do I…</h3>
            {groups.map(([name, tasks]) => (
              <div key={name}>
                <h4 className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{name}</h4>
                <ul className="divide-y divide-white/5">
                  {tasks.map(([title, how]) => (
                    <li key={title}>
                      <details className="group" open={searching || undefined}>
                        <summary className={summary}>{title}<span className={chevron} aria-hidden="true">›</span></summary>
                        <div className="px-1 pb-3"><Answer how={how} /></div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <h3 className="px-1 pt-2 font-display text-xl font-extrabold">Tab by tab</h3>
        {sections.map((s) => (
          <details key={s.id} className="group rounded-3xl border border-white/10 bg-night-900 px-4 py-2" open={searching || undefined}>
            <summary className={summary}>
              <span aria-hidden="true">{s.icon}</span> {s.title}
              <span className={chevron} aria-hidden="true">›</span>
            </summary>
            <div className="space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base text-slate-300">{s.summary}</p>
                {s.tab && <button type="button" onClick={() => go(s.tab)} className="min-h-11 shrink-0 rounded-full bg-white/10 px-4 text-sm font-semibold">Open →</button>}
              </div>
              <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-300 marker:text-glow-400">
                {s.items.map((item) => <li key={item}><Rich text={item} /></li>)}
              </ul>
            </div>
          </details>
        ))}

        {!groups.length && !sections.length && <p className="py-10 text-center text-slate-400">Nothing about “{q}”. Try another word, or ask Scott.</p>}
        <p className="text-center text-xs text-slate-500">Guide updated {GUIDE_UPDATED}</p>
      </div>
    </div>
  )
}
