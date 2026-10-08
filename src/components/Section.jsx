export default function Section({ id, eyebrow, title, intro, children, className = '' }) {
  return (
    <section id={id} className={`px-4 py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl">
        {(eyebrow || title) && (
          <header className="mb-10 max-w-2xl md:mb-14">
            {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-glow-400">{eyebrow}</p>}
            {title && <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h2>}
            {intro && <p className="mt-4 text-lg text-slate-300">{intro}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}
