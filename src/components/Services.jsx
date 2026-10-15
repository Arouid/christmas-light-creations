import { customerPerks, highlights, included, lifetimeWarranty, lightOptions, priceBeat, pricingNotes } from '../data/content'
import Icon from './Icon'
import Section from './Section'

// Takedown's line under the options (pricingNotes: the re-install and service-call
// figures are already in the options and the reasons above).
const removal = pricingNotes.find((p) => p.label === 'Removal')

// Why us, what's included, the options and the account. Design review
// 2026-10-14: this section was about six phone screens, the warranty and free
// service calls each came up again and again, so each thing is said once here.
export default function Services() {
  return (
    <Section id="services" eyebrow="Why Christmas Light Creations" title="Your home, the brightest on the block."
      intro="We handle every detail from design to removal, while you sit back and enjoy the season.">
      {/* The four reasons: icon beside the words on phones, above them from lg up. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {highlights.map((h) => (
          <article key={h.title} className="flex gap-4 rounded-2xl border border-white/10 bg-night-900 p-5 lg:block lg:p-6">
            <div className="h-fit shrink-0 rounded-xl bg-glow-400/10 p-2.5 text-glow-400 lg:mb-4 lg:inline-flex">
              <Icon name={h.icon} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{h.title}</h3>
              <p className="mt-1 text-slate-400 lg:mt-2">{h.body}</p>
            </div>
          </article>
        ))}
      </div>

      {/* What every install includes, then the lifetime warranty and the price promise (owner 2026-10-12). */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <article className="rounded-2xl bg-gradient-to-br from-night-800 to-night-900 p-6 md:p-8 lg:col-span-3">
          <h3 className="font-display text-2xl font-bold">What’s included in every install</h3>
          <ul className="mt-6 space-y-3">
            {included.map((i) => (
              <li key={i} className="flex gap-3">
                <Icon name="check" className="mt-0.5 size-5 shrink-0 text-pine-500" />
                <span className="text-slate-200">{i}</span>
              </li>
            ))}
          </ul>
        </article>
        <div className="grid content-start gap-4 lg:col-span-2">
          <p id="warranty" className="scroll-mt-24 rounded-2xl border border-pine-500/50 bg-pine-500/10 px-5 py-4 text-sm text-slate-200">
            <strong className="font-display text-lg text-glow-300">🛡️ {lifetimeWarranty.title}</strong>
            <span className="mt-1 block">{lifetimeWarranty.body}</span>
          </p>
          <p className="rounded-2xl border border-glow-400/40 bg-glow-400/10 px-5 py-4 text-sm text-slate-200">
            <strong className="font-display text-lg text-glow-300">{priceBeat.title}</strong>
            <span className="mt-1 block">{priceBeat.body}</span>
          </p>
        </div>
      </div>

      {/* Buy, lease or pay in 3 (owner's copy, docs/specs/leasing.md). */}
      <h3 id="options" className="mt-10 scroll-mt-24 font-display text-2xl font-extrabold">Your options</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3 sm:gap-4">
        {lightOptions.map((o) => (
          <li key={o.title} className="rounded-2xl border border-white/10 bg-night-950/40 p-5">
            <p className="flex flex-wrap items-center gap-2 font-display text-xl font-extrabold">
              {o.title}
              {o.tag && <span className="rounded-full bg-glow-400 px-2.5 py-0.5 text-xs font-semibold text-night-950">{o.tag}</span>}
            </p>
            <p className="mt-2 text-sm text-slate-300">{o.body}</p>
          </li>
        ))}
      </ul>
      {removal && <p className="mt-3 text-sm text-slate-400"><strong className="font-semibold text-slate-200">{removal.label}:</strong> {removal.value.toLowerCase()}, {removal.note}.</p>}

      {/* What every customer gets (owner 2026-10-12), as a list rather than eight cards. */}
      <h3 id="account" className="mt-10 scroll-mt-24 font-display text-2xl font-extrabold">{customerPerks.title}</h3>
      <p className="mt-2 max-w-2xl text-slate-300">{customerPerks.intro}</p>
      <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {customerPerks.items.map(([icon, title, body]) => (
          <li key={title} className="flex gap-3">
            <span className="w-7 shrink-0 text-center text-xl leading-7" aria-hidden="true">{icon}</span>
            <p className="text-sm text-slate-400"><strong className="block text-base font-semibold text-slate-100">{title}</strong>{body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-slate-400">Your account: <a href={`${import.meta.env.BASE_URL}account/`} className="font-semibold text-glow-300 underline">christmas-light-creations.com/account</a></p>
    </Section>
  )
}
