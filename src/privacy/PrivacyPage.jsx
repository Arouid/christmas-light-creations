import { business, privacy } from '../data/content'
import Icon from '../components/Icon'

// Privacy policy: /privacy/ (linked in every footer). Words in content.js.
function Rich({ text }) {
  return String(text).split('**').map((part, i) => (i % 2 ? <strong key={i} className="text-slate-100">{part}</strong> : part))
}

export default function PrivacyPage() {
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
      <h1 className="font-display text-4xl font-extrabold">Privacy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated {privacy.updated}</p>
      <p className="mt-6 text-lg text-slate-200">{privacy.intro}</p>
      {privacy.sections.map((s) => (
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
