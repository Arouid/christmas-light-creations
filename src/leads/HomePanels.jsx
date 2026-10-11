import { agoText, describe, staffName, toMs } from '../lib/activity'
import { reasonText } from '../lib/signInLog'
import { money } from '../lib/invoices'

// Mission-control panels for the Home tab (docs/specs/dashboard.md). Layout
// only; the numbers come from src/lib/activity.js.
export const label = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-glow-300/80'
export const panel = 'rounded-2xl border border-glow-400/15 bg-night-900/70 p-4 shadow-[inset_0_1px_0_rgba(255,224,138,0.06)]'
const go = (link) => link && window.location.assign(link)

const LIGHT = {
  green: 'bg-pine-500 shadow-[0_0_10px_2px] shadow-pine-500/70',
  amber: 'bg-glow-400 shadow-[0_0_10px_2px] shadow-glow-400/60',
  red: 'bg-berry-500 shadow-[0_0_10px_2px] shadow-berry-500/70 animate-pulse',
  off: 'bg-slate-600',
}
export function Light({ color }) {
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${LIGHT[color] ?? LIGHT.off}`} aria-hidden="true" />
}

// lights: [{ name, color, note }]
export function StatusPanel({ lights, wall }) {
  return (
    <section className={panel} aria-label="System status">
      <h2 className={label}>System status</h2>
      <ul className={`mt-3 grid gap-x-4 gap-y-2 ${wall ? 'grid-cols-1 text-lg' : 'grid-cols-1 text-sm sm:grid-cols-2 lg:grid-cols-1'}`}>
        {lights.map((l) => (
          <li key={l.name} className="flex min-w-0 items-center gap-2">
            <Light color={l.color} />
            <span className="font-medium">{l.name}</span>
            <span className="truncate text-slate-400">{l.note}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// tiles: [{ key, title, value, note, link | onClick, alert }]
export function Counters({ tiles, wall }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Live counters">
      {tiles.map((t) => (
        <button key={t.key} type="button" onClick={t.onClick ?? (() => go(t.link))}
          className={`${panel} min-h-11 text-left transition hover:border-glow-400/40 ${t.alert ? 'border-berry-500/50' : ''}`}>
          <span className={label}>{t.title}</span>
          <span className={`mt-1 block font-semibold tabular-nums ${wall ? 'text-6xl' : 'text-3xl'} ${t.alert ? 'text-berry-500' : 'text-slate-50'}`}>{t.value}</span>
          {t.note && <span className={`block text-slate-400 ${wall ? 'text-base' : 'text-xs'}`}>{t.note}</span>}
        </button>
      ))}
    </section>
  )
}

function Bar({ parts, total }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5" role="img"
      aria-label={parts.map((p) => `${p.label} ${p.n}`).join(', ')}>
      {total > 0 && parts.map((p) => p.n > 0 && <span key={p.label} className={p.color} style={{ width: `${(p.n / total) * 100}%` }} />)}
    </div>
  )
}
function Legend({ parts }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
      {parts.map((p) => <li key={p.label} className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${p.color}`} />{p.label} <span className="tabular-nums text-slate-50">{p.n}</span></li>)}
    </ul>
  )
}

