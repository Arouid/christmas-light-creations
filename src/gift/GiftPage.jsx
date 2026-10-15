import { useEffect } from 'react'
import EstimateForm from '../components/EstimateForm'
import Header from '../components/Header'
import Icon from '../components/Icon'
import MobileCta from '../components/MobileCta'
import Rich from '../components/Rich'
import { business, footerLinks, giftWrapping as t } from '../data/content'
import { useGiftWrappingAnswer } from '../lib/giftWrapping'
import { Bow, Holly } from './Art'

// /gift-wrapping/ (docs/specs/gift-wrapping.md): the owner's second service
// on its own page, white and red so it stands apart from the night-blue
// lights site (owner 2026-10-15). Behind the same switch as before: the
// built HTML is only the header, an empty main and the footer (no word of
// gift wrapping; scripts/prerender.mjs checks), the page asks the server, and
// draws everything only when the switch is on. Off (or no answer) sends the
// visitor to the home page. Words in content.js (giftWrapping).
const base = import.meta.env.BASE_URL
const holiday = (f) => `${base}images/holiday/${f}`
// One holiday icon per step (public/images/holiday, scripts/holiday-icons.mjs): ask, price, hand-off.
const STEP_ICONS = ['card-mail.svg', 'card-card.svg', 'gift.svg']
const btn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-center font-semibold'
const panel = 'rounded-2xl bg-white ring-1 ring-berry-500/15'

export default function GiftPage() {
  const on = useGiftWrappingAnswer() // null until the server answers
  useEffect(() => {
    if (on === false) window.location.replace(base)
    if (on) document.title = t.pageTitle
  }, [on])
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <Header home={false} estimate="#estimate" />
      <main id="main" tabIndex={-1} data-behind-switch="" aria-busy={!on} className="on-snow min-h-[70svh] bg-white text-night-950">
        {on ? <Content /> : <Waiting />}
      </main>
      <Footer />
      {/* Thumb-reach bar on phones, once the page's own buttons and form exist to hide behind. */}
      {on && <MobileCta estimate="#estimate" skin="snow" />}
    </>
  )
}

// While the page asks the server: three red dots, no words.
function Waiting() {
  return (
    <div className="flex justify-center gap-2 pt-32" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2.5 rounded-full bg-berry-500 motion-safe:animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
      ))}
    </div>
  )
}

function Content() {
  return (
    <>
      <Hero />
      {t.photos.length > 0 && <Photos />}
      <Steps />
      <Questions />
      <Ask />
    </>
  )
}

