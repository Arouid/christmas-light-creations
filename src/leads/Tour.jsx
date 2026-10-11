import { useEffect, useRef, useState } from 'react'
import { TOUR } from './guide'
import Rich from './Rich'
import { markTourDone } from './tourState'

// First-login tour: a few cards on what staff use most. Shown once per
// phone/computer (tourState.js), and any time from the guide's "Take the tour".

// name: the signed-in person's name ("Katie P.") for the welcome card.
export default function Tour({ onClose, name = '' }) {
  const [i, setI] = useState(0)
  const [peek, setPeek] = useState(false) // "Open it": the tab shows, the tour waits in a bar at the bottom
  const card = useRef(null)
  const step = TOUR[i]
  const first = String(name).trim().split(' ')[0]
  const title = i === 0 && first ? `Welcome, ${first}!` : step.title
  const last = i === TOUR.length - 1
  const finish = () => { markTourDone(); onClose() }
  const go = (tab) => { finish(); window.location.assign(`#${tab}`) }
  const open = (tab) => { setPeek(true); window.location.assign(`#${tab}`) }
  const next = () => { setPeek(false); setI(i + 1) }
  const back = () => { setPeek(false); setI(i - 1) }

  useEffect(() => { if (!peek) card.current?.focus() }, [i, peek])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish(); if (e.key === 'ArrowRight' && !last) next(); if (e.key === 'ArrowLeft' && i) back() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (peek) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 p-3" role="region" aria-label="Welcome tour">
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-full border border-glow-400/40 bg-night-900 py-1.5 pl-4 pr-1.5 shadow-lg">
          <p className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold text-glow-300">Tour {i + 1}/{TOUR.length}:</span> {step.title}</p>
          {i > 0 && <button type="button" onClick={back} className="min-h-11 rounded-full px-3 text-sm font-semibold">Back</button>}
          <button type="button" onClick={last ? finish : next} className="min-h-11 rounded-full bg-glow-400 px-4 text-sm font-semibold text-night-950">{last ? 'Done' : 'Next'}</button>
          <button type="button" onClick={finish} aria-label="End the tour" className="min-h-11 rounded-full px-3 text-sm text-slate-400">✕</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night-950/90 p-4 backdrop-blur sm:items-center" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div ref={card} tabIndex={-1} className="w-full max-w-md space-y-4 rounded-3xl border border-glow-400/30 bg-night-900 p-6 outline-none">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-glow-300/80">{i + 1} of {TOUR.length}</p>
          <button type="button" onClick={finish} className="min-h-11 rounded-full px-3 text-sm text-slate-400 hover:text-slate-100">Skip</button>
        </div>
        <div className="space-y-2">
          <p className="text-4xl" aria-hidden="true">{step.icon}</p>
          <h2 className="font-display text-2xl font-extrabold">{title}</h2>
          {i === 0 && first && <p className="text-sm font-semibold uppercase tracking-[0.2em] text-glow-300/80">{step.title}</p>}
          {step.body.map((line) => <p key={line} className="text-base leading-relaxed text-slate-300"><Rich text={line} /></p>)}
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {TOUR.map((s, n) => <span key={s.title} className={`h-1.5 rounded-full ${n === i ? 'w-6 bg-glow-400' : 'w-1.5 bg-white/20'}`} />)}
        </div>
        <div className="flex gap-2">
          {i > 0 && <button type="button" onClick={back} className="min-h-11 rounded-full border border-white/20 px-5 font-semibold">Back</button>}
          {step.tab && !last && <button type="button" onClick={() => open(step.tab)} className="min-h-11 rounded-full border border-white/20 px-5 font-semibold">Open it</button>}
          {last
            ? <button type="button" onClick={() => go(step.tab ?? 'home')} className="min-h-11 flex-1 rounded-full bg-glow-400 px-5 font-semibold text-night-950">Start on Home</button>
            : <button type="button" onClick={next} className="min-h-11 flex-1 rounded-full bg-glow-400 px-5 font-semibold text-night-950">Next</button>}
        </div>
      </div>
    </div>
  )
}
