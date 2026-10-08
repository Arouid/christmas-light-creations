import { faq } from '../data/content'
import Icon from './Icon'
import Section from './Section'

export default function Faq() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions, answered.">
      <div className="grid gap-10 md:grid-cols-2">
        {faq.map((g) => (
          <div key={g.group}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{g.group}</h3>
            <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-night-900">
              {g.items.map(([q, a]) => (
                <details key={q} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <Icon name="chevron" className="size-5 shrink-0 text-glow-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 text-slate-400">{a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
