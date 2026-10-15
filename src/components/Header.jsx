import { useEffect, useRef, useState } from 'react'
import { business, nav as mainNav } from '../data/content'
import { useFocusOnOpen } from '../lib/focus'
import { navLinks, useGiftWrapping } from '../lib/giftWrapping'
import { useToday } from '../lib/prerendered'
import { topBar } from '../lib/urgency'
import Icon from './Icon'

const base = import.meta.env.BASE_URL

// The header of every public page (design review 2026-10-14: one header, not
// five): the wide logo, the phone one tap away (☎ on phones and tablets, the
// number from lg up) and the menu (☰ below lg, the links and Free estimate from
// lg up). The area pages copy it in plain HTML (scripts/build-areas.mjs).
// home: the home page's own: fixed over the hero, see-through until you
// scroll, the offer bar on top, links scroll the page. Elsewhere it sticks to
// the top on a solid background and its links go to the home page.
// estimate: where Free estimate goes (/design/ has its own form).
export default function Header({ home = true, estimate = home ? '#estimate' : `${base}#estimate` }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menu = useRef(null)
  useFocusOnOpen(menu, open)
  const bar = topBar(useToday())
  // The Gift wrapping link only while the owner has it switched on (lib/giftWrapping.js);
  // only the home page asks the server.
  const nav = navLinks(mainNav, useGiftWrapping(home))
    .map((n) => ({ ...n, href: home || !n.href.startsWith('#') ? n.href : `${base}${n.href}` }))
  const solid = !home || scrolled || open

  // The bottom bar (MobileCta) hides while the menu is open.
  useEffect(() => {
    if (open) document.body.dataset.menu = 'open'
    else delete document.body.dataset.menu
    return () => { delete document.body.dataset.menu }
  }, [open])

  // Escape closes the menu (focus goes back to ☰, lib/focus.js).
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!home) return undefined
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [home])

  return (
    <header className={`${home ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 transition-colors ${solid ? 'bg-night-950/90 backdrop-blur border-b border-white/10' : 'bg-transparent'}`}>
      {/* The offer bar (content.js urgency.topBar): home page, only while at the top. */}
      {home && !scrolled && !open && (
        <a href={bar.href} className="flex min-h-11 items-center justify-center border-b border-glow-400/40 bg-night-900 px-4 py-2 text-center text-xs font-semibold leading-tight text-glow-300 sm:text-sm">
          {bar.text}
        </a>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <a href={home ? '#top' : base} className="flex min-w-0 shrink-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          {/* The name is part of the picture; the alt text carries it for screen readers. */}
          <img src={business.logoWide} alt={business.name} width="517" height="168" className="h-12 w-auto sm:h-14" />
        </a>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-7" aria-label="Main">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="whitespace-nowrap text-sm font-medium text-slate-300 hover:text-glow-300">{n.label}</a>
          ))}
          <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-glow-300 hover:text-white">
            <Icon name="phone" className="size-4" /> {business.phone}
          </a>
          <a href={estimate} className="whitespace-nowrap rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950 shadow-[0_0_24px_-4px] shadow-glow-400/70 hover:bg-glow-300">
            Free estimate
          </a>
        </nav>

        <div className="flex items-center gap-1 lg:hidden">
          <a href={business.phoneHref} className="grid size-11 place-items-center rounded-full text-glow-300" aria-label={`Call ${business.phone}`}>
            <Icon name="phone" />
          </a>
          <button type="button" className="grid size-11 place-items-center rounded-full" aria-expanded={open} aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" ref={menu} className="flex h-[calc(100svh-4rem)] flex-col overflow-y-auto border-t border-white/10 bg-night-950 px-4 pb-6 pt-2 lg:hidden" aria-label="Mobile">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}
              className="block border-b border-white/5 py-4 text-lg font-medium">{n.label}</a>
          ))}
          {/* What customers have (owner 2026-10-12): the account, and the phone one tap from the open menu. */}
          <a href={`${base}account/`} className="flex items-center gap-3 border-b border-white/5 py-4 text-lg font-medium">
            <Icon name="user" className="size-5 text-glow-300" /><span>Your account <span className="block text-sm font-normal text-slate-400">Sign in, pay, your install day</span></span>
          </a>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={business.phoneHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 py-3 font-semibold">
              <Icon name="phone" className="size-5" /> Call
            </a>
            <a href={business.smsWith('')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 py-3 font-semibold">
              <Icon name="chat" className="size-5" /> Text us
            </a>
          </div>
          <a href={estimate} onClick={() => setOpen(false)}
            className="mt-3 block rounded-full bg-glow-400 py-3.5 text-center font-semibold text-night-950">
            Get a free estimate
          </a>
          {/* The 2012 sign fills the rest of the panel (owner 2026-10-12). Decorative. */}
          <div className="mt-auto flex flex-col items-center gap-2 pt-6 text-center">
            <img src={`${base}images/clc-sign.svg`} alt="" width="403" height="508" className="h-36 w-auto" />
            <p className="text-sm text-slate-400">From your friends in Pearland · since {business.since}</p>
          </div>
        </nav>
      )}
    </header>
  )
}
