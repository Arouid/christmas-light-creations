import { useEffect, useState } from 'react'
import { business } from '../data/content'
import { useSign } from '../lib/prerendered'
import Icon from './Icon'

// Thumb-reach action bar, phones only. Road-sign visitors also get Text.
// Owner 2026-10-12 ("is this a lot of yellow?"): the bar stays out of the way
// while the hero's own estimate button is on screen, and while the menu is
// open (body[data-menu=open], set by Header), so one gold button shows at a
// time. Sign visitors keep it always: Text is only here.
export default function MobileCta() {
  const sign = useSign()
  // Starts hidden only where there is a hero button to watch; the observer's
  // first callback (async) sets the real state.
  const [heroVisible, setHeroVisible] = useState(() => typeof document !== 'undefined' && Boolean(document.getElementById('hero-estimate')) && 'IntersectionObserver' in window)
  useEffect(() => {
    const cta = document.getElementById('hero-estimate')
    if (!cta || !('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.5 })
    io.observe(cta)
    return () => io.disconnect()
  }, [])
  const hidden = heroVisible && !sign
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 grid ${sign ? 'grid-cols-3' : 'grid-cols-2'} gap-2 border-t border-white/10 bg-night-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 md:hidden ${hidden ? 'translate-y-full' : ''} [body[data-menu=open]_&]:hidden`}
      aria-hidden={hidden}>
      <a href={business.phoneHref} tabIndex={hidden ? -1 : undefined} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 font-semibold">
        <Icon name="phone" className="size-5" /> Call
      </a>
      {sign && (
        <a href={business.smsWith(business.signText)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 font-semibold">
          <Icon name="chat" className="size-5" /> Text
        </a>
      )}
      <a href="#estimate" tabIndex={hidden ? -1 : undefined} className="rounded-full bg-glow-400 py-3 text-center font-semibold text-night-950">
        {sign ? 'Estimate' : 'Free estimate'}
      </a>
    </div>
  )
}
