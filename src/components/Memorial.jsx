import { memorial } from '../data/content'

// A quiet remembrance above the footer: one warm bulb, his name, the
// owner's words. Hidden until a name is set in content.js.
export default function Memorial() {
  if (!memorial.name) return null
  return (
    <section id="in-memory" aria-labelledby="in-memory-title" className="border-t border-white/10 bg-night-900 px-4 py-20 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span aria-hidden="true" className="twinkle mx-auto block size-3 rounded-full bg-glow-300 shadow-[0_0_18px_6px_rgba(255,207,77,0.45)]" />
        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-glow-400">In loving memory</p>
        <h2 id="in-memory-title" className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{memorial.name}</h2>
        <blockquote className="mt-8 text-lg leading-loose text-slate-300 md:text-xl md:leading-loose">{memorial.words}</blockquote>
      </div>
    </section>
  )
}
