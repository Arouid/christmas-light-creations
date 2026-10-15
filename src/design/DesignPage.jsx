import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { business, designPage as t, footerLinks } from '../data/content'
import { newDesign } from '../designer/model.js'
import { SAVED_KEYS, attachmentProblem, savedDesign } from '../lib/publicDesign'
import { useToday } from '../lib/prerendered'
import { scrollMotion } from '../lib/motion.js'
import EstimateForm from '../components/EstimateForm'
import Header from '../components/Header'
import Icon from '../components/Icon'
import MobileCta from '../components/MobileCta'
import SkipLink from '../components/SkipLink'
import { SAMPLE_PHOTO, SAMPLE_PICTURE, sampleDesign } from './sampleDesign'

// /design/: homeowners try our light designer on a sample house or a photo of
// their own home (simple mode: no prices, feet or measuring), then ask for an
// estimate with the design attached (docs/specs/public-designer.md).
// Fast on phones: until the visitor changes something, the sample is a
// ready-made picture; the designer and the drawing code load only when needed.
const Designer = lazy(() => import('../designer/Designer.jsx'))
const drawing = () => import('./photo.js')
// Every picture that leaves the page carries our mark (spec: "Watermark and terms").
const stamp = (ctx, w, h) => drawing().then((m) => m.stamp(ctx, w, h))
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-glow-400 px-6 py-3 font-semibold text-night-950 shadow-[0_0_28px_-6px] shadow-glow-400 hover:bg-glow-300 disabled:opacity-60'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/5 disabled:opacity-60'
const store = (key, value) => { try { sessionStorage.setItem(key, value) } catch { /* full or blocked: only a reload would lose it */ } }

