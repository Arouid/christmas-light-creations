import { useEffect, useState } from 'react'
import { business, currentYear, designPage, gallery } from '../data/content'
import { bookLine, fetchBooking, seasonBadge } from '../lib/urgency'
import Availability from './Availability'
import Icon from './Icon'
import SignWelcome from './SignWelcome'

export default function Hero() {
  // Staff's "how booked we are" line, fetched after the page has drawn.
  const [status, setStatus] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { fetchBooking().then((b) => setStatus(b.status)) }, 1200)
    return () => clearTimeout(t)
  }, [])
  return (
    <section id="top" className="relative isolate overflow-hidden pt-16">
      <img src={gallery[0].src} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center] opacity-60 md:opacity-90" fetchPriority="high" />
      {/* Phones: darken evenly for the text. Desktop: dark behind the text on the left, house shows on the right. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night-950/70 via-night-950/55 to-night-950 md:bg-gradient-to-r md:from-night-950 md:via-night-950/70 md:to-night-950/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-night-950 to-transparent" />

      <div className="mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-end px-4 pb-14 pt-24 md:justify-center md:pb-24">
        <SignWelcome />
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-glow-400/30 bg-night-900/60 px-3 py-1 text-xs font-medium uppercase tracking-wider text-glow-300">
          <span className="twinkle size-2 rounded-full bg-glow-400" /> {seasonBadge()}
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
          Holiday lights, <span className="text-glow-400 [text-shadow:0_0_28px_rgba(255,207,77,0.55)]">done for you.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-300">
          Design, installation, service and removal by a family-owned crew serving Pearland, the Bay Area and south Houston since {business.since}.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#estimate" className="rounded-full bg-glow-400 px-7 py-4 text-center font-semibold text-night-950 shadow-[0_0_32px_-6px] shadow-glow-400 hover:bg-glow-300">
            Get a free estimate
          </a>
          <a href={business.phoneHref} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 font-semibold hover:bg-white/5">
            <Icon name="phone" className="size-5" /> {business.phone}
          </a>
        </div>
        <a href={`${import.meta.env.BASE_URL}design/`} className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-glow-300 underline-offset-4 hover:underline">
          ✨ {designPage.heroLink} →
        </a>
        <p className="mt-4 text-sm text-slate-300">
          {status && <span className="mr-2 font-semibold text-glow-300">🔥 {status}.</span>}
          {bookLine()}
        </p>
        <Availability className="mt-4" />

        <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center sm:text-left">
          {[
            [`${currentYear - business.since}+`, 'years lighting homes'],
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
