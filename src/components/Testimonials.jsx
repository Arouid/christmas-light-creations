import { testimonials } from '../data/content'
import Icon from './Icon'
import Section from './Section'

export default function Testimonials() {
  return (
    <Section eyebrow="Reviews" title="Neighbors who come back every year." className="bg-night-900">
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {testimonials.map((t) => (
          <li key={t.name} className="w-[85%] shrink-0 snap-center md:w-auto">
            <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-night-950 p-6">
              <div className="flex gap-0.5 text-glow-400" role="img" aria-label="5 stars">
                {Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" filled className="size-4" />)}
              </div>
              <blockquote className="mt-4 flex-1 text-slate-200">“{t.quote}”</blockquote>
              <figcaption className="mt-5 font-semibold text-slate-400">{t.name}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  )
}
