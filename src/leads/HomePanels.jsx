import { agoText, describe, staffName, toMs } from '../lib/activity'
import { reasonText } from '../lib/signInLog'
import { money } from '../lib/invoices'
import { STOP_KINDS, clock, timeline } from '../lib/router'
import { asOfText, spendText } from '../lib/spend'
import { StopTextButtons, StopTextDialog } from './InstallTexts'
import { useStopTexts } from './stopTexts'
import { useStaff } from './staffContext'
import { saveRecord } from './staffStore'

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

// One of today's stops on Home: 🚗 On our way / 💬 All done texts and ✓ Done,
// so a phone on Home is the crew's console (docs/specs/install-texts.md).
function TodayStop({ route, s, n, customer, onStop }) {
  const texts = useStopTexts({ stop: s, route, customer, onStop })
  const done = s.status === 'done'
  const skipped = s.status === 'skipped'
  const markDone = () => {
    onStop({ status: 'done', doneAt: new Date().toISOString() })
    if (texts.done.allowed) texts.done.open()
  }
  // Name on its own line, taps underneath: a phone keeps the whole name
  // readable. The faded look goes on the rows, not the <li>: the Voice box
  // renders inside it and must stay solid.
  const faded = done || skipped ? 'opacity-70' : ''
  return (
    <li className="py-1.5">
      <div className={`flex items-center gap-2 ${faded}`}>
        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-night-950' : skipped ? 'bg-white/20' : 'bg-glow-400 text-night-950'}`} aria-hidden="true">
          {done ? '✓' : skipped ? '↷' : n}
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block truncate font-medium">{s.name}</span>
          <span className="block truncate text-xs text-slate-400">
            {STOP_KINDS[s.kind] ?? s.kind}{s.eta != null && !skipped && !done ? ` · ≈ ${clock(s.eta)}` : ''}{skipped && s.skipReason ? ` · ${s.skipReason}` : ''}
          </span>
        </span>
      </div>
      {!skipped && (
        <div className={`mt-1 flex flex-wrap items-center gap-1.5 pl-8 ${faded}`}>
          <StopTextButtons texts={texts} stop={s} className="flex flex-wrap gap-1.5" />
          {!done && (
            <button type="button" onClick={markDone} className="inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-3 text-sm font-semibold text-night-950 hover:bg-emerald-400">✓ Done</button>
          )}
        </div>
      )}
      <StopTextDialog dialog={texts.dialog} />
    </li>
  )
}

