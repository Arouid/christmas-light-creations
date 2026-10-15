import { useEffect } from 'react'
import EstimateForm from '../components/EstimateForm'
import Header from '../components/Header'
import Icon from '../components/Icon'
import MobileCta from '../components/MobileCta'
import Rich from '../components/Rich'
import { business, footerLinks, giftWrapping as t } from '../data/content'
import { creamX, goldX, ribbonX, ribbonY } from '../lib/giftRibbon'
import { useGiftWrappingAnswer } from '../lib/giftWrapping'

// /gift-wrapping/ (docs/specs/gift-wrapping.md): the owner's second service
// on its own page. Owner 2026-10-15: "make the page look gift wrapped". The
// page is the present: pale wrapping paper, an evergreen ribbon across the top
// with his own big bow, the same ribbon running down the middle behind the
// sections (white boxes, so it never covers words), the prices on a gift tag
// tied to it with Santa and an elf strolling on top and candy canes between
// them, Santa's sleigh flying over the top ribbon, ornaments hanging from the
// top ribbon, the "Wrapped by us" box as a present of its own, the questions
// box as another (white satin bow and ribbon, a garland of lights along its
// foot) and a pine garland along the foot of the page. The pictures are his
// Vecteezy Pro PNGs (scripts/gift-bows.mjs) and the ribbons are CSS
// (lib/giftRibbon.js); no wrapped gift in any of them: every wrapped gift
// shown is his own photo.
//
// Behind the same switch as before: the built HTML is only the header, an
// empty main and the footer (no word of gift wrapping; scripts/prerender.mjs
// checks), the page asks the server, and draws everything only when the
// switch is on. Off (or no answer) sends the visitor to the home page.
const base = import.meta.env.BASE_URL
const decor = (f) => `${base}images/gift-wrap/decor/${f}`
// The big bow on the top ribbon (bow-top, 480 × 555: the owner's own pick, top-bow.png, a red bow
// with gold edges and stars and holly on top; scripts/gift-bows.mjs): its knot is 50 % across and
// 45 % down. It is 5.2 ribbons wide, and the ribbon runs through its knot: the ribbon's top edge
// sits at the knot's height less half the ribbon.
const BOW_W = 'calc(var(--band) * 5.2)'
const BOW_H = `calc(${BOW_W} * 1.156)`
const BAND_TOP = `calc(${BOW_H} * 0.45 - var(--band) / 2)`
// The logo with a red neon bow on the cottage's roof (owner 2026-10-15, this page only;
// our own drawing, scripts/gift-logo.mjs).
// Shown once the switch says on, so the built page's header is the site's own.
const BOW_LOGO = `${base}images/gift-wrap/logo-wide-bow.png`
const btn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-center font-semibold'
// Every heading in the same red (owner 2026-10-15: "every heaading should have the same red colored font").
const title = 'font-display text-3xl font-extrabold tracking-tight text-berry-600 md:text-4xl'

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
          <Tie tall />
          <Photos />
        </>
      )}
      <Tie chimney />
      <Steps />
      <Tie />
      <Questions />
      <Tie garland />
      <Ask />
      {/* A pine garland with ornaments and pinecones along the foot of the page. */}
      <img src={decor('garland-700.webp')} srcSet={`${decor('garland-700.webp')} 700w, ${decor('garland-1100.webp')} 1100w`} sizes="(min-width: 64rem) 64rem, 100vw"
        alt="" width="700" height="200" loading="lazy" className="relative mx-auto mt-10 block h-auto w-full max-w-5xl drop-shadow-md" aria-hidden="true" />
    </div>
  )
}

