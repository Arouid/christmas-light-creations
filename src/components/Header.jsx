import { useEffect, useRef, useState } from 'react'
import { business, nav } from '../data/content'
import { useFocusOnOpen } from '../lib/focus'
import Icon from './Icon'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menu = useRef(null)
  useFocusOnOpen(menu, open)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors ${scrolled || open ? 'bg-night-950/90 backdrop-blur border-b border-white/10' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          <img src={business.logo} alt="" className="size-11 shrink-0" />
          {/* Phones: wraps to two lines next to the call/menu buttons; wider screens: one line */}
          <span className="max-w-[8.5rem] font-display text-[15px] font-bold leading-[1.1] sm:max-w-none sm:text-xl">{business.name}</span>
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
        <nav id="mobile-nav" ref={menu} className="border-t border-white/10 px-4 pb-6 pt-2 md:hidden" aria-label="Mobile">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}
              className="block border-b border-white/5 py-4 text-lg font-medium">{n.label}</a>
          ))}
          <a href="#estimate" onClick={() => setOpen(false)}
            className="mt-6 block rounded-full bg-glow-400 py-3.5 text-center font-semibold text-night-950">
            Get a free estimate
          </a>
        </nav>
      )}
    </header>
  )
}
