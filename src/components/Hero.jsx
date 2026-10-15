import { useEffect, useState } from 'react'
import { business, hero, heroHighlights, heroPhotos } from '../data/content'
import { HERO_KEY, HERO_VAR, heroBackground, showHero } from '../lib/heroPhoto'
import { useToday } from '../lib/prerendered'
import { bookLine, fetchBooking, statusSentence } from '../lib/urgency'
import Availability from './Availability'
import Icon from './Icon'

export default function Hero() {
  const today = useToday()
  // Staff's "how booked we are" line, fetched after the page has drawn.
  const [status, setStatus] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { fetchBooking().then((b) => setStatus(b.status)) }, 1200)
    return () => clearTimeout(t)
  }, [])
  // The built page picked the photo in its <head>; `npm run dev` has no built page, so pick here.
  useEffect(() => {
    const root = document.documentElement
    if (!root.style.getPropertyValue(HERO_VAR)) showHero(heroPhotos, HERO_KEY, HERO_VAR, document, () => window.localStorage, Math.random)
  }, [])
  return (
    <section id="top" className="relative isolate overflow-hidden pt-16">
      {/* A different photo each visit, picked before it downloads (lib/heroPhoto.js). */}
      <div aria-hidden="true" style={heroBackground(heroPhotos)} className="absolute inset-0 -z-20 bg-cover bg-no-repeat opacity-60 md:opacity-90" />
      {/* Phones: darken evenly for the text. Desktop: dark behind the text on the left, house shows on the right. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night-950/70 via-night-950/55 to-night-950 md:bg-gradient-to-r md:from-night-950 md:via-night-950/70 md:to-night-950/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-night-950 to-transparent" />

      <div className="mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-end px-4 pb-14 pt-32 md:justify-center md:pb-24">
        <p className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-wider text-glow-300">
          <span className="twinkle size-2 rounded-full bg-glow-400" aria-hidden="true" /> {hero.eyebrow}
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
          Holiday lights, <span className="text-glow-400 [text-shadow:0_0_28px_rgba(255,207,77,0.55)]">done for you.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-300">
          Professional Christmas light installers: design, installation, service and removal by a family-owned company serving Pearland, the Bay Area and south Houston since {business.since}.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a id="hero-estimate" href="#estimate" className="rounded-full bg-glow-400 px-7 py-4 text-center font-semibold text-night-950 shadow-[0_0_32px_-6px] shadow-glow-400 hover:bg-glow-300">
            Get a free estimate
          </a>
          <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 font-semibold hover:bg-white/5">
            <Icon name="phone" className="size-5" /> {business.phone}
          </a>
        </div>
        {/* The designer, Pay in 3 and the lifetime warranty, highlighted (content.js heroHighlights). */}
        <div className="mt-4 grid max-w-2xl gap-2 sm:grid-cols-3">
          {heroHighlights.map((h) => (
            <a key={h.title} href={h.href.startsWith('#') ? h.href : `${import.meta.env.BASE_URL}${h.href}`}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-glow-400/40 bg-night-900/70 px-4 py-2.5 backdrop-blur hover:border-glow-400 hover:bg-night-900">
              <span aria-hidden="true" className="text-2xl">{h.icon}</span>
              <span className="min-w-0 leading-tight">
                <span className="flex items-center gap-2 font-semibold text-glow-300">{h.title}{h.tag && <span className="rounded-full bg-glow-400 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-night-950">{h.tag}</span>}</span>
                <span className="block text-sm text-slate-300">{h.body}</span>
              </span>
            </a>
          ))}
        </div>
        {/* Two lines tall from the start, so the staff line arriving later doesn't push the page down */}
        <p className="mt-4 min-h-10 text-sm text-slate-300">
          {status && <span className="mr-2 font-semibold text-glow-300">🔥 {statusSentence(status)}</span>}
          {bookLine(today)}
        </p>
        <Availability className="mt-4" />

        <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center sm:text-left">
          {[
            [`${today.getFullYear() - business.since}+`, 'years lighting homes'],
            [business.homesServed, 'homes each season'],
            ['$0', 'service calls'],
          ].map(([v, l]) => (
            <div key={l}>
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-2xl font-extrabold text-glow-300 sm:text-3xl">{v}</dd>
              <dd className="text-xs text-slate-400 sm:text-sm">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
