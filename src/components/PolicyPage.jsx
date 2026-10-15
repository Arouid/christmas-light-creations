import Header from './Header'
import Rich from './Rich'
import SkipLink from './SkipLink'

// The shell of /privacy/ and /terms/: the site's header (sticky, so the phone
// stays one tap away while reading), a dated title, an intro and bulleted
// sections. Words come from content.js; an item may use **bold** and
// [links](url) (Rich.jsx).

export default function PolicyPage({ title, doc }) {
  return (
    <>
      <SkipLink />
      <Header home={false} />
      <main id="main" tabIndex={-1} className="mx-auto min-h-svh max-w-3xl px-4 pb-24 pt-8">
        <h1 className="font-display text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated {doc.updated}</p>
        <p className="mt-6 text-lg text-slate-200"><Rich text={doc.intro} /></p>
        {doc.sections.map((s) => (
          <section key={s.title} className="mt-8">
            <h2 className="font-display text-2xl font-extrabold">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
              {s.items.map((item) => <li key={item}><Rich text={item} /></li>)}
            </ul>
          </section>
        ))}
        <p className="mt-12"><a href={import.meta.env.BASE_URL} className="inline-flex min-h-11 items-center underline">← Back to the home page</a></p>
      </main>
    </>
  )
}
