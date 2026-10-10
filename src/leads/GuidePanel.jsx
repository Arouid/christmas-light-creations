import { useState } from 'react'
import { GUIDE_UPDATED, SECTIONS, TASKS } from './guide'

// The staff guide (? button in the header): what the app does and where to
// find it. Content in guide.js. Search filters tasks and sections as you type.

// "**bold**" in guide text → <strong>.
function Rich({ text }) {
  return String(text).split('**').map((part, i) => (i % 2 ? <strong key={i} className="text-slate-100">{part}</strong> : part))
}
const plain = (s) => String(s).replaceAll('**', '').toLowerCase()

export default function GuidePanel({ onClose }) {
  const [q, setQ] = useState('')
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const hit = (text) => words.every((w) => plain(text).includes(w))
  const tasks = TASKS.filter(([title, how]) => hit(`${title} ${how}`))
  // A section shows whole when its title/summary matches, else only matching lines.
  const sections = SECTIONS.map((s) => {
    if (!words.length || hit(`${s.title} ${s.summary}`)) return s
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
            <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold">Done</button>
          </div>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: payment, route, gate code, review…" aria-label="Search the guide"
            className="min-h-11 w-full rounded-full border border-white/20 bg-night-900 px-5 text-base focus:border-glow-400 focus:outline-none" />
        </div>

        {tasks.length > 0 && (
          <section className="space-y-2 rounded-3xl border border-glow-400/30 bg-night-900 p-4">
            <h3 className="font-display text-lg font-extrabold text-glow-300">How do I…</h3>
            <ul className="divide-y divide-white/5">
              {tasks.map(([title, how]) => (
                <li key={title} className="py-2.5 text-sm">
                  <p className="font-semibold text-slate-100">{title}</p>
                  <p className="text-slate-300"><Rich text={how} /></p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sections.map((s) => (
          <section key={s.id} className="space-y-2 rounded-3xl border border-white/10 bg-night-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-extrabold"><span aria-hidden="true">{s.icon}</span> {s.title}</h3>
              {s.tab && <button type="button" onClick={() => go(s.tab)} className="min-h-11 shrink-0 rounded-full bg-white/10 px-4 text-sm font-semibold">Open →</button>}
            </div>
            <p className="text-sm text-slate-400">{s.summary}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
              {s.items.map((item) => <li key={item}><Rich text={item} /></li>)}
            </ul>
          </section>
        ))}

        {!tasks.length && !sections.length && <p className="py-10 text-center text-slate-400">Nothing about “{q}”. Try another word, or ask Scott.</p>}
        <p className="text-center text-xs text-slate-500">Guide updated {GUIDE_UPDATED}</p>
      </div>
    </div>
  )
}
