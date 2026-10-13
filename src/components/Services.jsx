import { customerPerks, highlights, included, lifetimeWarranty, lightOptions, priceBeat, serviceCalls, pricingNotes } from '../data/content'
import Icon from './Icon'
import Section from './Section'

export default function Services() {
  return (
    <Section id="services" eyebrow="Why Christmas Light Creations" title="Your home, the brightest on the block."
      intro="We handle every detail from design to removal, while you sit back and enjoy the season.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((h) => (
          <article key={h.title} className="rounded-2xl border border-white/10 bg-night-900 p-6">
            <div className="mb-4 inline-flex rounded-xl bg-glow-400/10 p-2.5 text-glow-400">
              <Icon name={h.icon} />
            </div>
            <h3 className="text-lg font-semibold">{h.title}</h3>
            <p className="mt-2 text-slate-400">{h.body}</p>
          </article>
        ))}
      </div>

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
        <article className="rounded-2xl border border-berry-500/30 bg-berry-600/10 p-6 md:p-8 lg:col-span-2">
          <h3 className="font-display text-2xl font-bold">Service calls, on us</h3>
          <p className="mt-2 text-slate-300">We aim for 100% up-time. If something goes out, we’ve got you covered:</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {serviceCalls.map((s) => (
              <li key={s} className="rounded-full bg-night-950/60 px-3 py-1.5 text-sm">{s}</li>
            ))}
          </ul>
        </article>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {pricingNotes.map((p) => (
          <div key={p.label} className="rounded-2xl border border-white/10 p-6">
            <dt className="text-sm font-medium uppercase tracking-wider text-slate-400">{p.label}</dt>
            <dd className="mt-1 font-display text-4xl font-extrabold text-glow-300">{p.value}</dd>
            <dd className="mt-1 text-sm text-slate-400">{p.note}</dd>
          </div>
        ))}
      </dl>

      {/* The lifetime warranty and the price promise (owner 2026-10-12). */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <p id="warranty" className="scroll-mt-24 rounded-2xl border border-pine-500/50 bg-pine-500/10 px-5 py-4 text-sm text-slate-200">
          <strong className="font-display text-lg text-glow-300">🛡️ {lifetimeWarranty.title}</strong>
          <span className="mt-1 block">{lifetimeWarranty.body}</span>
        </p>
        <p className="rounded-2xl border border-glow-400/40 bg-glow-400/10 px-5 py-4 text-sm text-slate-200">
          <strong className="font-display text-lg text-glow-300">{priceBeat.title}</strong>
          <span className="mt-1 block">{priceBeat.body}</span>
        </p>
      </div>

      {/* Buy, lease or pay in 3 (owner's copy, docs/specs/leasing.md). */}
      <h3 id="options" className="mt-8 scroll-mt-24 font-display text-2xl font-extrabold">Your options</h3>
      <ul className="mt-3 grid gap-4 sm:grid-cols-3">
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

      {/* What every customer gets (owner 2026-10-12). */}
      <h3 id="account" className="mt-10 scroll-mt-24 font-display text-2xl font-extrabold">{customerPerks.title}</h3>
      <p className="mt-2 max-w-2xl text-slate-300">{customerPerks.intro}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {customerPerks.items.map(([icon, title, body]) => (
          <li key={title} className="rounded-2xl border border-white/10 bg-night-900 p-4">
            <p className="font-display text-lg font-extrabold"><span className="mr-2" aria-hidden="true">{icon}</span>{title}</p>
            <p className="mt-1 text-sm text-slate-400">{body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-400">Your account: <a href={`${import.meta.env.BASE_URL}account/`} className="font-semibold text-glow-300 underline">christmas-light-creations.com/account</a></p>
    </Section>
  )
}
