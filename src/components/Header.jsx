import { useEffect, useRef, useState } from 'react'
import { business, nav as mainNav } from '../data/content'
import { useFocusOnOpen } from '../lib/focus'
import { navLinks, useGiftWrapping } from '../lib/giftWrapping'
import { useToday } from '../lib/prerendered'
import { topBar } from '../lib/urgency'
import Icon from './Icon'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menu = useRef(null)
  useFocusOnOpen(menu, open)
  const bar = topBar(useToday())
  // The Gift wrapping link only while the owner has it switched on (lib/giftWrapping.js).
  const nav = navLinks(mainNav, useGiftWrapping())

  // The bottom bar (MobileCta) hides while the menu is open.
  useEffect(() => {
    if (open) document.body.dataset.menu = 'open'
    else delete document.body.dataset.menu
    return () => { delete document.body.dataset.menu }
  }, [open])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors ${scrolled || open ? 'bg-night-950/90 backdrop-blur border-b border-white/10' : 'bg-transparent'}`}>
      {/* The offer bar (content.js urgency.topBar): only while at the top of the page. */}
      {!scrolled && !open && (
        <a href={bar.href} className="flex min-h-11 items-center justify-center border-b border-glow-400/40 bg-night-900 px-4 py-2 text-center text-xs font-semibold leading-tight text-glow-300 sm:text-sm">
          {bar.text}
        </a>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          {/* The name is part of the picture; the alt text carries it for screen readers. */}
          <img src={business.logoWide} alt={business.name} width="517" height="168" className="h-12 w-auto sm:h-14" />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="text-sm font-medium text-slate-300 hover:text-glow-300">{n.label}</a>
          ))}
          <a href="#estimate" className="rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950 shadow-[0_0_24px_-4px] shadow-glow-400/70 hover:bg-glow-300">
            Free estimate
          </a>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <a href={business.phoneHref} className="rounded-full p-2.5 text-glow-300" aria-label={`Call ${business.phone}`}>
            <Icon name="phone" />
          </a>
          <button type="button" className="rounded-full p-2.5" aria-expanded={open} aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" ref={menu} className="flex h-[calc(100svh-4rem)] flex-col overflow-y-auto border-t border-white/10 bg-night-950 px-4 pb-6 pt-2 md:hidden" aria-label="Mobile">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}
              className="block border-b border-white/5 py-4 text-lg font-medium">{n.label}</a>
          ))}
          {/* What customers have (owner 2026-10-12): the account, and the phone one tap from the open menu. */}
          <a href={`${import.meta.env.BASE_URL}account/`} className="flex items-center gap-3 border-b border-white/5 py-4 text-lg font-medium">
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
          <a href="#estimate" onClick={() => setOpen(false)}
            className="mt-3 block rounded-full bg-glow-400 py-3.5 text-center font-semibold text-night-950">
            Get a free estimate
          </a>
          {/* The 2012 sign fills the rest of the panel (owner 2026-10-12). Decorative. */}
          <div className="mt-auto flex flex-col items-center gap-2 pt-6 text-center">
            <img src={`${import.meta.env.BASE_URL}images/clc-sign.svg`} alt="" width="403" height="508" className="h-36 w-auto" />
            <p className="text-sm text-slate-400">From your friends in Pearland · since {business.since}</p>
          </div>
        </nav>
      )}
    </header>
  )
}
