import { steps } from '../data/content'
import Section from './Section'

export default function HowItWorks() {
  return (
    <Section id="how" eyebrow="How it works" title="One call. Whole season covered." className="bg-night-900">
      <ol className="grid gap-8 md:grid-cols-4 md:gap-6">
        {steps.map((s, i) => (
          <li key={s.title} className="relative pl-14 md:pl-0">
            <span className="absolute left-0 top-0 grid size-10 place-items-center rounded-full bg-glow-400 font-display text-lg font-extrabold text-night-950 shadow-[0_0_20px_-2px] shadow-glow-400/70 md:static md:mb-5">
              {i + 1}
            </span>
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-slate-400">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
