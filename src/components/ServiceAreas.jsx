import { areas } from '../data/areas'
import { business, serviceAreaGroups } from '../data/content'
import Section from './Section'

export default function ServiceAreas() {
  return (
    <Section id="areas" eyebrow="Service area" title="Where we work."
      intro="Holiday lighting installation across Pearland, the Bay Area and south Houston.">
      <div className="grid gap-4 md:grid-cols-3">
        {serviceAreaGroups.map((g) => (
          <div key={g.region} className="rounded-2xl border border-white/10 bg-night-900 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-glow-400">{g.region}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {g.towns.map((t) => <li key={t} className="rounded-full bg-white/5 px-3 py-1.5 text-sm">{t}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <nav className="mt-6" aria-label="Area pages">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Christmas light installation in</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {areas.map((a) => (
            <li key={a.slug}>
              <a href={`${import.meta.env.BASE_URL}christmas-light-installation/${a.slug}/`}
                className="inline-block rounded-full border border-glow-400/30 px-4 py-2 text-sm font-medium text-glow-300 hover:bg-glow-400/10">
                {a.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-6 text-slate-300">
        Don’t see your town? <a href={business.phoneHref} className="font-semibold text-glow-300 underline-offset-4 hover:underline">Call {business.phone}</a>, we may still come out.
      </p>
    </Section>
  )
}