// The top ribbon with the big bow on it and ornaments hanging from it:
// [file, where, width, how far below the ribbon's middle, from which screen width].
// The owner's red-and-gold ornaments (scripts/gift-bows.mjs), on thin gold strings of different
// lengths: two on phones (beside the bow, above the heading), four from 768 px.
const ORNAMENTS = [
  ['ornament-striped.webp', 'left-[5%] md:left-[9%]', 'w-10 md:w-14', '0.75rem', ''],
  ['ornament-ornate.webp', 'right-[5%] md:right-[9%]', 'w-11 md:w-16', '1.75rem', ''],
  ['ornament-gold.webp', 'left-[22%]', 'w-12', '2.75rem', 'hidden md:flex'],
  ['ornament-striped.webp', 'right-[23%]', 'w-11', '3.5rem', 'hidden md:flex'],
]
function Lid() {
  return (
    <div className="relative -mx-4" style={{ height: `calc(${BOW_H} * 0.95)` }} aria-hidden="true">
      {ORNAMENTS.map(([file, where, width, drop, show]) => (
        <div key={where} className={`absolute flex-col items-center ${show || 'flex'} ${where}`} style={{ top: `calc(${BAND_TOP} + var(--band) / 2)` }}>
          <span className="w-0.5 bg-gradient-to-b from-[#b98a2f] to-[#f0d27a]" style={{ height: drop }} />
          <img src={decor(file)} alt="" width="200" height="248" className={`h-auto ${width}`} />
        </div>
      ))}
      {/* Santa's sleigh flying over the top ribbon, left of the bow, clear of the heading (owner 2026-10-15); .fly in index.css. */}
      <img src={decor('sleigh.webp')} alt="" width="520" height="220" className="fly absolute left-[2%] top-1 h-auto w-20 md:left-[4%] md:top-2 md:w-44 lg:left-[7%] lg:w-60 xl:left-[12%]" />
      <div className="absolute inset-x-0 h-(--band) shadow-md" style={{ top: BAND_TOP, ...ribbonX }} />
      <img src={decor('bow-top-480.webp')} srcSet={`${decor('bow-top-480.webp')} 480w, ${decor('bow-top-720.webp')} 720w`}
        sizes="(min-width: 64rem) 20rem, (min-width: 48rem) 16rem, 12rem" alt="" width="480" height="555"
        className="absolute left-1/2 top-0 z-10 h-auto max-w-none -translate-x-1/2 drop-shadow-lg" style={{ width: BOW_W }} />
    </div>
  )
}

// A section as a wrapped box: white (or a paper class from index.css), a ribbon round its top edge
// (evergreen, or another band), a faint outline (or another), lying over the ribbon down the page.
function Box({ id, className = '', paper = 'bg-white', band = ribbonX, edge = 'ring-1 ring-berry-700/10', children }) {
  return (
    <section id={id} className={`relative mx-auto w-full scroll-mt-20 rounded-lg ${paper} shadow-[0_22px_45px_-24px_rgb(143_21_38/0.45)] ${edge} ${className}`}>
      <div className="absolute inset-x-0 top-0 h-2.5 rounded-t-lg" style={band} aria-hidden="true" />
      {children}
    </section>
  )
}

