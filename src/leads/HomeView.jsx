import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collected, counters, routesToday, seasonProgress, syncLight } from '../lib/activity'
import { money } from '../lib/invoices'
import { todayISO } from '../lib/customers'
import { reviewStats } from '../lib/reviewAsk'
import { alertRecipients } from '../../functions/leadEmail.js'
import { adsSummary, monthKey, spentSummary } from '../lib/spend'
import { ActivityPanel, AdsPanel, Counters, Light, RoutesPanel, SeasonPanel, SignInsPanel, SpendPanel, StatusPanel, WhoPanel, label } from './HomePanels'
import { ScheduledPanel } from './ScheduledEmails'
import ChecklistPanel from './ChecklistPanel'
import { usePresence, useSignIns } from './usePresence'
import { useOutgoingMail } from './useOutgoingMail'
import { DEFAULT_LAYOUT, LAYOUT_KEY, PANELS, SIZES, bands, cycleSize, nudge, placeBefore, readLayout, sizeOf } from '../lib/dashLayout'
import { permission, storedFid } from './push'
import { useLiveDoc, useLiveQuery } from './staffStore'
import MarketingPanel from './marketing/MarketingPanel'

// Home: mission control (docs/specs/dashboard.md). Recent staff activity, live
// counters, today's routes, the season and system status lights, plus a wall
// screen (full screen, bigger type) for a TV in the shop.
const byOpenedAt = (a, b) => (b.at?.toMillis?.() ?? 0) - (a.at?.toMillis?.() ?? 0)

function useNow(ms) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

