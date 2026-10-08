import { business, testimonials } from '../data/content'
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
      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <a href={business.reviewLink} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-night-950 hover:bg-slate-100">
          <Icon name="star" filled className="size-5 text-glow-500" /> Leave us a Google review
        </a>
        <p className="text-sm text-slate-400">Had us out this year? It helps a small family business a lot.</p>
      </div>
    </Section>
  )
}
