import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collected, counters, routesToday, seasonProgress, syncLight } from '../lib/activity'
import { money } from '../lib/invoices'
import { todayISO } from '../lib/customers'
import { alertRecipients } from '../../functions/leadEmail.js'
import { monthKey, spentSummary } from '../lib/spend'
import { ActivityPanel, Counters, Light, RoutesPanel, SeasonPanel, SignInsPanel, SpendPanel, StatusPanel, WhoPanel, label } from './HomePanels'
import { ScheduledPanel } from './ScheduledEmails'
import { usePresence, useSignIns } from './usePresence'
import { useOutgoingMail } from './useOutgoingMail'
import { DEFAULT_LAYOUT, LAYOUT_KEY, PANELS, nudge, placeBefore, readLayout } from '../lib/dashLayout'
import { permission, storedFid } from './push'
import { useLiveDoc, useLiveQuery } from './staffStore'

// Home: mission control (docs/specs/dashboard.md). Recent staff activity, live
// counters, today's routes, the season and system status lights, plus a wall
// screen (full screen, bigger type) for a TV in the shop.
const byOpenedAt = (a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0)

function useNow(ms) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

const clock = (now) => new Date(now).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', second: '2-digit' })
const dateLine = (now) => new Date(now).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' })
// "T−76 days to Christmas" (counting from today, Central time).
function countdown(now) {
  const today = new Date(new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  let xmas = new Date(`${today.getUTCFullYear()}-12-25`)
  if (xmas < today) xmas = new Date(`${today.getUTCFullYear() + 1}-12-25`)
  const days = Math.round((xmas - today) / 86400000)
  return days === 0 ? 'Christmas Day' : `T−${days} day${days === 1 ? '' : 's'} to Christmas`
}

export default function HomeView({ user, season, alerts, feed, customers, leads, invoices, calls, routes, settings, onOpenMessages }) {
  const [wall, setWall] = useState(false)
  const exitWall = useCallback(() => setWall(false), [])
  const now = useNow(1000)
  const minute = Math.floor(now / 60000) * 60000
  const who = usePresence(user, feed.names, minute)
  const signIns = useSignIns(user)
  const outgoing = useOutgoingMail(user, alerts.lastSync, minute, customers, leads)
  const incidents = useLiveQuery(user, 'incidents', 'open', true, byOpenedAt) ?? []
  const today = todayISO()
  const month = monthKey(minute)
  const usage = useLiveDoc(user, 'usage', month)
  const spent = useMemo(() => spentSummary(usage.data), [usage.data])

  const nums = useMemo(() => counters({ leads, invoices, calls, today }), [leads, invoices, calls, today])
  const progress = useMemo(() => seasonProgress(customers, season), [customers, season])
  const cash = useMemo(() => ({ now: collected(customers, season), last: collected(customers, String(Number(season) - 1)) }), [customers, season])
  const day = useMemo(() => routesToday(routes, today), [routes, today])

  const syncAgo = alerts.lastSync ? Math.round((now - alerts.lastSync) / 3600000) : null
  const payProblems = incidents.filter((x) => ['payment', 'paypal'].includes(x.kind)).length
  const pushOn = Boolean(storedFid()) && permission() === 'granted'
  const lights = [
    { name: 'Text & email sync', color: syncLight(alerts.lastSync, now), note: syncAgo == null ? 'nothing in 7 days' : syncAgo < 1 ? 'last one < 1 h ago' : syncAgo < 48 ? `last one ${syncAgo} h ago` : `last one ${Math.round(syncAgo / 24)} days ago` },
    { name: 'Outgoing email', color: outgoing.color, note: outgoing.note },
    { name: 'Website', color: incidents.length ? 'red' : 'green', note: incidents.length ? `${incidents.length} problem${incidents.length === 1 ? '' : 's'} to look at` : 'no problems' },
    { name: 'Payments', color: payProblems ? 'red' : 'green', note: payProblems ? 'see website problems' : 'OK' },
    { name: 'Request alerts', color: alertRecipients(settings).length ? 'green' : 'amber', note: alertRecipients(settings).length ? `${alertRecipients(settings).length} on the email list` : 'nobody on the list (⚙)' },
    { name: 'Activity log', color: feed.error ? 'amber' : 'green', note: feed.error ? 'rules not published' : 'recording' },
    { name: 'This device', color: pushOn ? 'green' : 'off', note: pushOn ? 'notifications on' : 'notifications off (💬)' },
  ]
  const tiles = [
    { key: 'msgs', title: alerts.openMode ? 'To answer' : 'New messages', value: alerts.count, note: alerts.openMode ? `nobody on them yet · ${alerts.list.length} in 7 days` : `${alerts.list.length} in 7 days`, onClick: onOpenMessages, alert: alerts.count > 0 },
    { key: 'req', title: 'New requests', value: nums.openRequests, note: 'website, status New', link: '#leads', alert: nums.openRequests > 0 },
    { key: 'inv', title: 'Unpaid', value: money(nums.unpaidCents), note: `${nums.unpaid} invoice${nums.unpaid === 1 ? '' : 's'}${nums.overdue ? ` · ${nums.overdue} overdue` : ''}`, link: '#invoices', alert: nums.overdue > 0 },
    { key: 'svc', title: 'Service calls', value: nums.openCalls, note: 'open or scheduled', link: '#service' },
  ]
  const ctx = { names: feed.names, messages: alerts.list }
  // Where each panel sits: the owner's drag-and-drop (2026-10-10), kept per device.
  const [layout, setLayout] = useState(() => { try { return readLayout(localStorage.getItem(LAYOUT_KEY)) } catch { return DEFAULT_LAYOUT } })
  const [arranging, setArranging] = useState(false)
  const apply = (next) => { setLayout(next); try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)) } catch { /* private mode: fine */ } }
  const drop = (key, col, beforeKey) => { if (key) apply(placeBefore(layout, key, col, beforeKey)) }

  const panels = {
    season: <SeasonPanel season={season} progress={progress} money={cash} wall={wall} />,
    activity: <ActivityPanel entries={feed.entries} error={feed.error} loading={feed.loading} ctx={ctx} now={now} wall={wall} />,
    who: <WhoPanel rows={who.rows} error={who.error} now={minute} wall={wall} />,
    scheduled: <ScheduledPanel user={user} names={feed.names} wall={wall} />,
    signins: <SignInsPanel entries={signIns.entries} error={signIns.error} now={minute} names={feed.names} wall={wall} />,
    routes: <RoutesPanel today={day} wall={wall} />,
    status: <StatusPanel lights={lights} wall={wall} />,
    spent: <SpendPanel summary={spent} month={month} error={usage.error} loading={usage.data === undefined} wall={wall} />,
  }
  const column = (col) => (
    <div className={`min-w-0 space-y-4 ${col === 'left' ? 'lg:col-span-7' : 'lg:col-span-5'}`}
      onDragOver={arranging ? (e) => e.preventDefault() : undefined}
      onDrop={arranging ? (e) => { e.preventDefault(); drop(e.dataTransfer.getData('text/plain'), col, null) } : undefined}>
      {layout[col].map((k, i) => (
        <Slot key={k} k={k} col={col} arranging={arranging} first={i === 0} last={i === layout[col].length - 1}
          onNudge={(dir) => apply(nudge(layout, k, dir))} onDrop={drop}>
          {panels[k]}
        </Slot>
      ))}
      {arranging && !layout[col].length && <p className="rounded-3xl border border-dashed border-white/20 p-6 text-center text-sm text-slate-400">Drop a panel here</p>}
    </div>
  )

  const board = (
    <div className={`space-y-4 ${wall ? 'p-6 lg:p-8' : ''}`}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={label}>CLC mission control</p>
          <p className={`font-semibold tabular-nums ${wall ? 'text-5xl' : 'text-2xl'}`}>{clock(now)} <span className="text-base font-normal text-slate-400">CT · {dateLine(now)}</span></p>
          <p className={`text-glow-300 ${wall ? 'text-xl' : 'text-sm'}`}>{countdown(now)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex"><Light color="green" /> live</span>
          {arranging && <button type="button" onClick={() => apply(DEFAULT_LAYOUT)} className="min-h-11 rounded-full px-3 text-sm text-slate-400 underline">Reset layout</button>}
          <button type="button" onClick={() => setArranging((v) => !v)} aria-pressed={arranging}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${arranging ? 'bg-glow-400 text-night-950' : 'border border-white/20'}`}>
            {arranging ? '✓ Done arranging' : '⠿ Arrange'}
          </button>
          <button type="button" onClick={() => setWall(!wall)} className="min-h-11 rounded-full border border-white/20 px-4 text-sm font-semibold">
            {wall ? '✕ Exit wall screen' : '⛶ Wall screen'}
          </button>
        </div>
      </header>
      <Counters tiles={tiles} wall={wall} />
      {arranging && <p className="text-sm text-glow-300">Drag a panel where you want it, or use its arrows. On a phone the panels run top to bottom: left column first, then right. Saved on this device.</p>}
      <div className="grid gap-4 lg:grid-cols-12">
        {column('left')}
        {column('right')}
      </div>
    </div>
  )

  return wall ? <WallScreen onExit={exitWall}>{board}</WallScreen> : board
}

// One panel while arranging: a handle bar with arrows, draggable (computers),
// and a drop target (drop = put the dragged panel before this one).
const PANEL_LABEL = Object.fromEntries(PANELS)
const arrow = 'size-9 rounded-full border border-white/20 text-sm font-semibold hover:bg-white/10 disabled:opacity-30'
function Slot({ k, col, arranging, first, last, onNudge, onDrop, children }) {
  if (!arranging) return children
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', k); e.dataTransfer.effectAllowed = 'move' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e.dataTransfer.getData('text/plain'), col, k) }}
      className="cursor-grab rounded-3xl ring-2 ring-glow-400/50 active:cursor-grabbing">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs text-glow-300">
        <span className="font-semibold">⠿ {PANEL_LABEL[k]}</span>
        <span className="flex gap-1">
          <button type="button" onClick={() => onNudge('up')} disabled={first} aria-label="Move up" className={arrow}>▲</button>
          <button type="button" onClick={() => onNudge('down')} disabled={last} aria-label="Move down" className={arrow}>▼</button>
          <button type="button" onClick={() => onNudge('left')} disabled={col === 'left'} aria-label="Move to the left column" className={`${arrow} hidden lg:inline-block`}>◀</button>
          <button type="button" onClick={() => onNudge('right')} disabled={col === 'right'} aria-label="Move to the right column" className={`${arrow} hidden lg:inline-block`}>▶</button>
        </span>
      </div>
      <div className="pointer-events-none">{children}</div>
    </div>
  )
}

// Full screen where the browser allows it (not on iPhone); always covers the app.
function WallScreen({ children, onExit }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    el?.requestFullscreen?.().catch(() => { /* not allowed here: the overlay still covers the app */ })
    const onKey = (e) => e.key === 'Escape' && onExit()
    const onChange = () => { if (!document.fullscreenElement) onExit() }
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [onExit])
  return (
    <div ref={ref} className="fixed inset-0 z-50 overflow-y-auto bg-night-950 bg-[radial-gradient(ellipse_at_top,rgba(28,47,99,0.6),transparent_60%)]" role="dialog" aria-modal="true" aria-label="Wall screen">
      {children}
    </div>
  )
}
