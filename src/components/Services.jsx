import { highlights, included, serviceCalls, pricingNotes } from '../data/content'
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
    </Section>
  )
}