export default function DesignPage() {
  const [start] = useState(sampleDesign) // the sample as the page opens
  const [photo, setPhoto] = useState(SAMPLE_PHOTO) // { src, width, height, sample? }
  const [design, setDesign] = useState(start)
  const [draw, setDraw] = useState(null) // ./photo.js, once loaded
  const [img, setImg] = useState(null)
  const [open, setOpen] = useState(false)
  const [problem, setProblem] = useState('')
  const [portrait, setPortrait] = useState(false)
  const [fresh, setFresh] = useState(false) // a photo just picked: the designer shows the portrait tip once
  const [confirmNew, setConfirmNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const canvas = useRef(null)
  const file = useRef(null)
  const openButton = useRef(null)
  const today = useToday()
  const untouched = photo.sample && design === start // shown as SAMPLE_PICTURE, nothing to draw

  // A design from earlier in this tab (a reload, or Back then Forward) opens
  // instead of the sample. After React has taken the built page over, so the
  // first draw still matches the HTML.
  useEffect(() => {
    let kept = null
    try { kept = savedDesign(sessionStorage.getItem(SAVED_KEYS.photo), sessionStorage.getItem(SAVED_KEYS.design)) } catch { /* storage blocked */ }
    if (!kept) return
    const id = requestAnimationFrame(() => {
      setPhoto(kept.photo === 'sample' ? SAMPLE_PHOTO : { src: kept.photo, width: kept.design.photo.width, height: kept.design.photo.height })
      setPortrait(kept.portrait)
      setDesign(kept.design)
    })
    return () => cancelAnimationFrame(id)
  }, [])
  // …and is kept as it changes, including while the designer is open (keep,
  // its onChange). Their own photo is written once, when it changes.
  const keep = useCallback((d) => {
    if (photo.sample) store(SAVED_KEYS.photo, 'sample')
    store(SAVED_KEYS.design, JSON.stringify({ v: 1, design: d, portrait }))
  }, [photo.sample, portrait])
  useEffect(() => { if (!untouched && !photo.sample) store(SAVED_KEYS.photo, photo.src) }, [photo, untouched])
  useEffect(() => { if (!untouched) keep(design) }, [design, untouched, keep])

  useEffect(() => {
    if (untouched) return
    let live = true
    drawing()
      .then(async (m) => { const [i] = await Promise.all([m.loadImage(photo.src), m.loadBrand()]); if (live) { setDraw(m); setImg(i) } })
      .catch(() => live && setProblem(t.errors.unreadable))
    return () => { live = false }
  }, [photo.src, untouched])
  useEffect(() => { if (draw && img && canvas.current) draw.renderDesign(canvas.current.getContext('2d'), design, img) }, [draw, img, design])
  // The finished picture: the thumbnail on the form and what's sent with it
  // (the untouched sample's is drawn only when it's sent).
  const picture = useMemo(() => (draw && img && !open && !untouched ? draw.finishedPicture(design, img) : null), [draw, img, design, open, untouched])
  const preview = untouched ? SAMPLE_PICTURE : picture

  async function pick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setProblem('')
    try {
      const p = await (await drawing()).standardPhoto(f)
      setImg(null)
      setPhoto(p)
      setPortrait(p.portrait)
      setFresh(true)
      setDesign(newDesign({ width: p.width, height: p.height, name: 'My home' }))
      setOpen(true)
    } catch (err) {
      setProblem(t.errors[err.message] ?? t.errors.unreadable)
    } finally {
      setBusy(false)
    }
  }
  // A new photo starts a new design: ask first when theirs has lights on it.
  const lit = !photo.sample && (design.strands.length > 0 || design.decorations.length > 0)
  const choosePhoto = () => { if (lit) setConfirmNew(true); else file.current?.click() }
  const toForm = () => document.getElementById('estimate')?.scrollIntoView({ behavior: scrollMotion(), block: 'start' })
  const closed = (d) => { if (d) setDesign(d); setFresh(false); setOpen(false) }
  // The page is inert while the designer is open, which drops keyboard focus;
  // it comes back to Open the designer / Keep designing when it closes.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) openButton.current?.focus({ preventScroll: true })
    wasOpen.current = open
  }, [open])

  const attachment = preview && {
    preview,
    sample: untouched,
    get: async () => {
      let image = picture
      if (!image) {
        const m = await drawing()
        const [i] = await Promise.all([m.loadImage(photo.src), m.loadBrand()])
        image = m.finishedPicture(design, i)
      }
      const a = { design: JSON.stringify(design), photo: photo.sample ? 'sample' : photo.src, image }
      return attachmentProblem(a) ? null : a
    },
  }

  return (
    <div className="min-h-svh">
      {/* The page behind the full-screen designer can't be reached with Tab while it's open. */}
      <div inert={open}>
        <SkipLink />
        <Header home={false} estimate="#estimate" />

        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-28 pt-4 lg:pb-16">
          {/* The way back to the main site, said in words (owner: people couldn't tell how to get back). */}
          <a href={import.meta.env.BASE_URL} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-glow-300 hover:underline">
            <span aria-hidden="true">←</span> {t.backHome}
          </a>
          <p className="mb-2 mt-2 text-sm font-semibold uppercase tracking-wider text-glow-400">Free light designer</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">{t.intro}</p>
          {/* Screen readers hear the note here, before the designer's buttons; on screen it sits under them. */}
          <p className="sr-only">{t.noSight} {business.phone}.</p>

          <div className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-5">
            <section className="lg:col-span-3" aria-label="Your design">
              {/* The picture opens the designer too (the buttons below are the keyboard's way in). */}
              <button type="button" tabIndex={-1} onClick={() => setOpen(true)} aria-label={photo.sample ? t.open : t.edit}
                className="relative block w-full overflow-hidden rounded-3xl border border-white/10 bg-night-900 text-left">
                {untouched
                  ? <img src={SAMPLE_PICTURE} width={photo.width} height={photo.height} fetchPriority="high" className="block h-auto w-full" alt="Sample house with Christmas lights" />
                  : <canvas ref={canvas} width={photo.width} height={photo.height} className="block h-auto w-full" aria-label={photo.sample ? 'Sample house with Christmas lights' : 'Your home with Christmas lights'} />}
                {!untouched && !img && <span className="absolute inset-0 grid place-items-center text-slate-400">Loading…</span>}
                <span className="absolute left-3 top-3 rounded-full bg-night-950/80 px-3 py-1 text-xs font-semibold">{photo.sample ? t.sampleNote : t.ownNote}</span>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-night-950/85 px-4 py-2 text-sm font-semibold shadow-lg">
                  <span aria-hidden="true">✏️</span> {photo.sample ? t.tapToTry : t.tapToEdit}
                </span>
              </button>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {/* Never disabled: the designer waits for the photo itself, and focus returns here when it closes. */}
                <button ref={openButton} type="button" onClick={() => setOpen(true)} className={primary}>{photo.sample ? t.open : t.edit}</button>
                <button type="button" onClick={choosePhoto} disabled={busy} aria-expanded={lit ? confirmNew : undefined} className={secondary}>{busy ? 'Opening…' : photo.sample ? t.upload : t.uploadAgain}</button>
                <input ref={file} type="file" accept="image/*" onChange={pick} className="hidden" />
              </div>
              {confirmNew && (
                <div className="mt-3 rounded-2xl border border-white/15 bg-night-900 p-4">
                  <p className="font-semibold" role="status">{t.replaceAsk}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setConfirmNew(false); file.current?.click() }} className={secondary}>{t.replaceYes}</button>
                    <button type="button" onClick={() => setConfirmNew(false)} className={secondary}>{t.replaceNo}</button>
                  </div>
                </div>
              )}
              {problem && <p className="mt-3 text-berry-300" role="alert">{problem}</p>}
              {portrait && !problem && <p className="mt-3 text-sm text-glow-300">{t.portraitTip}</p>}
              <p className="mt-3 text-sm text-slate-400" aria-hidden="true">{t.noSight} <a href={business.phoneHref} tabIndex={-1} className="font-semibold text-glow-300 underline">{business.phone}</a>.</p>
              <button type="button" onClick={toForm} data-bar-hide="" className="mt-4 min-h-11 w-full rounded-full border border-glow-400/40 bg-glow-400/10 px-6 py-3 font-semibold text-glow-300 hover:bg-glow-400/20">
                {t.estimate} ↓
              </button>
              {/* Our mark on the designer (spec: "Watermark and terms"), under the buttons rather than between the picture and them. */}
              <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1 text-xs text-slate-400">© {today.getFullYear()} {business.name} · <a href={`${import.meta.env.BASE_URL}terms/`} className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-glow-300">Terms of use</a></p>
            </section>

            <aside className="space-y-4 lg:col-span-2">
              <section className="rounded-3xl border border-white/10 bg-night-900 p-5">
                <h2 className="font-display text-xl font-extrabold">{t.tipsTitle}</h2>
                <ul className="mt-3 space-y-2 text-slate-300">
                  {t.tips.map((tip) => <li key={tip} className="flex gap-2"><Icon name="check" className="mt-0.5 size-5 shrink-0 text-glow-400" />{tip}</li>)}
                </ul>
              </section>
              <section className="rounded-3xl border border-white/10 bg-night-900 p-5">
                <h2 className="font-display text-xl font-extrabold">How to use it</h2>
                <ul className="mt-3 space-y-2 text-slate-300">
                  {t.how.map(([icon, name, what]) => <li key={name}><span aria-hidden="true">{icon}</span> <strong className="text-slate-100">{name}</strong>: {what}</li>)}
                </ul>
              </section>
            </aside>
          </div>

          <section id="estimate" className="mt-14 grid scroll-mt-6 gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t.formTitle}</h2>
              <p className="mt-3 text-lg text-slate-300">{t.formIntro}</p>
              <a href={business.phoneHref} className={`${secondary} mt-6`}><Icon name="phone" className="size-5" /> Call {business.phone}</a>
            </div>
            <div data-bar-hide=""><EstimateForm design={attachment} defaultMessage={t.message} /></div>
          </section>
        </main>

        <footer className="border-t border-white/10 px-4 pb-28 pt-8 text-sm text-slate-400 lg:pb-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2">
            <a href={import.meta.env.BASE_URL} className="inline-flex min-h-11 items-center hover:text-glow-300">← {business.name}</a>
            <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-2 font-semibold text-glow-300"><Icon name="phone" className="size-5" /> {business.phone}</a>
            {footerLinks.map((l) => <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center hover:text-glow-300">{l.label}</a>)}
          </div>
        </footer>

        {/* Thumb-reach bar on phones (hides while the page's own estimate button or the form is in view). */}
        <MobileCta estimate="#estimate" />
      </div>

      {open && (untouched || img) && (
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-night-950 text-slate-400">Loading designer…</div>}>
          <Designer simple backCloses photo={photo} design={design} title="Your light design" stamp={stamp} saveLabel={t.saveLabel} saveLabelShort={t.saveLabelShort}
            call={{ href: business.phoneHref, label: `Call ${business.phone}` }} intro={t.coach} tip={portrait && fresh ? t.portraitTip : null} onChange={keep}
            onSave={async (d) => { closed(d); setTimeout(toForm, 50) }}
            onClose={closed} />
        </Suspense>
      )}
    </div>
  )
}
