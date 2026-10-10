// After `vite build`: writes the area pages as static HTML (fast, fully
// readable by Google without running JavaScript) plus sitemap.xml.
// Run by `npm run build`.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { areas } from '../src/data/areas.js'
import { business, included } from '../src/data/content.js'

const SITE = 'https://christmas-light-creations.com'
const base = process.env.BASE_PATH || '/'
const dist = new URL('../dist/', import.meta.url)
const today = new Date().toISOString().slice(0, 10)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pagePath = (a) => `christmas-light-installation/${a.slug}/`

// Reuse the main page's stylesheet(s) so the area pages match the site.
const mainHtml = await readFile(new URL('index.html', dist), 'utf8')
const styles = [...mainHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/g)].map((m) => m[1])

function page(a) {
  const url = `${SITE}/${pagePath(a)}`
  const title = `Christmas Light Installation in ${a.name}, TX | ${business.name}`
  const description = `Professional Christmas light installation, free service calls and January removal in ${a.towns.slice(0, 4).join(', ')}. Family-owned since ${business.since}. Free estimates: ${business.phone}.`
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Christmas light installation',
    url,
    areaServed: a.towns.map((t) => ({ '@type': 'Place', name: `${t}, TX` })),
    provider: { '@type': 'HomeAndConstructionBusiness', name: business.name, telephone: '+1-281-819-0163', url: `${SITE}/` },
  }
  const others = areas.filter((o) => o.slug !== a.slug)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#050b1a" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
${styles.map((h) => `<link rel="stylesheet" href="${h}" />`).join('\n')}
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<header class="border-b border-white/10 bg-night-950/90">
  <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
    <a href="${base}"><img src="${base}images/clc-logo.png" alt="${esc(business.name)}" class="h-10 w-auto" /></a>
    <div class="flex items-center gap-2">
      <a href="tel:+12818190163" class="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">${business.phone}</a>
      <a href="${base}#estimate" class="hidden rounded-full bg-glow-400 px-4 py-2 text-sm font-semibold text-night-950 sm:inline-block">Free estimate</a>
    </div>
  </div>
</header>
<main>
  <section class="px-4 py-14 md:py-20">
    <div class="mx-auto max-w-6xl">
      <p class="mb-3 text-sm font-semibold uppercase tracking-wider text-glow-400">Christmas light installation · ${esc(a.name)}</p>
      <h1 class="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">Christmas lights, installed in ${esc(a.name)}.</h1>
      <p class="mt-5 max-w-2xl text-lg text-slate-300">${esc(a.intro)}</p>
      <dl class="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
        <div><dt class="sr-only">Estimates</dt><dd class="font-display text-3xl font-extrabold text-glow-300">Free</dd><dd class="text-sm text-slate-400">estimates, no need to be home</dd></div>
        <div><dt class="sr-only">Since</dt><dd class="font-display text-3xl font-extrabold text-glow-300">${business.since}</dd><dd class="text-sm text-slate-400">family-owned since</dd></div>
        <div><dt class="sr-only">Service calls</dt><dd class="font-display text-3xl font-extrabold text-glow-300">$0</dd><dd class="text-sm text-slate-400">service calls</dd></div>
      </dl>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href="${base}#estimate" class="rounded-full bg-glow-400 px-7 py-4 text-center font-semibold text-night-950">Get a free estimate</a>
        <a href="tel:+12818190163" class="rounded-full border border-white/20 px-7 py-4 text-center font-semibold">Call ${business.phone}</a>
      </div>
    </div>
  </section>

  <section class="px-4 pb-14">
    <ul class="mx-auto grid max-w-6xl grid-cols-2 gap-3">
      ${a.photos.map((p) => `<li><img src="${base}images/gallery/${p}" alt="Christmas lights installed by ${esc(business.name)}" loading="lazy" class="aspect-[4/3] w-full rounded-xl object-cover" /></li>`).join('\n      ')}
    </ul>
  </section>

  <section class="bg-night-900 px-4 py-14">
    <div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
      <div>
        <h2 class="font-display text-3xl font-extrabold tracking-tight">Why ${esc(a.name)} homeowners call us</h2>
        <ul class="mt-6 space-y-4 text-slate-300">
          ${a.local.map((l) => `<li class="flex gap-3"><span class="text-glow-400">★</span><span>${esc(l)}</span></li>`).join('\n          ')}
        </ul>
      </div>
      <div>
        <h2 class="font-display text-3xl font-extrabold tracking-tight">What’s included</h2>
        <ul class="mt-6 space-y-3 text-slate-300">
          ${included.map((i) => `<li class="flex gap-3"><span class="text-emerald-400">✓</span><span>${esc(i)}</span></li>`).join('\n          ')}
        </ul>
        <p class="mt-6 text-slate-400">Towns we cover here: ${a.towns.map(esc).join(', ')}.</p>
      </div>
    </div>
  </section>

  <section class="px-4 py-14 text-center">
    <h2 class="font-display text-3xl font-extrabold tracking-tight">Book your ${esc(a.name)} install</h2>
    <p class="mx-auto mt-3 max-w-xl text-slate-300">Installs start October 15th and the schedule fills fast. We measure from the ground, so you don’t need to be home for the estimate.</p>
    <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
      <a href="${base}#estimate" class="rounded-full bg-glow-400 px-7 py-4 font-semibold text-night-950">Get a free estimate</a>
      <a href="tel:+12818190163" class="rounded-full border border-white/20 px-7 py-4 font-semibold">Call ${business.phone}</a>
    </div>
  </section>

  <nav class="border-t border-white/10 px-4 py-10" aria-label="Other areas">
    <div class="mx-auto max-w-6xl">
      <p class="text-sm font-semibold uppercase tracking-wider text-slate-400">Other areas we serve</p>
      <ul class="mt-3 flex flex-wrap gap-2">
        ${others.map((o) => `<li><a href="${base}${pagePath(o)}" class="inline-block rounded-full bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">${esc(o.name)}</a></li>`).join('\n        ')}
        <li><a href="${base}" class="inline-block rounded-full bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">Home page</a></li>
      </ul>
    </div>
  </nav>
