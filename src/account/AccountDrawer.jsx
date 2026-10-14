import { useEffect } from 'react'
import { business } from '../data/content'
import { ACCOUNT_TOUR_UI } from '../data/accountTour'

// The customer's menu on /account/ (owner 2026-10-12: "their own side drawer
// like the rest of the site"): ☰ opens a drawer from the left with the parts
// of their account (anchors on the page), call / text, the designer, privacy,
// and sign out. Closes on a pick, the backdrop, Escape, or a hash change.
// items: [{ href, label, icon, external? }] from the page, by what's on it.
// onTour: replays the account tour (AccountTour.jsx); only when signed in.
const row = 'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base text-slate-100 hover:bg-white/5'
const Pic = ({ children }) => <span aria-hidden="true" className="w-7 shrink-0 text-center text-lg">{children}</span>

export default function AccountDrawer({ open, onClose, items = [], email = '', onSignOut, onTour }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onClose)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onClose) }
  }, [open, onClose])
  if (!open) return null
  const base = import.meta.env.BASE_URL
  return (
    <div className="fixed inset-0 z-40 print:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-night-950/70 backdrop-blur-sm" />
      <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto border-r border-white/10 bg-night-900 shadow-2xl">
        <div className="flex items-center justify-between py-2 pl-4 pr-1">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold"><img src={business.logo} alt="" className="size-8" />Your account</span>
          <button type="button" onClick={onClose} aria-label="Close" className="size-11 rounded-full text-slate-300 hover:bg-white/10">✕</button>
        </div>
        <nav className="flex-1 px-2" aria-label="Your account">
          {(items.length > 0 || onTour) && (
            <ul>
              {items.map((it) => (
                <li key={it.href}><a href={it.href} onClick={onClose} className={row}><Pic>{it.icon}</Pic>{it.label}</a></li>
              ))}
              {onTour && <li><button type="button" onClick={() => { onClose(); onTour() }} className={row}><Pic>🧭</Pic>{ACCOUNT_TOUR_UI.menu}</button></li>}
            </ul>
          )}
          <section className="mt-2 border-t border-white/10 pt-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Reach us</p>
            <ul>
              <li><a href={business.phoneHref} className={row}><Pic>📞</Pic>Call {business.phone}</a></li>
              <li><a href={`sms:+1${String(business.phone).replace(/\D/g, '')}`} className={row}><Pic>💬</Pic>Text us</a></li>
            </ul>
          </section>
          <section className="mt-2 border-t border-white/10 pt-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">More</p>
            <ul>
              <li><a href={`${base}design/`} className={row}><Pic>🎨</Pic>Design your lights</a></li>
              <li><a href={base} className={row}><Pic>🏠</Pic>Website</a></li>
              <li><a href={`${base}privacy/`} className={row}><Pic>🔒</Pic>Privacy</a></li>
            </ul>
          </section>
        </nav>
        {(email || onSignOut) && (
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-sm text-slate-400">
            <span className="truncate">{email}</span>
            {onSignOut && <button type="button" onClick={() => { onClose(); onSignOut() }} className="min-h-11 shrink-0 font-semibold text-slate-200">Sign out</button>}
          </div>
        )}
      </div>
    </div>
  )
}
