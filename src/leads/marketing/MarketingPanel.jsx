import { PHASES, WEEKS, WHO } from '../../data/marketingPlan'
import { todayISO } from '../../lib/customers'
import { isDone, missed, phaseFor, progress, weekIndexFor, weekLabel } from '../../lib/marketing'
import { label, panel } from '../HomePanels'

const tone = { glow: 'text-glow-300', pine: 'text-pine-300', slate: 'text-slate-400' }

// Home: where the season's marketing stands this week (the Marketing tab has the rest).
export default function MarketingPanel({ settings, wall }) {
  const today = todayISO()
  const week = WEEKS[weekIndexFor(WEEKS, today)]
  const phase = phaseFor(PHASES, today)
  const done = settings?.marketing?.done ?? {}
  const p = progress(week.tasks, done)
  const open = week.tasks.filter((t) => !isDone(done, t.id))
  const late = missed(WEEKS, done, today).length
  return (
    <section className={panel} aria-label="Marketing this week">
      <div className="flex items-baseline justify-between gap-2">
        <p className={label}>Marketing · {weekLabel(week)}</p>
        <a href="#marketing" className="min-h-11 content-center text-sm text-glow-300 underline">Open</a>
      </div>
      {phase && <p className={`mt-1 ${wall ? 'text-lg' : 'text-sm'} text-slate-200`}>{phase.name}: {phase.message}</p>}
      <p className={`mt-2 font-semibold tabular-nums ${wall ? 'text-3xl' : 'text-xl'}`}>{p.done} of {p.total} done{late ? <span className="ml-2 text-sm font-normal text-glow-300">· {late} from earlier weeks</span> : null}</p>
      {open.length > 0
        ? (
          <ul className="mt-2 space-y-1 text-sm">
            {open.slice(0, 4).map((t) => (
              <li key={t.id} className="flex gap-2"><span className={`shrink-0 font-semibold ${tone[WHO[t.who]?.tone ?? 'slate']}`}>{WHO[t.who]?.label}</span><span className="min-w-0">{t.text}</span></li>
            ))}
            {open.length > 4 && <li className="text-slate-400">and {open.length - 4} more</li>}
          </ul>
        )
        : <p className="mt-2 text-sm text-pine-300">Everything for this week is done.</p>}
    </section>
  )
}