</main>
<footer class="border-t border-white/10 px-4 py-8 text-center text-xs text-slate-500">
  © ${new Date().getFullYear()} ${esc(business.name)} · ${esc(business.city)} · ${business.phone}
  · <a href="${base}account/" class="hover:text-glow-300">Customer login</a> · <a href="${base}privacy/" class="hover:text-glow-300">Privacy</a>
</footer>
</body>
</html>
`
}

for (const a of areas) {
  const dir = new URL(pagePath(a), dist)
  await mkdir(dir, { recursive: true })
  await writeFile(new URL('index.html', dir), page(a))
}

// Old WordPress pages -> their new home, so old links and Google results keep working.
const REDIRECTS = {
  'faq': '#faq', 'photos': '#gallery', 'info': '#how', 'get-an-estimate': '#estimate',
  'pearland-christmas-light-installation': 'christmas-light-installation/pearland/',
  'shadow-creek-ranch': 'christmas-light-installation/pearland/',
  'silverlake': 'christmas-light-installation/pearland/',
  'league-city': 'christmas-light-installation/league-city/',
  'friendswood': 'christmas-light-installation/friendswood/',
  'contact': '#estimate', 'call-today': '#estimate', 'free-estimates': '#estimate', 'signup': '#estimate',
  'portfolio': '#gallery', 'christmas-light-designs': '#gallery',
  'led-or-incandescent': '#faq', 'spt-cable-whats-the-difference': '#faq', 'get-help': '#faq',
  'about-us': '', 'christmas-light-creations': '', 'thank-you': '',
  // Typed from a road sign (QR codes carry their own ?sign=corner).
  'sign': '?sign=typed', 'signs': '?sign=typed', 'lights': '?sign=typed',
}
for (const [from, to] of Object.entries(REDIRECTS)) {
  const target = `${base}${to}`
  const dir = new URL(`${from}/`, dist)
  await mkdir(dir, { recursive: true })
  await writeFile(new URL('index.html', dir), `<!doctype html><meta charset="utf-8"><title>Moved</title>`
    + `<link rel="canonical" href="${SITE}/${/^[#?]/.test(to) ? '' : to}"><meta name="robots" content="noindex">`
    + `<meta http-equiv="refresh" content="0; url=${target}"><script>location.replace(${JSON.stringify(target)})</script>`
    + `<a href="${target}">Continue to Christmas Light Creations</a>
`)
}

const urls = [`${SITE}/`, ...areas.map((a) => `${SITE}/${pagePath(a)}`), `${SITE}/privacy/`]
await writeFile(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`)

console.log(`area pages: ${areas.length}, redirects: ${Object.keys(REDIRECTS).length}, sitemap: ${urls.length} urls, styles: ${styles.length}`)
