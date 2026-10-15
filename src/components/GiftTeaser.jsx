import { giftWrapping as T } from '../data/content'
import { useGiftWrapping } from '../lib/giftWrapping'
import Icon from './Icon'

const decor = `${import.meta.env.BASE_URL}images/gift-wrap/decor/`

// The home page's one line about gift wrapping (docs/specs/gift-wrapping.md):
// a small white card with a satin ribbon and bow after Photos, linking to
// /gift-wrapping/ (owner 2026-10-15: the home page was already long). Nothing
// until the server says the switch is on (lib/giftWrapping.js), so the built
// HTML never carries it.
export default function GiftTeaser() {
  if (!useGiftWrapping()) return null
  return (
    // Pulled up into Photos' bottom padding and kept above Reviews, so its glow isn't cut off.
    <aside className="relative z-10 -mt-8 px-4 pb-8 md:-mt-12 md:pb-12" aria-label={T.nav.label}>
      <a href={T.nav.href} className="relative mx-auto flex max-w-3xl items-center gap-4 overflow-hidden rounded-2xl bg-white py-4 pl-7 pr-4 text-night-950 shadow-[0_0_32px_-8px] shadow-berry-500/60 hover:bg-berry-50">
        {/* A satin ribbon down its edge and a small bow: the gift-wrapping page's own ribbon (scripts/gift-art.mjs). */}
        <span className="absolute inset-y-0 left-0 w-3" style={{ backgroundImage: `url(${decor}ribbon-y.webp)`, backgroundSize: '100% auto' }} aria-hidden="true" />
        <img src={`${decor}bow-small.webp`} alt="" width="240" height="191" className="h-auto w-16 shrink-0 drop-shadow sm:w-20" loading="lazy" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-berry-600">{T.teaser.eyebrow}</span>
          <span className="block font-display text-xl font-extrabold leading-tight">{T.teaser.title}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{T.teaser.body} <span className="font-semibold text-berry-700 underline underline-offset-2">{T.teaser.link}</span></span>
        </span>
        <Icon name="chevron" className="size-6 shrink-0 -rotate-90 text-berry-600" />
      </a>
    </aside>
  )
}
