import { useEffect } from 'react'
import { accountGlance, accountMenu, business } from '../data/content'
import { ACCOUNT_TOUR_UI } from '../data/accountTour'
import Icon from '../components/Icon'

// The customer's menu on /account/ (owner 2026-10-12: "their own side drawer
// like the rest of the site"): ☰ opens a drawer from the left with the parts
// of their account (anchors on the page), call / text, the designer, privacy,
// and sign out. Closes on a pick, the backdrop, Escape, or a hash change.
// Grouped under headings, each with one of our line icons; the rows are words
// only (owner 2026-10-14: "organize the drawer menu under categories instead of
// everything having an icon"). Headings and their order: content.js accountMenu.
// items: [{ group, href, label }] from the page, by what's on it.
// onTour: replays the account tour (AccountTour.jsx); only when signed in.
// onAddContact: starts a Chat with us message asking us to link another email
// or phone (it moved here from the greeting card, owner 2026-10-14).
// 44 px rows: the smallest tap target the site allows (owner 2026-10-14: the rows felt tall at 48).
const row = 'flex min-h-11 w-full items-center rounded-xl pl-10 pr-3 text-left text-[15px] text-slate-100 hover:bg-white/5'

export default function AccountDrawer({ open, onClose, items = [], email = '', onSignOut, onTour, onAddContact }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onClose)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onClose) }
  }, [open, onClose])
  if (!open) return null
  const base = import.meta.env.BASE_URL
  // The fixed rows, by group, after the page's own.
  const act = (fn) => () => { onClose(); fn() }
  const extra = {
    home: [onAddContact && { label: accountGlance.addContact, onClick: act(onAddContact) }],
    help: [onTour && { label: ACCOUNT_TOUR_UI.menu, onClick: act(onTour) }],
    reach: [{ label: `Call ${business.phone}`, href: business.phoneHref }, { label: 'Text us', href: `sms:+1${String(business.phone).replace(/\D/g, '')}` }],
    more: [{ label: 'Design your lights', href: `${base}design/` }, { label: 'Website', href: base }, { label: 'Privacy', href: `${base}privacy/` }],
  }
  const groups = accountMenu.groups
    .map((g) => ({ ...g, rows: [...items.filter((it) => it.group === g.key), ...(extra[g.key] ?? [])].filter(Boolean) }))
    .filter((g) => g.rows.length)
  return (
    <div className="fixed inset-0 z-40 print:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-night-950/70 backdrop-blur-sm" />
      <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto border-r border-white/10 bg-night-900 shadow-2xl">
        <div className="flex items-center justify-between py-2 pl-4 pr-1">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold"><img src={business.logo} alt="" className="size-8" />Your account</span>
          <button type="button" onClick={onClose} aria-label="Close" className="size-11 rounded-full text-slate-300 hover:bg-white/10">✕</button>
        </div>
        <nav className="flex-1 px-2 pb-2" aria-label="Your account">
          {groups.map((g, n) => (
            <section key={g.key} aria-labelledby={`menu-${g.key}`} className={n ? 'mt-1 border-t border-white/10' : ''}>
              <h2 id={`menu-${g.key}`} className="flex items-center gap-2.5 px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Icon name={g.icon} className="size-5 text-glow-300" />{g.title}
              </h2>
              <ul>
                {g.rows.map((it) => (
                  <li key={it.label}>
                    {it.href
                      ? <a href={it.href} onClick={it.href.startsWith('#') ? onClose : undefined} className={row}>{it.label}</a>
                      : <button type="button" onClick={it.onClick} className={row}>{it.label}</button>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        {(email || onSignOut) && (
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-sm text-slate-400">
            <span className="truncate">{email}</span>
            {onSignOut && <button type="button" onClick={act(onSignOut)} className="inline-flex min-h-11 shrink-0 items-center gap-2 font-semibold text-slate-200"><Icon name="logout" className="size-5 text-glow-300" />{accountMenu.signOut}</button>}
          </div>
        )}
      </div>
    </div>
  )
}