// The top of the page is the present: a ribbon across it, a bow on the
// ribbon, faint snowflakes behind, ornaments along the bottom.
function Hero() {
  return (
    <section className="gift-snow overflow-hidden pb-4">
      <div className="relative h-24 md:h-28" aria-hidden="true">
        <div className="gift-ribbon absolute inset-x-0 top-8 h-4 shadow-sm md:top-10 md:h-5" />
        <Bow className="absolute left-1/2 top-1 w-32 -translate-x-1/2 drop-shadow-md md:top-0 md:w-40" />
      </div>
      <div className="mx-auto max-w-3xl px-4 pt-6 text-center md:pt-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-berry-600">{t.eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight text-berry-600 md:text-6xl">{t.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-700">{t.intro}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#estimate" data-bar-hide="" className={`${btn} bg-berry-600 text-white shadow-lg shadow-berry-600/25 hover:bg-berry-700`}>🎁 {t.cta}</a>
          <a href={business.phoneHref} className={`${btn} border-2 border-berry-600 text-berry-700 hover:bg-berry-50`}>
            <Icon name="phone" className="size-5" /> {t.call} {business.phone}
          </a>
        </div>
      </div>
      {/* Licensed stock (Vecteezy Pro, scripts/gift-art.mjs): decoration only, no gifts in it. */}
      <img src={holiday('ornaments-hats-800.webp')} srcSet={`${holiday('ornaments-hats-800.webp')} 800w, ${holiday('ornaments-hats.webp')} 1600w`}
        sizes="(min-width: 48rem) 48rem, 100vw" alt="" width="1600" height="588"
        className="mx-auto mt-10 block h-auto w-full max-w-3xl px-4 mix-blend-multiply md:mt-12" />
    </section>
  )
}

function Title({ children, className = '' }) {
  return (
    <h2 className={`flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight text-night-950 md:text-4xl ${className}`}>
      <Holly className="h-7 w-auto shrink-0 md:h-9" />
      <span>{children}</span>
    </h2>
  )
}

// The owner's own wrapping, once his photos are processed (content.js giftWrapping.photos).
function Photos() {
  return (
    <section className="px-4 py-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <Title>{t.photosTitle}</Title>
        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {t.photos.map((p) => (
            <li key={p.src} className="rounded-xl bg-white p-1.5 shadow-md ring-1 ring-berry-500/15">
              <img src={p.src} alt={p.alt} loading="lazy" className="aspect-[4/3] h-auto w-full rounded-lg object-cover" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Steps() {
  return (
    <section className="bg-berry-50 px-4 py-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <Title>{t.stepsTitle}</Title>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {t.steps.map(([title, body], i) => (
            <li key={title} className={`${panel} relative overflow-hidden p-6 pt-7`}>
              <div className="gift-ribbon absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
              <div className="mb-3 flex items-center gap-3">
                <img src={holiday(STEP_ICONS[i] ?? 'gift.svg')} alt="" width="56" height="56" className="size-14" loading="lazy" />
                <p className="inline-flex size-9 items-center justify-center rounded-full bg-berry-600 font-display text-lg font-extrabold text-white">{i + 1}</p>
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-slate-600">{body}</p>
            </li>
          ))}
        </ol>
        {t.details.length > 0 && (
          <>
            <h3 className="mt-12 font-display text-2xl font-bold">{t.detailsTitle}</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {t.details.map((d) => (
                <li key={d} className={`${panel} flex gap-3 px-5 py-4 text-slate-700`}>
                  <Icon name="check" className="mt-0.5 size-5 shrink-0 text-berry-600" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function Questions() {
  return (
    <section className="px-4 py-14 md:py-20">
      <div className="mx-auto max-w-3xl">
        <Title>{t.faqTitle}</Title>
        <div className={`${panel} mt-8 divide-y divide-berry-500/15`}>
          {t.faq.items.map(([q, a]) => (
            <details key={q} className="group px-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <Icon name="chevron" className="size-5 shrink-0 text-berry-600 motion-safe:transition group-open:rotate-180" />
              </summary>
              <p className="pb-5 text-slate-600"><Rich text={a} /></p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// The form, with Gift wrapping already picked. As on the home page, the form
// comes right after the heading on phones; Call / Text follow it.
function Ask() {
  return (
    <section id="estimate" className="relative bg-berry-50 px-4 py-14 md:py-20">
      <div className="gift-ribbon absolute inset-x-0 top-0 h-2" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <img src={holiday('wreath2.svg')} alt="" width="64" height="64" className="mb-4 size-16" loading="lazy" />
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-berry-600 md:text-5xl">{t.ask.title}</h2>
          <p className="mt-4 text-lg text-slate-700">{t.ask.intro}</p>
        </div>
        <div id="estimate-form" data-bar-hide="" className="scroll-mt-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <EstimateForm service="Gift wrapping" skin="snow" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:col-start-1 lg:row-start-2 lg:self-start">
          <a href={business.phoneHref} className={`${btn} bg-white text-berry-700 ring-1 ring-berry-500/30 hover:bg-berry-50`}>
            <Icon name="phone" className="size-5" /> Call {business.phone}
          </a>
          <a href={business.smsWith(t.form.text.sms)} className={`${btn} bg-white text-berry-700 ring-1 ring-berry-500/30 hover:bg-berry-50`}>
            <Icon name="chat" className="size-5" /> Text us
          </a>
        </div>
      </div>
    </section>
  )
}

// Drawn in the built HTML too, so nothing in it may mention gift wrapping.
function Footer() {
  return (
    <footer className="on-snow relative bg-white px-4 pb-28 pt-10 text-sm text-slate-600 lg:pb-10">
      <div className="candy-stripe absolute inset-x-0 top-0 h-2" aria-hidden="true" />
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2">
        <a href={base} className="inline-flex min-h-11 items-center hover:text-berry-700">← {business.name}</a>
        <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-2 font-semibold text-berry-700"><Icon name="phone" className="size-5" /> {business.phone}</a>
        {footerLinks.map((l) => <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center hover:text-berry-700">{l.label}</a>)}
      </div>
    </footer>
  )
}
