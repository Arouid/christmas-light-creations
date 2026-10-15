import { useCallback, useEffect, useRef, useState } from 'react'
import { gallery, galleryUi } from '../data/content'
import { useFocusOnOpen } from '../lib/focus'
import { scrollMotion } from '../lib/motion.js'
import { GRID_SIZES, GRID_SIZES_WIDE, gallerySrcSet } from '../lib/thumb'
import Icon from './Icon'
import Section from './Section'

const INITIAL = 9
const STEP = 12

export default function Gallery() {
  const [count, setCount] = useState(INITIAL)
  const [active, setActive] = useState(null)
  const photos = gallery.slice(0, count)
  const left = gallery.length - count
  const fewer = () => {
    setCount(INITIAL)
    document.getElementById('gallery')?.scrollIntoView({ behavior: scrollMotion() })
  }
  const dialog = useRef(null)
  useFocusOnOpen(dialog, active !== null)

  const step = useCallback((d) => setActive((i) => (i + d + gallery.length) % gallery.length), [])

  useEffect(() => {
    if (active === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setActive(null)
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [active, step])

  return (
    <Section id="gallery" eyebrow="Our work" title="Homes we’ve lit up."
      intro="A few of the 250+ homes we light every year across Pearland and south Houston.">
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        {photos.map((p, i) => (
          <li key={p.src} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
            <button type="button" onClick={() => setActive(i)}
              className="group relative block h-full w-full overflow-hidden rounded-xl bg-night-900 focus-visible:outline-2 focus-visible:outline-glow-400">
              <img src={p.src} srcSet={gallerySrcSet(p.src)} sizes={i === 0 ? GRID_SIZES_WIDE : GRID_SIZES} alt={p.alt} loading="lazy"
                className="aspect-[4/3] h-full w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-105" />
              {/* Where it is, as on the area pages (the alt text already says it, so screen readers skip this). */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950/90 to-night-950/0 px-2.5 pb-2 pt-8 text-left text-xs font-medium text-white sm:px-3 sm:text-sm">{p.place}</span>
            </button>
          </li>
        ))}
      </ul>
      {(left > 0 || count > INITIAL) && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {left > 0 && (
            <button type="button" onClick={() => setCount((c) => Math.min(c + STEP, gallery.length))}
              className="min-h-11 rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/5">
              {galleryUi.more(Math.min(STEP, left), left)}
            </button>
          )}
          {count > INITIAL && (
            <button type="button" onClick={fewer} className="min-h-11 rounded-full px-6 py-3 font-semibold text-slate-300 underline underline-offset-4 hover:text-white">
              {galleryUi.fewer}
            </button>
          )}
        </div>
      )}

      {active !== null && (
        <div ref={dialog} role="dialog" aria-modal="true" aria-label={gallery[active].alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/95 p-2"
          onClick={() => setActive(null)}>
          <img src={gallery[active].src} alt={gallery[active].alt}
            className="max-h-[85svh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" aria-label="Close" onClick={() => setActive(null)}
            className="absolute right-3 top-3 rounded-full bg-white/10 p-3"><Icon name="close" /></button>
          <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1) }}
            className="absolute bottom-6 left-6 rounded-full bg-white/10 p-3 md:bottom-auto md:left-4"><Icon name="left" /></button>
          <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1) }}
            className="absolute bottom-6 right-6 rounded-full bg-white/10 p-3 md:bottom-auto md:right-4"><Icon name="right" /></button>
          <p className="absolute bottom-7 left-1/2 w-[56vw] -translate-x-1/2 text-center text-sm text-slate-200 md:w-auto">
            {gallery[active].place}
            <span className="block text-xs text-slate-400">{active + 1} / {gallery.length}</span>
          </p>
        </div>
      )}
    </Section>
  )
}
