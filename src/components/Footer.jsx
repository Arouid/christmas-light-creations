import { business, footerLinks, nav } from '../data/content'
import { useToday } from '../lib/prerendered'
import Icon from './Icon'

export default function Footer() {
  const today = useToday()
  return (
    <footer className="border-t border-white/10 px-4 pb-28 pt-12 md:pb-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <img src={business.logo} alt={business.name} className="h-12 w-auto" loading="lazy" />
          <p className="mt-3 text-sm text-slate-400">Professional • Experienced • Insured</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400" aria-label="Footer">
          {nav.map((n) => <a key={n.href} href={n.href} className="hover:text-glow-300">{n.label}</a>)}
          <a href="#estimate" className="hover:text-glow-300">Free estimate</a>
        </nav>
        <a href={business.phoneHref} className="inline-flex items-center gap-2 font-semibold text-glow-300">
          <Icon name="phone" className="size-5" /> {business.phone}
        </a>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
        <p>© {today.getFullYear()} {business.name} · {business.city}</p>
        {footerLinks.map((l) => <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center underline-offset-2 hover:text-glow-300 hover:underline">{l.label}</a>)}
      </div>
    </footer>
  )
}
