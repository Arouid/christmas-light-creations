import { giftWrapping as T } from '../data/content'
import { useGiftWrapping } from '../lib/giftWrapping'
import Icon from './Icon'
import Section from './Section'

// One holiday icon per step (public/images/holiday, scripts/holiday-icons.mjs): ask, price, hand-off.
const STEP_ICONS = ['card-mail.svg', 'card-card.svg', 'gift.svg']

// Gift wrapping (docs/specs/gift-wrapping.md): the owner's second service.
// Nothing until the server says the switch is on (lib/giftWrapping.js), so
// the built HTML never carries it. Words, photos and details in content.js.
export default function GiftWrapping() {
  if (!useGiftWrapping()) return null
  return (
    <Section id="gift-wrapping" eyebrow={T.eyebrow} title={T.title} intro={T.intro} className="scroll-mt-16">
      {T.photos.length > 0 && (
        <ul className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          {T.photos.map((p) => (
            <li key={p.src} className="overflow-hidden rounded-xl bg-night-900">
              <img src={p.src} alt={p.alt} loading="lazy" className="aspect-[4/3] h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      )}
      <ol className="grid gap-4 md:grid-cols-3">
        {T.steps.map(([title, body], i) => (
          <li key={title} className="rounded-2xl border border-white/10 bg-night-900 p-6">
            <div className="mb-3 flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}images/holiday/${STEP_ICONS[i] ?? 'gift.svg'}`} alt="" width="56" height="56" className="size-14" loading="lazy" />
              <p className="inline-flex size-9 items-center justify-center rounded-full bg-berry-600/30 font-display text-lg font-extrabold text-berry-500">{i + 1}</p>
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-slate-400">{body}</p>
          </li>
        ))}
      </ol>
      {T.details.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {T.details.map((d) => (
            <li key={d} className="flex gap-3 rounded-2xl border border-white/10 px-5 py-4 text-slate-200">
              <Icon name="check" className="mt-0.5 size-5 shrink-0 text-pine-500" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
      <a href="#estimate" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-glow-400 px-7 py-3.5 font-semibold text-night-950 shadow-[0_0_28px_-6px] shadow-glow-400 hover:bg-glow-300 sm:w-auto">
        🎁 {T.cta}
      </a>
    </Section>
  )
}