// today: routesToday() (counts); list: today's route records; customers: for the texts.
export function RoutesPanel({ today, list = [], customers = [], wall }) {
  const { user } = useStaff()
  const day = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const byId = new Map(customers.map((c) => [c.id, c]))
  const save = (route, stops) => saveRecord(user, 'routes', route.id, { stops }).catch((e) => console.warn('Stop not saved', e.code ?? e.message))
  return (
    <section className={panel} aria-label="Today's routes">
      <h2 className={label}>Today’s routes</h2>
      {!today.routes.length && (
        <p className={`mt-3 text-slate-400 ${wall ? 'text-lg' : 'text-sm'}`}>No routes today.{today.next ? ` Next: ${day(today.next)}.` : ''}</p>
      )}
      <ul className="mt-3 space-y-3">
        {today.routes.map((r) => {
          const left = r.total - r.done - r.skipped
          const route = list.find((x) => x.id === r.id)
          const rows = route && !wall ? timeline(route.stops ?? [], route.startTime, route.backMin).rows : []
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
              {rows.length > 0 && (
                <ol className="mt-1 divide-y divide-white/5" aria-label={`${r.name} stops`}>
                  {rows.map((s, i) => (
                    <TodayStop key={s.id} route={route} s={s} n={i + 1} customer={s.customerId ? byId.get(s.customerId) : undefined}
                      onStop={(patch) => save(route, route.stops.map((x) => (x.id === s.id ? { ...x, ...patch } : x)))} />
                  ))}
                </ol>
              )}
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

// Spent this month (docs/specs/spend.md): what the services behind the app
// cost so far this month. summary: spentSummary(); error: usage doc refused.
// Google Cloud and Google Ads come from BigQuery (functions/googleBilling.js),
// a day behind; `pending` until connected. Each keeps a small link to Google's page.
const HOW = { exact: 'exact', pending: '' }
const LINKS = { google: { href: 'https://console.cloud.google.com/billing?project=clc-leads-site', text: 'see billing ↗' }, ads: { href: 'https://ads.google.com/', text: 'see ads ↗' } }
export function SpendPanel({ summary, month, error, loading, wall }) {
  const title = new Date(`${month}-15T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return (
    <section className={panel} aria-label="Spent this month">
      <h2 className={label}>Spent this month · {title}</h2>
      {error && <p className="mt-3 text-sm text-glow-300">Needs the database rules published again (firestore.rules) before Claude and PayPal costs can show.</p>}
      <p className="mt-1 flex items-baseline justify-between gap-2">
        <span className={`font-semibold tabular-nums text-glow-300 ${wall ? 'text-5xl' : 'text-3xl'}`}>{loading && !error ? '…' : spendText(summary.totalCents)}</span>
        <span className="text-right text-xs text-slate-400">Claude + PayPal fees + Google Cloud + Ads{summary.partial && <><br />{summary.missing.join(' and ')} not in yet</>}</span>
      </p>
      <ul className={`mt-3 space-y-2 ${wall ? 'text-lg' : 'text-sm'}`}>
        {summary.rows.map((r) => (
          <li key={r.key} className="min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-medium">
                {r.name}
                {LINKS[r.key] && (
                  <a href={LINKS[r.key].href} target="_blank" rel="noreferrer" className="-my-3 ml-2 inline-flex min-h-11 items-center align-middle text-xs font-normal text-glow-300 underline">{LINKS[r.key].text}</a>
                )}
              </span>
              <span className="tabular-nums text-slate-50">{r.how === 'pending' ? '' : spendText(r.cents)}</span>
            </span>
            <span className="block truncate text-xs text-slate-400">{r.note}{HOW[r.how] ? ` · ${HOW[r.how]}` : ''}</span>
            {r.parts?.length > 0 && (
              <span className="block truncate text-xs text-slate-500">{r.parts.map((p) => `${p.name} ${spendText(p.cents)}${p.calls ? ` (${p.calls})` : ''}`).join(' · ')}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Google Ads this month (docs/specs/ads-stats.md): spend, clicks, cost per
// click, estimate requests (Google's conversions) and cost per request, then
// the top campaigns and what people searched, from the BigQuery Ads transfer
// (functions/googleBilling.js, a day behind). ads: adsSummary(), null until
// the owner connects the transfer; error: usage doc refused.
const ADS_LINK = 'https://ads.google.com/'
const count = (n) => Number(n || 0).toLocaleString('en-US')
export function AdsPanel({ ads, month, error, loading, wall }) {
  const title = new Date(`${month}-15T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const asOf = ads ? (ads.lastDay ? asOfText(`${ads.lastDay}T12:00:00-06:00`) : asOfText(ads.asOf)) : ''
  const big = `font-semibold tabular-nums text-glow-300 ${wall ? 'text-4xl' : 'text-2xl'}`
  const small = wall ? 'text-lg' : 'text-sm'
  const stat = (value, name) => (
    <div className="min-w-0">
      <div className={big}>{loading && !error ? '…' : value}</div>
      <div className="text-xs text-slate-400">{name}</div>
    </div>
  )
  return (
    <section className={panel} aria-label="Google Ads">
      <h2 className={`${label} flex items-baseline justify-between gap-2`}>
        <span>Google Ads · {title}</span>
        <a href={ADS_LINK} target="_blank" rel="noreferrer" className="-my-3 inline-flex min-h-11 items-center text-xs font-normal normal-case tracking-normal text-glow-300 underline">see ads ↗</a>
      </h2>
      {error && <p className="mt-3 text-sm text-glow-300">Needs the database rules published again (firestore.rules) before ad numbers can show.</p>}
      {!ads && !error && !loading && (
        <p className="mt-3 text-sm text-slate-400">Not connected yet · BigQuery → Data transfers → Google Ads</p>
      )}
      {(ads || loading) && !error && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
            {stat(spendText(ads?.cents ?? 0), 'spent')}
            {stat(count(ads?.clicks), ads?.clicks === 1 ? 'click' : 'clicks')}
            {stat(ads?.cpcCents != null ? spendText(ads.cpcCents) : '—', 'per click')}
            {ads?.conversions > 0
              ? stat(count(ads.conversions), ads.conversions === 1 ? 'request' : 'requests')
              : stat(count(ads?.impressions), 'times shown')}
          </div>
          {ads && (
            <p className={`mt-2 text-xs text-slate-400`}>
              {ads.conversions > 0
                ? `${spendText(ads.perRequestCents)} per estimate request · ${count(ads.impressions)} times shown`
                : 'no estimate requests counted yet'}
              {asOf ? ` · as of ${asOf}` : ''}
            </p>
          )}
          {ads?.campaigns.length > 0 && (
            <ul className={`mt-3 space-y-1 ${small}`} aria-label="Top campaigns">
              {ads.campaigns.map((c) => (
                <li key={c.name} className="flex items-baseline justify-between gap-2 text-slate-300">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-slate-400">{spendText(c.cents)} · {count(c.clicks)} click{c.clicks === 1 ? '' : 's'}{c.conversions > 0 ? ` · ${count(c.conversions)} req` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          {ads?.terms.length > 0 && (
            <>
              <p className="mt-3 text-xs text-slate-500">People searched</p>
              <ul className={`mt-1 space-y-1 ${small}`} aria-label="Top search terms">
                {ads.terms.map((t) => (
                  <li key={t.term} className="flex items-baseline justify-between gap-2 text-slate-400">
                    <span className="truncate">“{t.term}”</span>
                    <span className="shrink-0 tabular-nums text-xs text-slate-500">{count(t.clicks)} · {spendText(t.cents)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}