// Between two boxes, just the ribbon (tall: room for the bow and the elf rising over it on the box
// below), or Santa diving into a snowy chimney that stands on the top edge of the box below, on the
// ribbon (owner 2026-10-15: where the holly was, "get rid of it"; "put the santa falling in the
// chimney on there", after a North Pole sign and a red-nosed reindeer; "scoot him to the right": just
// right of the ribbon; "take the drop shadopw off the santa": no shadows), and an elf poking out
// from behind the ribbon on its left ("take rudolph away and use that elf poking his head out from
// behind the ribbon"): his picture ends in a straight cut down his right side (85 % across), which
// lies under a piece of the same ribbon drawn over him (it matches the page's ribbon beneath exactly). They sit
// at z 3: over the box above (whose ribbon, bow and photos are z 1-2) and under the box below
// (Steps is z 4), so their feet tuck just behind that edge.
function Tie({ tall, chimney, garland }) {
  // Hung along the questions box's foot (owner 2026-10-15, his mockup: "garland on the bottom. takes 3
  // seperate pieces, even it up so it looks natural"; the mistletoe in it came out: "take it out"):
  // the same pine swag three times ("shirnk the garland down to fit 3 pieces"), its outer ends lined up
  // with the box's edges ("line up the outer edge of the garland with inner edge of the questions
  // answered div"): a third of the box's width each, edge to edge, the middle one mirrored. The light
  // string runs to both edges of the picture (17 % down on the left, 19 % on the right), so with the
  // middle one turned round each join meets string to string at the same height and peaks like a
  // garland hung on hooks ("where i circled they need to be lined up better"). Raised a little over
  // the box's foot ("raise them up just a little"); in front of both boxes (z 5).
  if (garland) {
    const swag = { src: decor('garland-swag-420.webp'), srcSet: `${decor('garland-swag-420.webp')} 420w, ${decor('garland-swag-840.webp')} 840w`, sizes: '(min-width: 48rem) 16rem, 34vw', width: 420, height: 194, alt: '', loading: 'lazy' }
    return (
      <div className="relative h-16 md:h-24" aria-hidden="true">
        <div className="pointer-events-none relative z-[5] mx-auto h-full max-w-3xl">
          <img {...swag} className="absolute left-0 -top-5 h-auto w-1/3 max-w-none md:-top-8" />
          <img {...swag} className="absolute left-1/3 -top-5 h-auto w-1/3 max-w-none -scale-x-100 md:-top-8" />
          <img {...swag} className="absolute right-0 -top-5 h-auto w-1/3 max-w-none md:-top-8" />
        </div>
      </div>
    )
  }
  if (chimney) {
    return (
      <div className="relative h-28 md:h-44" aria-hidden="true">
        <img src={decor('elf-peeking.webp')} alt="" width="240" height="449" loading="lazy"
          className="pointer-events-none absolute -bottom-0.5 right-[calc(50%+var(--band)*0.15)] z-[3] h-28 w-auto max-w-none md:h-44" />
        <div className="absolute inset-y-0 left-1/2 z-[3] w-(--band) -translate-x-1/2" style={ribbonY} />
        <div className="absolute -bottom-0.5 left-[calc(50%+var(--band)/2+1rem)]">
          <img src={decor('santa-chimney.webp')} alt="" width="400" height="363" loading="lazy"
            className="pointer-events-none relative z-[3] block h-28 w-auto max-w-none md:h-40" />
        </div>
      </div>
    )
  }
  return <div className={tall ? 'h-24 md:h-40' : 'h-16 md:h-24'} aria-hidden="true" />
}

