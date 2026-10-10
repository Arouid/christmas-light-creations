import { useEffect, useMemo, useRef, useState } from 'react'
import { business, designPage as t, footerLinks } from '../data/content'
import { Designer, loadImage, newDesign, renderDesign } from '../designer'
import { attachmentProblem } from '../lib/publicDesign'
import EstimateForm from '../components/EstimateForm'
import Icon from '../components/Icon'
import { finishedPicture, standardPhoto } from './photo'
import { SAMPLE_PHOTO, sampleDesign } from './sampleDesign'

// /design/: homeowners try our light designer on a sample house or a photo of
// their own home (simple mode: no prices, feet or measuring), then ask for an
// estimate with the design attached (docs/specs/public-designer.md).
const BRAND = `${business.name} · christmas-light-creations.com`
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-glow-400 px-6 py-3 font-semibold text-night-950 shadow-[0_0_28px_-6px] shadow-glow-400 hover:bg-glow-300 disabled:opacity-60'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/5 disabled:opacity-60'

export default function DesignPage() {
  const [photo, setPhoto] = useState(SAMPLE_PHOTO) // { src, width, height, sample? }
  const [design, setDesign] = useState(sampleDesign)
  const [img, setImg] = useState(null)
  const [open, setOpen] = useState(false)
  const [problem, setProblem] = useState('')
  const [portrait, setPortrait] = useState(false)
  const [busy, setBusy] = useState(false)
  const canvas = useRef(null)
  const file = useRef(null)

  useEffect(() => {
    let live = true
    loadImage(photo.src).then((i) => live && setImg(i)).catch(() => live && setProblem(t.errors.unreadable))
    return () => { live = false }
  }, [photo.src])
  useEffect(() => { if (img && canvas.current) renderDesign(canvas.current.getContext('2d'), design, img) }, [img, design])
  // The finished picture: the thumbnail on the form and what's sent with it.
  const picture = useMemo(() => (img && !open ? finishedPicture(design, img) : null), [img, design, open])

  async function pick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setProblem('')
    try {
      const p = await standardPhoto(f)
      setImg(null)
      setPhoto(p)
      setPortrait(p.portrait)
      setDesign(newDesign({ width: p.width, height: p.height, name: 'My home' }))
      setOpen(true)
    } catch (err) {
      setProblem(t.errors[err.message] ?? t.errors.unreadable)
    } finally {
      setBusy(false)
    }
  }
  const toForm = () => document.getElementById('estimate')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const attachment = picture && {
    preview: picture,
    get: async () => {
      const a = { design: JSON.stringify(design), photo: photo.sample ? 'sample' : photo.src, image: picture }
      return attachmentProblem(a) ? null : a
    },
  }

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-5">
        {/* The way back to the main site, said in words (owner: people couldn't tell how to get back). */}
        <a href={import.meta.env.BASE_URL} className="group flex min-h-11 min-w-0 items-center gap-2">
          <span className="text-xl text-glow-300" aria-hidden="true">←</span>
          <img src={business.logo} alt="" className="size-10 shrink-0" />
          <span className="min-w-0">
            <span className="block font-display text-lg font-extrabold leading-tight">{business.name}</span>
            <span className="block text-sm text-glow-300 group-hover:underline">{t.backHome}</span>
          </span>
        </a>
        <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-glow-400 px-4 font-semibold text-night-950" aria-label={`Call ${business.phone}`}>
          <Icon name="phone" className="size-5" /> <span className="hidden sm:inline">{business.phone}</span><span className="sm:hidden">Call</span>
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 md:pb-16">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-glow-400">Free light designer</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">{t.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">{t.intro}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3" aria-label="Your design">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-night-900">
              <canvas ref={canvas} width={photo.width} height={photo.height} className="block h-auto w-full" aria-label={photo.sample ? 'Sample house with Christmas lights' : 'Your home with Christmas lights'} />
              {!img && <p className="absolute inset-0 grid place-items-center text-slate-400">Loading…</p>}
              <span className="absolute left-3 top-3 rounded-full bg-night-950/80 px-3 py-1 text-xs font-semibold">{photo.sample ? t.sampleNote : t.ownNote}</span>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setOpen(true)} disabled={!img} className={primary}>✏️ {photo.sample ? t.open : t.edit}</button>
              <button type="button" onClick={() => file.current?.click()} disabled={busy} className={secondary}>📷 {busy ? 'Opening…' : photo.sample ? t.upload : t.uploadAgain}</button>
              <input ref={file} type="file" accept="image/*" onChange={pick} className="hidden" />
            </div>
            {problem && <p className="mt-3 text-berry-500" role="alert">{problem}</p>}
            {portrait && !problem && <p className="mt-3 text-sm text-glow-300">{t.portraitTip}</p>}
            <button type="button" onClick={toForm} className="mt-4 min-h-11 w-full rounded-full border border-glow-400/40 bg-glow-400/10 px-6 py-3 font-semibold text-glow-300 hover:bg-glow-400/20">
              {t.estimate} ↓
            </button>
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
          <EstimateForm design={attachment} defaultMessage={t.message} />
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 pb-28 pt-8 text-sm text-slate-400 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2">
          <a href={import.meta.env.BASE_URL} className="inline-flex min-h-11 items-center hover:text-glow-300">← {business.name}</a>
          <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-2 font-semibold text-glow-300"><Icon name="phone" className="size-5" /> {business.phone}</a>
          {footerLinks.map((l) => <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center hover:text-glow-300">{l.label}</a>)}
        </div>
      </footer>

      {/* Thumb-reach bar on phones: call is always one tap away. */}
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-white/10 bg-night-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 font-semibold"><Icon name="phone" className="size-5" /> Call</a>
        <button type="button" onClick={toForm} className="rounded-full bg-glow-400 py-3 text-center font-semibold text-night-950">Free estimate</button>
      </div>

      {open && img && (
        <Designer simple photo={photo} design={design} title="Your light design" brand={BRAND} saveLabel={t.saveLabel}
          onSave={async (d) => { setDesign(d); setOpen(false); setTimeout(toForm, 50) }}
          onClose={(d) => { if (d) setDesign(d); setOpen(false) }} />
      )}
    </div>
  )
}