// True on computer-sized screens (Tailwind's lg), where panels pair up in columns.
function useWide() {
  const query = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setWide(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return wide
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
  const ads = useMemo(() => adsSummary(usage.data?.ads), [usage.data])

  const nums = useMemo(() => counters({ leads, invoices, calls, today }), [leads, invoices, calls, today])
  const progress = useMemo(() => seasonProgress(customers, season), [customers, season])
  const reviews = useMemo(() => reviewStats(customers, season), [customers, season])
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
  const twoColumns = useWide()
  // Each panel's height, measured on the page, so rows can be packed to match (bands()).
  const [heights, setHeights] = useState({})
  const onHeight = useCallback((k, px) => setHeights((h) => (Math.abs((h[k] ?? 0) - px) > 2 ? { ...h, [k]: px } : h)), [])
  const apply = (next) => { setLayout(next); try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(next)) } catch { /* private mode: fine */ } }
  const drop = (key, beforeKey) => { if (key) apply(placeBefore(layout, key, beforeKey)) }
  const slot = (k) => {
    const i = layout.order.indexOf(k)
    return (
      <Slot key={k} k={k} size={sizeOf(layout, k)} arranging={arranging} first={i === 0} last={i === layout.order.length - 1}
        onNudge={(dir) => apply(nudge(layout, k, dir))} onCycleSize={() => apply(cycleSize(layout, k))} onDrop={drop} onHeight={onHeight}>
        {panels[k]}
      </Slot>
    )
  }

  const panels = {
    season: <SeasonPanel season={season} progress={progress} money={cash} wall={wall} reviews={reviews} onOpenMessages={onOpenMessages} />,
    activity: <ActivityPanel entries={feed.entries} error={feed.error} loading={feed.loading} ctx={ctx} now={now} wall={wall} />,
    who: <WhoPanel rows={who.rows} error={who.error} now={minute} wall={wall} />,
    scheduled: <ScheduledPanel user={user} names={feed.names} wall={wall} />,
    signins: <SignInsPanel entries={signIns.entries} error={signIns.error} now={minute} names={feed.names} wall={wall} />,
    routes: <RoutesPanel today={day} list={routes.filter((r) => r.day === today)} customers={customers} wall={wall} />,
    status: <StatusPanel lights={lights} wall={wall} />,
    spent: <SpendPanel summary={spent} month={month} error={usage.error} loading={usage.data === undefined} wall={wall} />,
    ads: <AdsPanel ads={ads} month={month} error={usage.error} loading={usage.data === undefined} wall={wall} />,
    checklist: <ChecklistPanel wall={wall} onOpenMessages={onOpenMessages} />,
    marketing: <MarketingPanel settings={settings} wall={wall} />,
  }

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
          {/* Marketing, Reports and Notes live here, not under More ▾ (owner 2026-10-15) */}
          {!wall && <a href="#marketing" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-sm font-semibold hover:bg-white/10">📣 Marketing</a>}
          {!wall && <a href="#reports" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-sm font-semibold hover:bg-white/10">📊 Reports</a>}
          {!wall && <a href="#notes" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-sm font-semibold hover:bg-white/10">📒 Notes</a>}
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
      {arranging && <p className="text-sm text-glow-300">Drag a panel where you want it, or use its arrows. The size button cycles <strong>Half → 2/3 → 1/3 → Wide</strong>; panels fill each row left to right and small ones stack beside a tall one. Phones show them in this order, one under another. Saved on this device.</p>}
      {/* Computers: runs of Half panels stack flush in two columns; a Wide panel is a row of its own. Phones: the plain order. */}
      <div className="space-y-4"
        onDragOver={arranging ? (e) => e.preventDefault() : undefined}
        onDrop={arranging ? (e) => { e.preventDefault(); drop(e.dataTransfer.getData('text/plain'), null) } : undefined}>
        {twoColumns
          ? bands(layout, heights).map((row, i) => (
            <div key={`row-${i}`} className="grid grid-cols-6 gap-4">
              {row.cells.map((cell) => (
                <div key={cell.keys[0]} className={`flex min-w-0 flex-col gap-4 ${SPAN[cell.units]}`}>{cell.keys.map(slot)}</div>
              ))}
            </div>
          ))
          : layout.order.map(slot)}
      </div>
    </div>
  )

  return wall ? <WallScreen onExit={exitWall}>{board}</WallScreen> : board
}

// One panel while arranging: a handle bar with arrows, draggable (computers),
// and a drop target (drop = put the dragged panel before this one).
const PANEL_LABEL = Object.fromEntries(PANELS)
// Cell widths in sixths of the row (literal class names so Tailwind keeps them).
const SPAN = { 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', 6: 'col-span-6' }
// A panel grows to its row's height, so neighbours' edges line up (phones: no stretching needed).
const STRETCH = 'flex min-w-0 flex-1 flex-col [&>section]:flex-1'
const arrow = 'size-9 rounded-full border border-white/20 text-sm font-semibold hover:bg-white/10 disabled:opacity-30'
function Slot({ k, size, arranging, first, last, onNudge, onCycleSize, onDrop, onHeight, children }) {
  // Report the panel's own height (not the handle bar) whenever it changes.
  const body = useRef(null)
  useEffect(() => {
    const el = body.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // The card is stretched to its row, so measure what's inside it: padding plus its children.
    const report = () => {
      const sec = el.querySelector('section') ?? el
      const cs = getComputedStyle(sec)
      const inner = [...sec.children].reduce((t, c) => t + c.getBoundingClientRect().height, 0)
      const gaps = Math.max(0, sec.children.length - 1) * (parseFloat(cs.rowGap) || 0)
      onHeight?.(k, inner + gaps + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth))
    }
    const first = setTimeout(report, 0) // right after layout (a hidden tab never paints, so not a frame callback)
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => { clearTimeout(first); ro.disconnect() }
  }, [k, onHeight])
  if (!arranging) return <div ref={body} className={STRETCH}>{children}</div>
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', k); e.dataTransfer.effectAllowed = 'move' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(e.dataTransfer.getData('text/plain'), k) }}
      className="flex min-w-0 flex-1 cursor-grab flex-col rounded-3xl ring-2 ring-glow-400/50 active:cursor-grabbing">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs text-glow-300">
        <span className="font-semibold">⠿ {PANEL_LABEL[k]}</span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onNudge('up')} disabled={first} aria-label="Move earlier" className={arrow}>▲</button>
          <button type="button" onClick={() => onNudge('down')} disabled={last} aria-label="Move later" className={arrow}>▼</button>
          <button type="button" onClick={onCycleSize} title="Width: Half → 2/3 → 1/3 → Wide" className="hidden min-h-9 rounded-full border border-white/20 px-3 text-xs font-semibold hover:bg-white/10 lg:inline-block">
            ⇔ {SIZES[size].label}
          </button>
        </span>
      </div>
      <div ref={body} className={`pointer-events-none ${STRETCH}`}>{children}</div>
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
