import { useEffect } from 'react'
import EstimateForm from '../components/EstimateForm'
import Header from '../components/Header'
import Icon from '../components/Icon'
import MobileCta from '../components/MobileCta'
import Rich from '../components/Rich'
import { business, footerLinks, giftWrapping as t } from '../data/content'
import { useGiftWrappingAnswer } from '../lib/giftWrapping'

// /gift-wrapping/ (docs/specs/gift-wrapping.md): the owner's second service
// on its own page. Owner 2026-10-15: "make the page look gift wrapped". The
// page is the present: pale wrapping paper, a satin ribbon across the top
// with one big bow, the same ribbon running down the middle behind the
// sections (white boxes, so it never covers words), the prices on a gift tag
// tied to it, holly tucked into it between boxes and ornaments hanging from
// the top ribbon. The ribbon, bows, holly and ornaments are the owner's
// Vecteezy Pro vectors (scripts/gift-art.mjs); no gift in them, every wrapped
// gift shown is his own photo.
//
// Behind the same switch as before: the built HTML is only the header, an
// empty main and the footer (no word of gift wrapping; scripts/prerender.mjs
// checks), the page asks the server, and draws everything only when the
// switch is on. Off (or no answer) sends the visitor to the home page.
const base = import.meta.env.BASE_URL
const decor = (f) => `${base}images/gift-wrap/decor/${f}`
// The satin ribbon: a thin slice of the stock band, repeated along it.
const ribbonX = { backgroundImage: `url(${decor('ribbon-x.webp')})`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x' }
const ribbonY = { backgroundImage: `url(${decor('ribbon-y.webp')})`, backgroundSize: '100% auto', backgroundRepeat: 'repeat-y' }
// The bow picture (bow-800.webp, 1082 × 1226 as cut): the band crosses it from
// 26.6 % to 48.6 % of its height (printed by scripts/gift-art.mjs), so with the
// page's ribbon --band tall the bow is --band / 0.22 tall and sits 26.6 % of
// that above the ribbon's top edge.
const BOW_H = 'calc(var(--band) / 0.22)'
const BAND_TOP = `calc(${BOW_H} * 0.266)`
// The logo with a red neon bow on the cottage's roof (owner 2026-10-15, this page only;
// our own drawing, scripts/gift-logo.mjs).
// Shown once the switch says on, so the built page's header is the site's own.
const BOW_LOGO = `${base}images/gift-wrap/logo-wide-bow.png`
const btn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-center font-semibold'
const title = 'font-display text-3xl font-extrabold tracking-tight md:text-4xl'

export default function GiftPage() {
  const on = useGiftWrappingAnswer() // null until the server answers
  useEffect(() => {
    if (on === false) window.location.replace(base)
    if (on) document.title = t.pageTitle
  }, [on])
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <Header home={false} estimate="#estimate" logo={on ? BOW_LOGO : undefined} />
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
    <div className="gift-snow relative overflow-hidden bg-berry-50 px-4 pb-16 pt-4 [--band:2.25rem] md:pb-24 md:[--band:3rem] lg:[--band:3.75rem]">
      {/* The ribbon down the middle: from the top ribbon (1rem of paper above the bow) to the last box, behind every box. */}
      <div className="absolute bottom-24 left-1/2 w-(--band) -translate-x-1/2 shadow-md md:bottom-32" style={{ top: `calc(1rem + ${BAND_TOP})`, ...ribbonY }} aria-hidden="true" />
      <Lid />
      <Box className="max-w-3xl px-5 pb-10 pt-12 text-center md:px-12 md:pb-14 md:pt-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-berry-600">{t.eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight text-berry-600 md:text-6xl">{t.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-700">{t.intro}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#estimate" data-bar-hide="" className={`${btn} bg-berry-600 text-white shadow-lg shadow-berry-600/25 hover:bg-berry-700`}>🎁 {t.cta}</a>
          <a href={business.phoneHref} className={`${btn} border-2 border-berry-600 text-berry-700 hover:bg-berry-50`}>
            <Icon name="phone" className="size-5" /> {t.call} {business.phone}
          </a>
        </div>
      </Box>
      <Tag />
      {t.photos.length > 0 && (
        <>
          <Tie holly="holly-right.webp" />
          <Photos />
        </>
      )}
      <Tie holly="holly-left.webp" />
      <Steps />
      <Tie holly="holly-right.webp" />
      <Questions />
      <Tie />
      <Ask />
    </div>
  )
}

// The top ribbon with the big bow on it and ornaments hanging from it:
// [file, where, width, how far below the ribbon's middle, from which screen width].
const BAUBLES = [
  ['bauble-stars.webp', 'left-[5%] md:left-[10%]', 'w-9 md:w-14', '0rem', ''],
  ['bauble-glitter.webp', 'right-[5%] md:right-[10%]', 'w-9 md:w-14', '0rem', ''],
  ['bauble-plain.webp', 'left-[24%]', 'w-11', '1.75rem', 'hidden lg:block'],
  ['bauble-plain.webp', 'right-[24%]', 'w-11', '1.75rem', 'hidden lg:block'],
]
function Lid() {
  return (
    <div className="relative -mx-4" style={{ height: `calc(${BOW_H} * 0.92)` }} aria-hidden="true">
      {BAUBLES.map(([file, where, width, drop, show]) => (
        <img key={where} src={decor(file)} alt="" width="160" height="268" className={`absolute h-auto ${where} ${width} ${show}`}
          style={{ top: `calc(${BAND_TOP} + var(--band) / 2 + ${drop})` }} />
      ))}
      <div className="absolute inset-x-0 h-(--band) shadow-md" style={{ top: BAND_TOP, ...ribbonX }} />
      <img src={decor('bow-480.webp')} srcSet={`${decor('bow-480.webp')} 480w, ${decor('bow-800.webp')} 800w`} sizes="(min-width: 64rem) 16rem, (min-width: 48rem) 13rem, 10rem"
        alt="" width="800" height="906" className="absolute left-1/2 top-0 z-10 w-auto max-w-none -translate-x-1/2 drop-shadow-lg" style={{ height: BOW_H }} />
    </div>
  )
}

// A section as a wrapped box: white, a ribbon round its top edge, lying over the ribbon down the page.
function Box({ id, className = '', children }) {
  return (
    <section id={id} className={`relative mx-auto w-full scroll-mt-20 rounded-lg bg-white shadow-[0_22px_45px_-24px_rgb(143_21_38/0.45)] ring-1 ring-berry-700/10 ${className}`}>
      <div className="absolute inset-x-0 top-0 h-2.5 rounded-t-lg" style={ribbonX} aria-hidden="true" />
      {children}
    </section>
  )
}

// Between two boxes, on the ribbon: a sprig of holly tucked into it (or just the ribbon).
function Tie({ holly }) {
  return (
    <div className="relative flex h-16 items-center justify-center md:h-24" aria-hidden="true">
      {holly && <img src={decor(holly)} alt="" width="240" height="240" loading="lazy" className="h-14 w-auto drop-shadow-md md:h-20" />}
    </div>
  )
}

// The prices on a gift tag, hung from a small bow on the ribbon.
const NOTCHED = 'polygon(1rem 0, calc(100% - 1rem) 0, 100% 1rem, 100% calc(100% - 1rem), calc(100% - 1rem) 100%, 1rem 100%, 0 calc(100% - 1rem), 0 1rem)'
function Tag() {
  const p = t.prices
  return (
    <>
      <div className="relative flex h-20 justify-center md:h-24" aria-hidden="true">
        <span className="absolute bottom-0 left-1/2 top-10 w-0.5 -translate-x-1/2 bg-berry-700/70" />
        <img src={decor('bow-small.webp')} alt="" width="240" height="191" loading="lazy" className="relative mt-3 h-auto w-24 drop-shadow md:w-28" />
      </div>
      <section aria-labelledby="prices" className="relative mx-auto w-full max-w-md drop-shadow-[0_14px_22px_rgb(143_21_38/0.25)]">
        <div className="bg-berry-600 p-1" style={{ clipPath: NOTCHED }}>
          <div className="relative bg-amber-50 px-6 pb-7 pt-12 md:px-9" style={{ clipPath: NOTCHED }}>
            <span className="absolute left-1/2 top-3 size-5 -translate-x-1/2 rounded-full bg-berry-50 ring-2 ring-berry-700/60" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-2.5 border border-berry-500/50" aria-hidden="true" />
            <h2 id="prices" className="text-center font-display text-3xl font-extrabold text-berry-600">{p.title}</h2>
            <p className="mt-2 text-center text-slate-700">{p.intro}</p>
            <dl className="mt-5 divide-y divide-dashed divide-berry-500/40">
              {p.rows.map((r) => (
                <div key={r.size} className="flex items-baseline justify-between gap-4 py-3">
                  <dt>
                    <span className="block font-semibold">{r.size}</span>
                    <span className="block text-sm text-slate-600">{r.examples}</span>
                  </dt>
                  <dd className="font-display text-2xl font-extrabold text-berry-600">{r.price}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-center text-sm text-slate-600">{p.note}</p>
          </div>
        </div>
      </section>
    </>
  )
}

// The owner's own wrapping, once his photos are processed (content.js giftWrapping.photos).
function Photos() {
  return (
    <Box className="max-w-5xl px-5 pb-8 pt-10 md:px-10 md:pb-12 md:pt-14">
      <h2 className={title}>{t.photosTitle}</h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {t.photos.map((p) => (
          <li key={p.src} className="rounded-md bg-white p-1.5 shadow-md ring-1 ring-berry-500/15">
            <img src={p.src} alt={p.alt} loading="lazy" className="aspect-[4/3] h-auto w-full rounded object-cover" />
          </li>
        ))}
      </ul>
    </Box>
  )
}

// A glossy red bead for each step's number, like a bauble.
const bead = 'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#ff8a96_0,#d7263d_38%,#8f1526_100%)] font-display text-lg font-extrabold text-white shadow-md'
function Steps() {
  return (
    <Box className="max-w-5xl px-5 pb-10 pt-10 md:px-10 md:pb-12 md:pt-14">
      <h2 className={title}>{t.stepsTitle}</h2>
      <ol className="mt-6 grid gap-6 md:grid-cols-3 md:gap-8">
        {t.steps.map(([step, body], i) => (
          <li key={step} className="flex gap-4 md:block">
            <span className={bead} aria-hidden="true">{i + 1}</span>
            <div className="md:mt-4">
              <h3 className="text-lg font-semibold">{step}</h3>
              <p className="mt-1.5 text-slate-600">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      {t.details.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-2xl font-bold">{t.detailsTitle}</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {t.details.map((d) => (
              <li key={d} className="flex gap-3 text-slate-700">
                <Icon name="check" className="mt-0.5 size-5 shrink-0 text-berry-600" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Box>
  )
}

function Questions() {
  return (
    <Box className="max-w-3xl px-5 pb-6 pt-10 md:px-10 md:pb-8 md:pt-14">
      <h2 className={title}>{t.faqTitle}</h2>
      <div className="mt-4 divide-y divide-berry-500/15">
        {t.faq.items.map(([q, a]) => (
          <details key={q} className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <Icon name="chevron" className="size-5 shrink-0 text-berry-600 motion-safe:transition group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-slate-600"><Rich text={a} /></p>
          </details>
        ))}
      </div>
    </Box>
  )
}

// The form, with Gift wrapping already picked. As on the home page, the form
// comes right after the heading on phones; Call / Text follow it.
function Ask() {
  return (
    <Box id="estimate" className="max-w-5xl px-5 pb-8 pt-10 md:px-10 md:pb-12 md:pt-14">
      <div className="grid gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-berry-600 md:text-5xl">{t.ask.title}</h2>
          <p className="mt-4 text-lg text-slate-700">{t.ask.intro}</p>
        </div>
        <div id="estimate-form" data-bar-hide="" className="scroll-mt-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <EstimateForm service="Gift wrapping" skin="snow" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:col-start-1 lg:row-start-2 lg:flex-col lg:items-start">
          <a href={business.phoneHref} className={`${btn} bg-white text-berry-700 ring-1 ring-berry-500/30 hover:bg-berry-50`}>
            <Icon name="phone" className="size-5" /> Call {business.phone}
          </a>
          <a href={business.smsWith(t.form.text.sms)} className={`${btn} bg-white text-berry-700 ring-1 ring-berry-500/30 hover:bg-berry-50`}>
            <Icon name="chat" className="size-5" /> Text us
          </a>
          <img src={decor('holly-right.webp')} alt="" width="240" height="222" loading="lazy" className="mt-6 hidden h-28 w-auto drop-shadow-md lg:block" />
        </div>
      </div>
    </Box>
  )
}

// Drawn in the built HTML too, so nothing in it may mention gift wrapping.
function Footer() {
  return (
    <footer className="on-snow border-t border-berry-500/20 bg-white px-4 pb-28 pt-8 text-sm text-slate-600 lg:pb-10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2">
        <a href={base} className="inline-flex min-h-11 items-center hover:text-berry-700">← {business.name}</a>
        <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-2 font-semibold text-berry-700"><Icon name="phone" className="size-5" /> {business.phone}</a>
        {footerLinks.map((l) => <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center hover:text-berry-700">{l.label}</a>)}
      </div>
    </footer>
  )
}
