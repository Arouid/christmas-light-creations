import { useEffect, useRef, useState } from 'react'
import { TOUR } from './guide'
import Rich from './Rich'
import { markTourDone } from './tourState'

// First-login tour: a few cards on what staff use most. Shown once per
// phone/computer (tourState.js), and any time from the guide's "Take the tour".

export default function Tour({ onClose }) {
  const [i, setI] = useState(0)
  const card = useRef(null)
  const step = TOUR[i]
  const last = i === TOUR.length - 1
  const finish = () => { markTourDone(); onClose() }
  const go = (tab) => { finish(); window.location.assign(`#${tab}`) }

  useEffect(() => { card.current?.focus() }, [i])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish(); if (e.key === 'ArrowRight' && !last) setI(i + 1); if (e.key === 'ArrowLeft' && i) setI(i - 1) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night-950/90 p-4 backdrop-blur sm:items-center" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div ref={card} tabIndex={-1} className="w-full max-w-md space-y-4 rounded-3xl border border-glow-400/30 bg-night-900 p-6 outline-none">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-300/80">{i + 1} of {TOUR.length}</p>
          <button type="button" onClick={finish} className="min-h-11 rounded-full px-3 text-sm text-slate-400 hover:text-slate-100">Skip</button>
        </div>
        <div className="space-y-2">
          <p className="text-4xl" aria-hidden="true">{step.icon}</p>
          <h2 className="font-display text-2xl font-extrabold">{step.title}</h2>
          {step.body.map((line) => <p key={line} className="text-base leading-relaxed text-slate-300"><Rich text={line} /></p>)}
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {TOUR.map((s, n) => <span key={s.title} className={`h-1.5 rounded-full ${n === i ? 'w-6 bg-glow-400' : 'w-1.5 bg-white/20'}`} />)}
        </div>
        <div className="flex gap-2">
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="min-h-11 rounded-full border border-white/20 px-5 font-semibold">Back</button>}
          {step.tab && !last && <button type="button" onClick={() => go(step.tab)} className="min-h-11 rounded-full border border-white/20 px-5 font-semibold">Open it</button>}
          {last
            ? <button type="button" onClick={() => go(step.tab ?? 'home')} className="min-h-11 flex-1 rounded-full bg-glow-400 px-5 font-semibold text-night-950">Start on Home</button>
            : <button type="button" onClick={() => setI(i + 1)} className="min-h-11 flex-1 rounded-full bg-glow-400 px-5 font-semibold text-night-950">Next</button>}
        </div>
      </div>
    </div>
  )
}