// The prices on a gift tag, tied to the ribbon by a gold cord through a brass eyelet.
const EYELET = 'radial-gradient(circle at 35% 30%, #fff4c9, #e3bf5c 30%, #a87a22 62%, #6e4d12)'
const NOTCHED = 'polygon(1rem 0, calc(100% - 1rem) 0, 100% 1rem, 100% calc(100% - 1rem), calc(100% - 1rem) 100%, 1rem 100%, 0 calc(100% - 1rem), 0 1rem)'
function Tag() {
  const p = t.prices
  return (
    <>
      {/* Room above the tag for the candy canes. The ribbon's gold middle line runs down behind them
          and, just above the tag, becomes the cord's loop: one strand in front of the tag, one behind. */}
      <div className="relative h-40 md:h-52" aria-hidden="true">
        <svg viewBox="0 0 40 24" width="40" height="24" className="absolute bottom-0 left-1/2 -translate-x-1/2 overflow-visible" fill="none" strokeLinecap="round">
          <path d="M20 0 C21 8 24 15 24.5 24" stroke="#9c7426" strokeWidth="1.8" />
          <path d="M20 0 C19 8 15.5 15 15 24" stroke="#d9b456" strokeWidth="2" />
          <path d="M19.6 0 C18.6 8 15.1 15 14.6 24" stroke="#f6e3a1" strokeWidth="0.7" />
        </svg>
      </div>
      <section aria-labelledby="prices" className="relative mx-auto w-full max-w-md drop-shadow-[0_14px_22px_rgb(143_21_38/0.25)] [--fh:8rem] md:[--fh:10rem]">
        {/* Crossed candy canes with a red-and-green bow standing between Santa and the elf, taller than
            them, their feet just behind the tag's top edge (owner 2026-10-15, his mockup: "put that
            candy cane inbetween them at that suze"). */}
        <img src={decor('candy-canes.webp')} alt="" width="440" height="463" loading="lazy" className="pointer-events-none absolute bottom-[calc(100%-8px)] left-1/2 h-40 w-auto -translate-x-1/2 drop-shadow-md md:h-52" />
        {/* Santa and the elf standing on the tag's top edge (owner 2026-10-15: "adjust the two elfs and
            maybe a small drop shadow or something to bring out the illusion"): the front sole on the
            edge, a soft contact shadow under both feet (the back foot stands a little higher, as in their
            3D pose), a faint shadow of their own, and a sway that keeps their feet down (.stroll in
            index.css). Feet: Santa's 17–99 % across his picture, the elf's 4–74 %. */}
        <span className="pointer-events-none absolute z-[1] h-[calc(var(--fh)*0.055+3px)] w-[calc(var(--fh)*0.29)] -translate-x-1/2 rounded-full bg-black/30 blur-[2px]"
          style={{ left: 'calc(10% + var(--fh) * 0.1755)', top: 'calc(var(--fh) * -0.055)' }} aria-hidden="true" />
        <span className="pointer-events-none absolute z-[1] h-[calc(var(--fh)*0.055+3px)] w-[calc(var(--fh)*0.27)] -translate-x-1/2 rounded-full bg-black/30 blur-[2px]"
          style={{ left: 'calc(90% - var(--fh) * 0.1921)', top: 'calc(var(--fh) * -0.055)' }} aria-hidden="true" />
        <img src={decor('santa.webp')} alt="" width="121" height="400" loading="lazy" className="stroll pointer-events-none absolute bottom-[calc(100%-1px)] left-[10%] z-[2] h-(--fh) w-auto drop-shadow-[0_2px_2px_rgb(60_10_20/0.3)]" />
        <img src={decor('elf.webp')} alt="" width="126" height="400" loading="lazy" className="stroll stroll-late pointer-events-none absolute bottom-[calc(100%-1px)] right-[10%] z-[2] h-(--fh) w-auto drop-shadow-[0_2px_2px_rgb(60_10_20/0.3)]" />
        {/* The cord's front strand, from the top edge down into the hole, with its shadow on the tag. */}
        <svg viewBox="0 0 40 28" width="40" height="28" className="pointer-events-none absolute left-1/2 top-0 z-[1] -translate-x-1/2 overflow-visible" fill="none" strokeLinecap="round" aria-hidden="true">
          <path d="M15 0 C15 10 17.5 19 20 26" stroke="rgb(90 30 15 / 0.28)" strokeWidth="2.4" transform="translate(1.2 1.6)" />
          <path d="M15 0 C15 10 17.5 19 20 26" stroke="#d9b456" strokeWidth="2" />
          <path d="M14.6 0 C14.6 10 17.1 19 19.6 26" stroke="#f6e3a1" strokeWidth="0.7" />
        </svg>
        <div className="bg-berry-600 p-1" style={{ clipPath: NOTCHED }}>
          <div className="relative bg-amber-50 px-6 pb-7 pt-12 md:px-9" style={{ clipPath: NOTCHED }}>
            {/* A brass eyelet round the hole (owner 2026-10-15, "try A"); through it the evergreen ribbon
                behind the tag shows, gold middle line and all ("bring the green ribbon down too so its
                behind the hole some"). */}
            <span className="absolute left-1/2 top-[11px] size-[22px] -translate-x-1/2 rounded-full shadow-[0_1px_2px_rgb(60_20_10/0.45)]" style={{ background: EYELET }} aria-hidden="true">
              <span className="absolute inset-[5px] rounded-full shadow-[inset_0_1px_3px_rgb(0_0_0/0.6)]" style={{ ...ribbonY, backgroundSize: 'var(--band) 100%', backgroundPosition: 'center' }} />
            </span>
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

// The owner's own wrapping (content.js giftWrapping.photos, made by scripts/gift-photos.mjs).
// The "Wrapped by us" box as a present of its own (owner 2026-10-15): green-and-white gingham paper
// (.paper-gingham-green in index.css, "how about a green and whitee gingham pattern") with a gold
// edge, a baby-pink satin ribbon down its front and the big pink gingham watercolor bow of step 3
// sitting on top of the box, its knot on the top edge, as a present seen from the front ("try the
// pink bows", "have the tails go behind the picture", "how can we make it so it doesnt look so
// pasted", "the illusion fallas apart unless we raise the bow up"). Ribbon and bow lie under the
// title and photos (z 1 against 2), so the tails tuck behind them. --x is how far below the top edge
// the knot is, --rib the ribbon's width, --bw the bow's width; the bow's knot is 50 % across and 33 %
// down (720 × 519), so its top is --x less 0.238 × --bw (its loops rise above the box). Under 1024 px
// the title sits centred below the bow; from 1024 px it sits left, beside it.
const BIG_BOW = { src: 'bow-pink-gingham-big.webp', width: 720, height: 519 }
function Photos() {
  const pinkSatin = satin('#e3a3bd', '#f3c4d6', '#fde6ef') // baby pink, to match the bow
  return (
    <Box paper="paper-gingham-green" band={goldX} className="max-w-5xl px-5 pb-8 pt-10 [--bw:11rem] [--rib:1.375rem] [--x:0.375rem] md:px-10 md:pb-12 md:pt-14 md:[--bw:13rem] lg:[--bw:19rem] lg:[--rib:2rem]">
      <div className="absolute inset-y-0 left-1/2 z-[1] w-(--rib) -translate-x-1/2 shadow-[0_0_4px_rgb(0_0_0/0.2)]" style={{ backgroundImage: pinkSatin.down }} aria-hidden="true" />
      {/* The bow's soft shadow on the paper (owner 2026-10-15: "add a fuzz of drop shadow on to the
          green from the bow too"): the same bow, darkened and blurred, a little lower and to the right,
          kept inside the box so it falls only on the box. */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-lg" aria-hidden="true">
        <img src={decor(BIG_BOW.src)} alt="" width={BIG_BOW.width} height={BIG_BOW.height} loading="lazy"
          className="absolute left-[calc(50%+5px)] top-[calc(var(--x)-var(--bw)*0.238+14px)] h-auto w-(--bw) max-w-none -translate-x-1/2 opacity-35 blur-[7px] brightness-0" />
      </div>
      {/* One cheerful elf popping up from behind the bow, waving with a candy cane (owner 2026-10-15:
          "maybe we can have a characters popping their head up from behind the pink bow", then "I wanna
          try some other", "preferably just 1 of whatever it is"). Half the bow's width (480 × 523), his
          waist just below the knot so the bow hides where the picture ends; before the bow, so the bow
          lies over him. */}
      <img src={decor('elf-waving.webp')} alt="" width="480" height="523" loading="lazy" aria-hidden="true"
        className="pointer-events-none absolute left-[calc(50%-var(--bw)*0.025)] top-[calc(var(--x)-var(--bw)*0.495)] z-[1] h-auto w-[calc(var(--bw)*0.5)] max-w-none -translate-x-1/2 drop-shadow-[0_3px_4px_rgb(60_10_30/0.3)]" />
      <img src={decor(BIG_BOW.src)} alt="" width={BIG_BOW.width} height={BIG_BOW.height} loading="lazy" aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[calc(var(--x)-var(--bw)*0.238)] z-[1] h-auto w-(--bw) max-w-none -translate-x-1/2 drop-shadow-[0_8px_10px_rgb(90_20_50/0.35)]" />
      <div className="relative z-[2] mt-7 text-center md:mt-6 lg:mt-0 lg:text-left">
        <h2 className={`${title} inline-block rounded-md bg-[#fbf7e9] px-3 py-1 shadow-md ring-1 ring-black/5`}>{t.photosTitle}</h2>
      </div>
      <ul className="relative z-[2] mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {t.photos.map((p) => (
          <li key={p.src} className="rounded-md bg-white p-1.5 shadow-md ring-1 ring-berry-500/15">
            <img src={p.src} alt={p.alt} loading="lazy" className={`aspect-[4/3] h-auto w-full rounded object-cover ${p.tall ? 'object-[50%_35%]' : ''}`} />
          </li>
        ))}
      </ul>
    </Box>
  )
}

