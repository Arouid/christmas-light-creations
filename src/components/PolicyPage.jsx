import { business } from '../data/content'
import Icon from './Icon'

// The shell of /privacy/ and /terms/: our name and a call button up top, a
// dated title, an intro and bulleted sections. Words come from content.js;
// an item may use **bold** and [links](url).
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g
function Links({ text }) {
  const out = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    out.push(text.slice(last, m.index), <a key={m.index} href={m[2]} className="underline underline-offset-2 hover:text-glow-300">{m[1]}</a>)
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return out
}
function Rich({ text }) {
  return String(text).split('**').map((part, i) => (i % 2 ? <strong key={i} className="text-slate-100"><Links text={part} /></strong> : <Links key={i} text={part} />))
}

export default function PolicyPage({ title, doc }) {
  return (
    <main className="mx-auto min-h-svh max-w-3xl px-4 pb-24 pt-6">
      <header className="mb-8 flex items-center justify-between gap-3">
        <a href={import.meta.env.BASE_URL} className="flex items-center gap-2">
          <img src={business.logo} alt="" className="size-10" />
          <span className="font-display text-lg font-extrabold leading-tight">{business.name}</span>
        </a>
        <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-glow-400 px-4 font-semibold text-night-950" aria-label={`Call ${business.phone}`}>
          <Icon name="phone" className="size-5" /> <span className="hidden sm:inline">{business.phone}</span><span className="sm:hidden">Call</span>
        </a>
      </header>
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
      <p className="mt-12"><a href={import.meta.env.BASE_URL} className="underline">← Back to the home page</a></p>
    </main>
  )
}
