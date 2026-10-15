import Header from '../components/Header'
import Icon from '../components/Icon'
import MobileCta from '../components/MobileCta'
import Rich from '../components/Rich'
import { business, costGuide as t, footerLinks, included, lifetimeWarranty, lightOptions, priceBeat } from '../data/content'
import { faqSchema, jsonLd } from '../lib/costGuide.js'

// The cost guide: /cost/ (docs/specs/cost-guide.md). Words in content.js
// (costGuide, plus the home page's included list, light options, price
// promise and warranty, so the two pages can't disagree). Drawn into its
// HTML at build time (scripts/prerender.mjs); nothing here depends on the
// visitor's browser, so React's take-over matches the build exactly.
const base = import.meta.env.BASE_URL
const estimate = `${base}#estimate`
const btn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-center font-semibold'
const card = 'rounded-2xl border border-white/10 bg-night-900 p-5'
const links = footerLinks.filter((l) => !l.href.endsWith('cost/'))

function Block({ title, intro, children }) {
  return (
    <section className="mt-14 md:mt-20">
      <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
      {intro && <p className="mt-3 max-w-2xl text-lg text-slate-300"><Rich text={intro} /></p>}
      {children}
    </section>
  )
}

function Ranges({ rows }) {
  if (!rows.length) return <p className="mt-3 max-w-2xl text-lg text-slate-300">{t.ranges.empty}</p>
  return (
    <>
      <p className="mt-3 max-w-2xl text-lg text-slate-300">{t.ranges.rowsIntro}</p>
      <table className="mt-6 w-full text-left">
        <thead>
          <tr className="text-sm uppercase tracking-wider text-slate-400">
            <th className="py-2 pr-4 font-semibold">Home</th>
            <th className="py-2 pr-4 font-semibold">Typical price</th>
            <th className="hidden py-2 font-semibold sm:table-cell">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((r) => (
            <tr key={r.home}>
              <td className="py-3 pr-4 align-top">{r.home}{r.note && <span className="block text-sm text-slate-400 sm:hidden">{r.note}</span>}</td>
              <td className="whitespace-nowrap py-3 pr-4 align-top font-semibold text-glow-300">{r.price}</td>
              <td className="hidden py-3 align-top text-slate-400 sm:table-cell">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default function CostPage() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <Header home={false} />

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 pb-28 pt-10 md:pt-16 lg:pb-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-glow-400">{t.eyebrow}</p>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">{t.title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">{t.intro}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={estimate} data-bar-hide="" className={`${btn} bg-glow-400 text-night-950`}>{t.cta.estimate}</a>
          <a href={business.phoneHref} className={`${btn} border border-white/20`}><Icon name="phone" className="size-5" /> {t.cta.call}</a>
        </div>

        <Block title={t.drivers.title} intro={t.drivers.intro}>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {t.drivers.items.map((d) => (
              <li key={d.title} className={card}>
                <p className="text-2xl" aria-hidden="true">{d.icon}</p>
                <h3 className="mt-2 font-display text-xl font-bold">{d.title}</h3>
                <p className="mt-2 text-slate-300">{d.body}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title={t.ranges.rows.length ? t.ranges.title : t.ranges.titleEmpty}>
          <Ranges rows={t.ranges.rows} />
          <p className="mt-4 max-w-2xl text-slate-300"><Rich text={t.ranges.hurry} /></p>
          <h3 className="mt-8 font-display text-xl font-bold">{t.ranges.includedTitle}</h3>
          <ul className="mt-3 grid gap-2 text-slate-300 sm:grid-cols-2">
            {included.map((i) => <li key={i} className="flex gap-3"><span className="text-emerald-400">✓</span><span>{i}</span></li>)}
          </ul>
          <p className="mt-4 max-w-2xl text-sm text-slate-400">{t.ranges.tax}</p>
        </Block>

        <Block title={t.exact.title} intro={t.exact.intro}>
          <ol className="mt-6 space-y-4">
            {t.exact.steps.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-glow-400 font-display font-bold text-night-950">{i + 1}</span>
                <p className="pt-1 text-slate-300"><Rich text={s} /></p>
              </li>
            ))}
          </ol>
          <a href={estimate} data-bar-hide="" className={`${btn} mt-6 bg-glow-400 text-night-950`}>{t.cta.estimate}</a>
        </Block>

        <Block title={t.pay.title} intro={t.pay.intro}>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {lightOptions.map((o) => (
              <li key={o.title} className={card}>
                <h3 className="font-display text-xl font-bold">
                  {o.title}
                  {o.tag && <span className="ml-2 rounded-full bg-glow-400/15 px-2 py-0.5 align-middle text-xs font-semibold text-glow-300">{o.tag}</span>}
                </h3>
                <p className="mt-2 text-slate-300">{o.body}</p>
              </li>
            ))}
          </ul>
          <div className={`${card} mt-4`}>
            <h3 className="font-display text-xl font-bold">{priceBeat.title}</h3>
            <p className="mt-2 text-slate-300">{priceBeat.body}</p>
          </div>
        </Block>

        <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-2">
          <section className={card}>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">{t.early.title}</h2>
            <p className="mt-3 text-slate-300">{t.early.body}</p>
          </section>
          <section className={card}>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">{lifetimeWarranty.title}</h2>
            <p className="mt-3 text-slate-300">{lifetimeWarranty.body}</p>
          </section>
        </div>

        <Block title={t.diy.title} intro={t.diy.intro}>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[t.diy.yourself, t.diy.hired].map((side, i) => (
              <section key={side.title} className={card}>
                <h3 className="font-display text-xl font-bold">{side.title}</h3>
                <ul className="mt-3 space-y-2 text-slate-300">
                  {side.items.map((item) => (
                    <li key={item} className="flex gap-3"><span className={i ? 'text-emerald-400' : 'text-slate-500'}>{i ? '✓' : '•'}</span><span>{item}</span></li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-lg text-slate-200">{t.diy.verdict}</p>
        </Block>

        <Block title={t.faq.title}>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-night-900">
            {t.faq.items.map(([q, a]) => (
              <details key={q} className="group px-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <Icon name="chevron" className="size-5 shrink-0 text-glow-400 motion-safe:transition group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-slate-400"><Rich text={a} /></p>
              </details>
            ))}
          </div>
        </Block>

        <section className="mt-14 rounded-2xl bg-night-900 px-5 py-10 text-center md:mt-20">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">{t.closing.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300"><Rich text={t.closing.body} /></p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={estimate} data-bar-hide="" className={`${btn} bg-glow-400 text-night-950`}>{t.cta.estimate}</a>
            <a href={business.phoneHref} className={`${btn} border border-white/20`}><Icon name="phone" className="size-5" /> {t.cta.call}</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 pb-28 pt-8 text-sm text-slate-400 lg:pb-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2">
          <a href={base} className="inline-flex min-h-11 items-center hover:text-glow-300">← {business.name}</a>
          <a href={business.phoneHref} className="inline-flex min-h-11 items-center gap-2 font-semibold text-glow-300"><Icon name="phone" className="size-5" /> {business.phone}</a>
          {links.map((l) => <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center hover:text-glow-300">{l.label}</a>)}
        </div>
      </footer>

      {/* Thumb-reach bar on phones (hides while a Get your exact price button is in view). */}
      <MobileCta estimate={estimate} />

      {/* FAQPage structured data: this page's own questions, the answers as plain text. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(t.faq.items)) }} />
    </>
  )
}
