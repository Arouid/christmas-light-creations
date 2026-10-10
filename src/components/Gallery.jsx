import { useCallback, useEffect, useRef, useState } from 'react'
import { gallery } from '../data/content'
import { useFocusOnOpen } from '../lib/focus'
import Icon from './Icon'
import Section from './Section'

const INITIAL = 9

export default function Gallery() {
  const [showAll, setShowAll] = useState(false)
  const [active, setActive] = useState(null)
  const photos = showAll ? gallery : gallery.slice(0, INITIAL)
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
              className="group block h-full w-full overflow-hidden rounded-xl bg-night-900 focus-visible:outline-2 focus-visible:outline-glow-400">
              <img src={p.src} alt={p.alt} loading="lazy"
                className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>
      {!showAll && gallery.length > INITIAL && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setShowAll(true)}
            className="rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/5">
            Show all {gallery.length} photos
          </button>
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
          <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-slate-400">{active + 1} / {gallery.length}</p>
        </div>
      )}
    </Section>
  )
}
