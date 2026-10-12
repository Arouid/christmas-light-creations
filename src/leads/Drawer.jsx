import { useEffect, useState } from 'react'
import { GROUPS, ICON, NAME, SHORTCUTS, groupOf, searchHash } from '../lib/staffMenu'

// The phone menu: ☰ opens this drawer from the left (owner 2026-10-12, "like
// the Firebase console's"): a search box that jumps to Accounts, the
// shortcuts, the other sections in groups you can fold, then the guide,
// settings and sign-out. Closes on a pick, the backdrop, Escape, or any hash
// change. Which groups are open is remembered on this device; the group that
// holds the current section opens by itself. Computers keep the tab row.
const OPEN_KEY = 'clcMenuGroups'
const readOpen = () => { try { return new Set(JSON.parse(localStorage.getItem(OPEN_KEY)) ?? []) } catch { return new Set() } }
const saveOpen = (set) => { try { localStorage.setItem(OPEN_KEY, JSON.stringify([...set])) } catch { /* private mode: fine */ } }

const row = (on) => `flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base ${on ? 'bg-white/10 font-semibold text-glow-300' : 'text-slate-100 hover:bg-white/5'}`
const Pic = ({ k }) => <span aria-hidden="true" className="w-7 shrink-0 text-center text-lg">{ICON[k]}</span>

export default function Drawer({ open, onClose, tab, askOn, count, who, demo, onMessages, onGuide, onSettings, onSignOut }) {
  const [q, setQ] = useState('')
  const [opened, setOpened] = useState(readOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onClose)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onClose) }
  }, [open, onClose])
  if (!open) return null

  const current = groupOf(tab)
  const isOpen = (name) => opened.has(name) || (name === current && !opened.has(`closed:${name}`))
  const toggle = (name) => setOpened((s) => {
    const n = new Set(s)
    if (isOpen(name)) { n.delete(name); if (name === current) n.add(`closed:${name}`) } else { n.add(name); n.delete(`closed:${name}`) }
    saveOpen(n)
    return n
  })
  const search = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    window.location.hash = searchHash(q)
    setQ('')
    onClose()
  }
  const link = (k) => (
    <li key={k}>
      <a href={`#${k}`} onClick={onClose} aria-current={tab === k ? 'page' : undefined} className={row(tab === k)}><Pic k={k} />{NAME[k]}</a>
    </li>
  )

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-night-950/70 backdrop-blur-sm" />
      <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto border-r border-white/10 bg-night-900 shadow-2xl">
        <div className="flex items-center justify-between py-2 pl-4 pr-1">
          <span className="font-display text-xl font-extrabold">CLC Staff</span>
          <button type="button" onClick={onClose} aria-label="Close" className="size-11 rounded-full text-slate-300 hover:bg-white/10">✕</button>
        </div>
        <form onSubmit={search} className="px-3 pb-2">
          <label className="flex items-center gap-2 rounded-full border border-white/20 bg-night-950 px-4 py-2.5 focus-within:border-glow-400">
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" autoComplete="off"
              placeholder="Find anyone: name, street, phone" aria-label="Search accounts"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-500" />
          </label>
        </form>
        <nav className="flex-1 px-2" aria-label="Sections">
          <ul>
            {SHORTCUTS.filter((k) => k !== 'ask' || askOn).map(link)}
            <li>
              <button type="button" onClick={() => { onMessages(); onClose() }} className={row(false)}>
                <span aria-hidden="true" className="w-7 shrink-0 text-center text-lg">💬</span>Messages
                {count > 0 && <span className="ml-auto rounded-full bg-berry-500 px-2 text-xs font-bold leading-5 text-white">{count > 99 ? '99+' : count}</span>}
              </button>
            </li>
          </ul>
          {GROUPS.map(([name, keys]) => (
            <section key={name} className="mt-2 border-t border-white/10 pt-1">
              <button type="button" onClick={() => toggle(name)} aria-expanded={isOpen(name)}
                className="flex min-h-11 w-full items-center justify-between px-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                {name}<span aria-hidden="true" className="text-base">{isOpen(name) ? '▾' : '▸'}</span>
              </button>
              {isOpen(name) && <ul>{keys.map(link)}</ul>}
            </section>
          ))}
        </nav>
        <div className="mt-2 border-t border-white/10 p-2">
          <ul>
            <li><button type="button" onClick={() => { onGuide(); onClose() }} className={row(false)}><span aria-hidden="true" className="w-7 shrink-0 text-center text-lg">?</span>Staff guide</button></li>
            <li><button type="button" onClick={() => { onSettings(); onClose() }} className={row(false)}><span aria-hidden="true" className="w-7 shrink-0 text-center text-lg">⚙</span>Settings</button></li>
          </ul>
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-slate-400">
            <span className="truncate">{who}</span>
            {!demo && <button type="button" onClick={onSignOut} className="min-h-11 shrink-0 font-semibold text-slate-200">Sign out</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
