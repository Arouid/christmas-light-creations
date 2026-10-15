import { useEffect, useState } from 'react'
import { business } from '../data/content'
import { useSign } from '../lib/prerendered'
import Icon from './Icon'

// Thumb-reach action bar on phones and tablets (every public page but the
// account). Road-sign visitors also get Text.
// Owner 2026-10-12 ("is this a lot of yellow?") and the design review of
// 2026-10-14: the bar stays out of the way while one of the page's own
// estimate buttons or the form is on screen (anything marked data-bar-hide),
// and while the menu is open (body[data-menu=open], set by Header), so one
// gold button shows at a time; the header's ☎ is always there. Sign visitors
// keep it always: Text is only here.
// estimate: where Free estimate goes.
// skin: 'night' (the site) or 'snow' (white and red, the gift-wrapping page);
// each a full set of classes, never a second bg-… added onto a shared one.
const SKINS = {
  night: { bar: 'border-white/10 bg-night-950/90', call: 'bg-white/10', estimate: 'bg-glow-400 text-night-950' },
  snow: { bar: 'border-berry-500/20 bg-white/95', call: 'bg-berry-50 text-berry-700', estimate: 'bg-berry-600 text-white' },
}
export default function MobileCta({ estimate = '#estimate', skin = 'night' }) {
  const look = SKINS[skin] ?? SKINS.night
  const sign = useSign()
  // Starts hidden, in the built HTML too (so React's first draw matches it);
  // the observer's first answer, right after, shows it if nothing is in view.
  const [covered, setCovered] = useState(true)
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-bar-hide]')]
    if (!els.length || !('IntersectionObserver' in window)) {
      const show = requestAnimationFrame(() => setCovered(false))
      return () => cancelAnimationFrame(show)
    }
    const seen = new Set()
    // In view: half of a button, or a good piece of the (taller than the screen) form.
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= 200)) seen.add(e.target)
        else seen.delete(e.target)
      }
      setCovered(seen.size > 0)
    }, { threshold: [0, 0.25, 0.5, 1] })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  const hidden = covered && !sign
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 grid ${sign ? 'grid-cols-3' : 'grid-cols-2'} gap-2 border-t ${look.bar} p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur motion-safe:transition-transform motion-safe:duration-300 lg:hidden ${hidden ? 'translate-y-full' : ''} [body[data-menu=open]_&]:hidden`}
      aria-hidden={hidden}>
      <a href={business.phoneHref} tabIndex={hidden ? -1 : undefined} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full py-3 font-semibold ${look.call}`}>
        <Icon name="phone" className="size-5" /> Call
      </a>
      {sign && (
        <a href={business.smsWith(business.signText)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full py-3 font-semibold ${look.call}`}>
          <Icon name="chat" className="size-5" /> Text
        </a>
      )}
      <a href={estimate} tabIndex={hidden ? -1 : undefined} className={`inline-flex min-h-11 items-center justify-center rounded-full py-3 text-center font-semibold ${look.estimate}`}>
        {sign ? 'Estimate' : 'Free estimate'}
      </a>
    </div>
  )
}