export function RoutesPanel({ today, wall }) {
  const day = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <section className={panel} aria-label="Today's routes">
      <h2 className={label}>Today’s routes</h2>
      {!today.routes.length && (
        <p className={`mt-3 text-slate-400 ${wall ? 'text-lg' : 'text-sm'}`}>No routes today.{today.next ? ` Next: ${day(today.next)}.` : ''}</p>
      )}
      <ul className="mt-3 space-y-3">
        {today.routes.map((r) => {
          const left = r.total - r.done - r.skipped
          return (
            <li key={r.id}>
              <button type="button" onClick={() => go(`#route-${r.id}`)} className="min-h-11 w-full text-left">
                <span className={`flex items-baseline justify-between gap-2 ${wall ? 'text-xl' : 'text-sm'}`}>
                  <span className="truncate font-semibold">{r.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-300">{r.done}/{r.total} done{r.skipped ? ` · ${r.skipped} skipped` : ''}{left > 0 ? ` · ${left} left` : ''}</span>
                </span>
                <span className="mt-1.5 block">
                  <Bar total={r.total} parts={[{ label: 'Done', n: r.done, color: 'bg-pine-500' }, { label: 'Skipped', n: r.skipped, color: 'bg-berry-500' }]} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function SeasonPanel({ season, progress, money: m, wall }) {
  const i = progress.install
  const t = progress.takedown
  const installs = [
    { label: 'Not confirmed', n: i.notConfirmed, color: 'bg-slate-500' },
    { label: 'Confirmed', n: i.confirmed, color: 'bg-glow-500/60' },
    { label: 'Scheduled', n: i.scheduled, color: 'bg-glow-400' },
    { label: 'Installed', n: i.installed, color: 'bg-pine-500' },
  ]
  const takedowns = [
    { label: 'Waiting', n: t.waiting, color: 'bg-slate-500' },
    { label: 'Scheduled', n: t.scheduled, color: 'bg-glow-400' },
    { label: 'Taken down', n: t.done, color: 'bg-pine-500' },
  ]
  const tdTotal = t.waiting + t.scheduled + t.done
  const best = Math.max(m.now, m.last, 1)
  return (
    <section className={panel} aria-label={`Season ${season}`}>
      <h2 className={label}>Season {season}</h2>
      {!progress.total && <p className="mt-3 text-sm text-slate-400">No customers on file for {season} yet.</p>}
      {progress.total > 0 && (
        <div className={`mt-3 space-y-4 ${wall ? 'text-lg' : ''}`}>
          <div>
            <p className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">Installs</span><span className="tabular-nums text-slate-300">{i.installed}/{progress.total} up</span></p>
            <Bar parts={installs} total={progress.total} />
            <Legend parts={installs} />
          </div>
          {tdTotal > 0 && (
            <div>
              <p className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">Takedowns</span><span className="tabular-nums text-slate-300">{t.done}/{tdTotal} down</span></p>
              <Bar parts={takedowns} total={tdTotal} />
              <Legend parts={takedowns} />
            </div>
          )}
        </div>
      )}
      <div className="mt-4 space-y-1.5">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-slate-300">Collected this season</span>
          <span className={`font-semibold tabular-nums text-glow-300 ${wall ? 'text-4xl' : 'text-2xl'}`}>{money(Math.round(m.now * 100))}</span>
        </p>
        <span className="block h-1.5 rounded-full bg-white/5"><span className="block h-full rounded-full bg-glow-400" style={{ width: `${(m.now / best) * 100}%` }} /></span>
        <p className="flex justify-between text-xs text-slate-400">
          <span>Last season ({season - 1}): {money(Math.round(m.last * 100))}</span>
          <span>season billing marked paid</span>
        </p>
        <span className="block h-1.5 rounded-full bg-white/5"><span className="block h-full rounded-full bg-slate-500" style={{ width: `${(m.last / best) * 100}%` }} /></span>
      </div>
    </section>
  )
}

const HUES = ['bg-glow-400 text-night-950', 'bg-pine-500 text-white', 'bg-sky-500 text-night-950', 'bg-berry-500 text-white', 'bg-violet-400 text-night-950']
const hue = (s) => HUES[[...String(s).toLowerCase()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % HUES.length]

// entries: newest first. ctx: { names, messages } for describe().
export function ActivityPanel({ entries, error, loading, ctx, now, wall, limit = 40 }) {
  const shown = entries.slice(0, wall ? 12 : limit)
  return (
    <section className={`${panel} flex min-h-0 flex-col`} aria-label="Recent activity">
      <h2 className={label}>Recent activity</h2>
      {error && <p className="mt-3 text-sm text-glow-300">Recent activity needs the database rules published again (firestore.rules). Everything else works.</p>}
      {!error && !loading && !entries.length && <p className="mt-3 text-sm text-slate-400">Nothing yet. Emails, invoices, status changes, texts and calls started from the app show here for everyone.</p>}
      <ul className={`mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto ${wall ? '' : 'lg:max-h-[34rem]'}`}>
        {shown.map((e) => {
          const d = describe(e, ctx)
          const who = e.by === 'website' ? 'W' : staffName(e.by, ctx.names)[0]
          return (
            <li key={e.id}>
              <button type="button" onClick={() => go(d.link)} disabled={!d.link}
                className="flex min-h-11 w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/5 disabled:hover:bg-transparent">
                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${e.by === 'website' ? 'bg-white/15 text-white' : hue(e.by)}`} aria-hidden="true">{who}</span>
                <span className={`min-w-0 flex-1 ${wall ? 'text-lg' : 'text-sm'}`}>
                  <span className="font-semibold">{d.actor}</span> <span className="text-slate-300">{d.did}</span>{d.name && <> <span className="font-semibold">{d.name}</span></>}
                  {d.detail && <span className="block truncate text-slate-400">{d.detail}</span>}
                </span>
                <span className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-500">{agoText(toMs(e.at), now)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const DOT = { on: 'bg-emerald-400', away: 'bg-slate-500', never: 'bg-white/15' }

// Who's on: staff with the app open now, else when they were last on.
export function WhoPanel({ rows, error, now, wall }) {
  return (
    <section className={panel} aria-label="Who's on">
      <h2 className={label}>Who’s on</h2>
      {error && <p className="mt-3 text-sm text-glow-300">Needs the database rules published again (firestore.rules).</p>}
      {!error && (
        <ul className={`mt-3 space-y-1.5 ${wall ? 'text-lg' : 'text-sm'}`}>
          {rows.map((r) => (
            <li key={r.email} className="flex items-center gap-2.5">
              <span className={`size-2.5 shrink-0 rounded-full ${DOT[r.state]} ${r.state === 'on' ? 'shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-semibold">{r.name}{r.dupe && <span className="font-normal text-slate-500"> · {r.email}</span>}</span>
              <span className="shrink-0 text-right text-slate-400">
                {r.state === 'on' ? <span className="text-emerald-300">on now</span> : r.state === 'away' ? agoText(r.last, now) : 'never'}
                {r.device && r.state !== 'never' && <span className="text-slate-500"> · {r.device}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Sign-ins: staff app sign-in attempts in the last days, newest first.
export function SignInsPanel({ entries, error, now, names, wall, limit = 12 }) {
  const shown = (entries ?? []).slice(0, wall ? 6 : limit)
  return (
    <section className={panel} aria-label="Sign-ins">
      <h2 className={label}>Sign-ins</h2>
      {error && <p className="mt-3 text-sm text-glow-300">Needs the database rules published again (firestore.rules).</p>}
      {!error && !shown.length && <p className="mt-3 text-sm text-slate-400">No sign-ins logged yet.</p>}
      <ul className={`mt-3 space-y-1.5 ${wall ? 'text-lg' : 'text-sm'}`}>
        {shown.map((e) => (
          <li key={e.id} className="flex items-center gap-2.5">
            <span className={`shrink-0 font-bold ${e.ok ? 'text-emerald-300' : 'text-berry-500'}`} aria-label={e.ok ? 'succeeded' : 'failed'}>{e.ok ? '✓' : '✗'}</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{e.email ? staffName(e.email, names) : 'Someone'}</span>
              <span className="text-slate-400"> {e.ok ? 'signed in' : `couldn’t sign in · ${reasonText(e.code)}`}{e.device ? ` · ${e.device}` : ''}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-slate-500">{agoText(toMs(e.at), now)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
