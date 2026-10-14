import { useEffect, useRef, useState } from 'react'
import { ACCOUNT_TOUR_UI as UI } from '../data/accountTour'
import Rich from '../leads/Rich'

// The customer's tour of their account (docs/specs/account-tour.md): one card
// at a time at the bottom of the screen; the part of the page it talks about
// scrolls into view above it, lit up (data-tour-spot, src/index.css) with the
// rest dimmed. Not modal: the page stays usable. Escape, ✕ or Done close it.
// steps: from accountTourSteps (src/data/accountTour.js). name: for the welcome line.
export default function AccountTour({ steps, name = '', onClose }) {
  const [at, setAt] = useState(0)
  const card = useRef(null)
  const i = Math.min(at, steps.length - 1) // the list can shrink when the account reloads
  const step = steps[i]
  const last = i === steps.length - 1
  const first = String(name).trim().split(' ')[0]
  const next = () => setAt(i + 1)
  const back = () => setAt(i - 1)

  useEffect(() => { card.current?.focus({ preventScroll: true }) }, [i])
  // Light up the part of the page this card is about, and bring it into view.
  useEffect(() => {
    const el = step?.anchor && document.getElementById(step.anchor)
    if (!el) return
    el.setAttribute('data-tour-spot', '')
    // Just above the section (not its scroll margin), so the card covers less of it.
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 16) })
    return () => el.removeAttribute('data-tour-spot')
  }, [step?.anchor])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && !last) next()
      else if (e.key === 'ArrowLeft' && i > 0) back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!step) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96 sm:p-0 print:hidden" role="dialog" aria-label={UI.label}>
      <div ref={card} tabIndex={-1} className="space-y-2.5 rounded-3xl border border-glow-400/40 bg-night-900 p-4 shadow-2xl outline-none sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-glow-300">{i === 0 ? UI.welcome(first) : UI.count(i + 1, steps.length)}</p>
          <button type="button" onClick={onClose} aria-label={UI.close} className="-my-1 -mr-2 size-11 shrink-0 rounded-full text-slate-300 hover:bg-white/10">✕</button>
        </div>
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <span aria-hidden="true" className="text-2xl">{step.icon}</span>{step.title}
        </h2>
        {step.body.map((line) => <p key={line} className="text-sm leading-relaxed text-slate-300 sm:text-base"><Rich text={line} /></p>)}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {steps.map((s, n) => <span key={s.id} className={`h-1.5 rounded-full ${n === i ? 'w-6 bg-glow-400' : 'w-1.5 bg-white/20'}`} />)}
        </div>
        <div className="flex gap-2">
          {i > 0 && <button type="button" onClick={back} className="min-h-11 rounded-full border border-white/20 px-5 font-semibold">{UI.back}</button>}
          <button type="button" onClick={last ? onClose : next} className="min-h-11 flex-1 rounded-full bg-glow-400 px-5 font-semibold text-night-950">{last ? UI.done : UI.next}</button>
        </div>
      </div>
    </div>
  )
}