// Each step a small wrapped present (owner 2026-10-15: his markup, then "the boxes could even have
// their own ... backgrouns that resemble wrapping paper", "colors can change", "can we use css to
// draw some patterened background into the gift divs?", "pick new bows for all 3 gifts"): each box
// in its own CSS paper (classes in src/index.css), a watercolor bow from his Vecteezy PNGs
// (scripts/gift-bows.mjs; the three read as one set), a ribbon in the bow's own colour, the words
// on a white label so they stay easy to read, and the step's number on the bow's knot.
// A bow's knot is where it sits, as a share of the picture. The bow is placed so its knot sits on
// the middle of the 12 px ribbon (top at --p + 6px − knot height share × height ÷ width × --w) and
// moved left by the knot's share of its width, so the knot (not the picture) is centred. --p
// leaves room above for the tallest bow above its knot (0.277 × --w), the box's top padding for
// the longest below it (0.534 × --w).
const BOWS = {
  greenPlaid: { src: 'bow-green-plaid.webp', width: 360, height: 283, knot: [0.495, 0.32] },
  red: { src: 'bow-red-watercolor.webp', width: 360, height: 289, knot: [0.495, 0.345] },
  pinkGingham: { src: 'bow-pink-gingham.webp', width: 360, height: 259, knot: [0.5, 0.33] },
}
// A soft satin ribbon in the bow's colours: dark edges, a light middle (across, and down).
// The number sits on a round knot of the same ribbon, so it reads even on the watercolour bows'
// small knots (white on green and red, dark red on pink: 4:1 or better for bold large text).
const satin = (dark, mid, light) => ({
  across: `linear-gradient(to bottom, ${dark}, ${mid} 25%, ${light} 50%, ${mid} 75%, ${dark})`,
  down: `linear-gradient(to right, ${dark}, ${mid} 25%, ${light} 50%, ${mid} 75%, ${dark})`,
  knot: `radial-gradient(circle at 35% 30%, ${light}, ${mid} 55%, ${dark})`,
})
const PRESENTS = [
  { paper: 'paper-buffalo', bow: 'greenPlaid', ribbon: satin('#2f5e1d', '#4a8a2c', '#7cb55a') }, // red-and-black buffalo check, green plaid bow
  { paper: 'paper-gold-snow', bow: 'red', ribbon: satin('#a3261c', '#d63a2c', '#f0705a') }, // gold with snowflakes, red bow
  { paper: 'paper-polka', bow: 'pinkGingham', ribbon: satin('#d9789f', '#ee9fbf', '#fbd0e1'), darkNumber: true }, // white with red dots, pink gingham bow
]
const pct = (n) => `${n * 100}%`
// Room above the label for the bow's lower half, and the ribbon's top piece.
const ROOM = 'calc(var(--w) * 0.54 + 0.25rem)'
const lightNumber = 'text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]'
const darkNumber = 'text-berry-700'
function Steps() {
  return (
    <Box className="z-[4] max-w-5xl px-5 pb-10 pt-10 md:px-10 md:pb-12 md:pt-14">
      <h2 className={title}>{t.stepsTitle}</h2>
      <ol className="mt-4 grid gap-5 md:grid-cols-3 md:gap-6">
        {t.steps.map(([step, body], i) => {
          const look = PRESENTS[i % PRESENTS.length]
          const bow = BOWS[look.bow]
          const [kx, ky] = bow.knot
          return (
            <li key={step} className="relative min-w-0 pt-(--p) [--p:1.5rem] [--w:6.5rem] md:[--p:1.75rem] md:[--w:7.5rem]">
              <div className={`${look.paper} relative flex h-full flex-col overflow-hidden rounded-xl px-3 pb-3 shadow-[0_14px_30px_-16px_rgb(60_10_20/0.6)] ring-1 ring-black/10`}
                style={{ paddingTop: ROOM }}>
                {/* The ribbon round the box: along the top, and down the middle above and below the label. */}
                <div className="absolute inset-x-0 top-0 h-3" style={{ backgroundImage: look.ribbon.across }} aria-hidden="true" />
                <div className="absolute left-1/2 top-0 w-3 -translate-x-1/2" style={{ backgroundImage: look.ribbon.down, height: ROOM }} aria-hidden="true" />
                <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2" style={{ backgroundImage: look.ribbon.down }} aria-hidden="true" />
                <div className="relative flex-1 rounded-lg bg-white/[0.94] px-4 py-4 shadow-md">
                  <h3 className="text-lg font-semibold text-berry-600">{step}</h3>
                  <p className="mt-1.5 text-slate-600">{body}</p>
                </div>
              </div>
              <div className="absolute left-1/2 w-(--w)" aria-hidden="true"
                style={{ top: `calc(var(--p) + 6px - var(--w) * ${ky * bow.height / bow.width})`, transform: `translateX(-${pct(kx)})` }}>
                <img src={decor(bow.src)} alt="" width={bow.width} height={bow.height} loading="lazy" className="h-auto w-full drop-shadow-[0_4px_5px_rgb(0_0_0/0.3)]" />
                <span className={`absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-lg font-extrabold leading-none shadow-md ring-2 ring-white/80 md:size-9 md:text-xl ${look.darkNumber ? darkNumber : lightNumber}`}
                  style={{ left: pct(kx), top: pct(ky), backgroundImage: look.ribbon.knot }}>{i + 1}</span>
              </div>
            </li>
          )
        })}
      </ol>
      {t.details.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-2xl font-bold text-berry-600">{t.detailsTitle}</h3>
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

// White satin with deep forest-green edges, shaded across the ribbon ('bottom' for a band across the
// box, 'right' for one down it).
const whiteRibbon = (to) => `linear-gradient(to ${to}, #0f3b24 0 3px, #e4e8e3 3px, #ffffff 40%, #f2f4f1 60%, #d6dbd5 calc(100% - 3px), #0f3b24 calc(100% - 3px))`
function Questions() {
  return (
    // Green paper with white polka dots (.paper-polka-green; owner 2026-10-15: "polkadot", "not golfballs
    // tho", after kraft paper with foil trees, red-and-green plaid, a dark tartan and golf balls), the
    // title on a cream label and the questions on a white panel so the paper never runs behind words;
    // its outline in the ribbon's evergreen ("make the red outline green on that card") and a plain
    // cream edge along its top ("make that small green strip cream coplored").
    <Box paper="paper-polka-green" band={creamX} edge="ring-2 ring-[#1b5e3b]" className="max-w-3xl px-5 pb-8 pt-10 [--kx:2.75rem] [--ky:2rem] [--wb:7rem] md:px-10 md:pb-10 md:pt-14 [--rib:1.75rem] md:[--kx:3.25rem] md:[--ky:2.75rem] md:[--wb:13.5rem] md:[--rib:2.5rem] lg:[--ky:4.25rem] lg:[--wb:21rem]">
      {/* White satin ribbon with deep forest-green edges tied round the box ("then add some white ribbon
          with deep forest green edges", "make it wider"), crossing under the bow's knot: one band across the box, one down
          it, under the title's label and the questions' panel. */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--ky)-var(--rib)/2)] h-(--rib) shadow-[0_2px_4px_rgb(0_0_0/0.25)]" style={{ backgroundImage: whiteRibbon('bottom') }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 left-[calc(var(--kx)-var(--rib)/2)] w-(--rib) shadow-[2px_0_4px_rgb(0_0_0/0.25)]" style={{ backgroundImage: whiteRibbon('right') }} aria-hidden="true" />
      {/* A big glossy white satin bow on its top left corner, tilted, reaching a little past the edges
          (owner 2026-10-15, his mockup: "im feeling 3", "the third one I sent you"; the corner ribbon
          came off: "remove the red ribbon"). Its knot (52 % across, 31 % down, 480 × 470) sits at --kx,
          --ky from the corner. It lies over the title's label ("over the headline though", z 1) but under
          the questions' panel (z 2), so its tails tuck under it and never cover a question ("tails
          under the inside div"). From 1024 px it is as big as in his mockup, hanging well past the box's
          left edge. */}
      <img src={decor('bow-white-satin.webp')} alt="" width="480" height="470" loading="lazy" aria-hidden="true"
        className="pointer-events-none absolute left-[calc(var(--kx)-var(--wb)*0.52)] top-[calc(var(--ky)-var(--wb)*0.304)] z-[1] h-auto w-(--wb) max-w-none -rotate-12 drop-shadow-[2px_5px_5px_rgb(20_50_20/0.4)]" />
      <h2 className={`${title} relative ml-24 inline-block rounded-md bg-[#fbf7e9] px-3 py-1 shadow-md ring-1 ring-black/5 md:ml-32 lg:ml-36`}>{t.faqTitle}</h2>
      {/* The questions' panel, no border (owner 2026-10-15: deep green, then light mint, then "remove the
          border alltogetherr"). */}
      <div className="relative z-[2] mt-4 divide-y divide-berry-500/15 rounded-lg bg-white px-4 shadow-md md:mt-8 md:px-6">
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
