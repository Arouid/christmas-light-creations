// After `vite build`: writes the area pages as static HTML (fast, fully
// readable by Google without running JavaScript) plus sitemap.xml.
// Run by `npm run build`; tests import areaPage.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { areas } from '../src/data/areas.js'
import { business, footerLinks, included, nav } from '../src/data/content.js'
import { adsLoaderScript } from '../src/lib/ads.js'
import { GRID_SIZES, GRID_SIZES_WIDE, gallerySrcSet } from '../src/lib/thumb.js'
import { BUSINESS_ID, SITE, areaDescription, pagePath, sitemapUrls, townName } from './pages.mjs'

const base = process.env.BASE_PATH || '/'
const dist = new URL('../dist/', import.meta.url)
const today = new Date().toISOString().slice(0, 10)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// content.js hrefs start at '/' or '#' (the home page's sections); the build's base may not be '/'.
const href = (h) => (h.startsWith('#') ? `${base}${h}` : `${base}${h.replace(/^\//, '')}`)

// Icon.jsx's icons, inlined since these pages carry no JavaScript bundle.
const icon = (d, cls = 'size-5') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" /></svg>`
const PHONE = 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2'
const CHAT = 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'
const USER = 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
const MENU = 'M4 7h16M4 12h16M4 17h16'
const CLOSE = 'M6 6l12 12M18 6L6 18'
const TEL = 'tel:+12818190163'

// The header is the site's (src/components/Header.jsx, design review 2026-10-14): the wide logo,
// ☎ and ☰ on phones and tablets, the menu, the number and Free estimate from lg up. It sticks to
// the top, so the phone is one tap away all the way down. The phone menu is a <details>, so it
// opens without JavaScript.
const header = `<header class="sticky top-0 z-40 border-b border-white/10 bg-night-950/90 backdrop-blur">
  <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
    <a href="${base}" class="flex min-w-0 shrink-0 items-center"><img src="${base}images/clc-logo-wide.png" alt="${esc(business.name)}" width="517" height="168" class="h-12 w-auto sm:h-14" /></a>
    <nav class="hidden items-center gap-5 lg:flex xl:gap-7" aria-label="Main">
      ${nav.map((n) => `<a href="${href(n.href)}" class="whitespace-nowrap text-sm font-medium text-slate-300 hover:text-glow-300">${esc(n.label)}</a>`).join('\n      ')}
      <a href="${TEL}" class="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-glow-300 hover:text-white">${icon(PHONE, 'size-4')} ${business.phone}</a>
      <a href="${base}#estimate" class="whitespace-nowrap rounded-full bg-glow-400 px-5 py-2 text-sm font-semibold text-night-950 shadow-[0_0_24px_-4px] shadow-glow-400/70 hover:bg-glow-300">Free estimate</a>
    </nav>
    <div class="flex items-center gap-1 lg:hidden">
      <a href="${TEL}" aria-label="Call ${business.phone}" class="grid size-11 place-items-center rounded-full text-glow-300">${icon(PHONE, 'size-6')}</a>
      <details class="group">
        <summary aria-label="Menu" class="grid size-11 cursor-pointer list-none place-items-center rounded-full [&::-webkit-details-marker]:hidden"><span class="group-open:hidden">${icon(MENU, 'size-6')}</span><span class="hidden group-open:block">${icon(CLOSE, 'size-6')}</span></summary>
        <nav class="absolute inset-x-0 top-16 flex h-[calc(100svh-4rem)] flex-col overflow-y-auto border-t border-white/10 bg-night-950 px-4 pb-6 pt-2" aria-label="Mobile">
          ${nav.map((n) => `<a href="${href(n.href)}" class="block border-b border-white/5 py-4 text-lg font-medium">${esc(n.label)}</a>`).join('\n          ')}
          <a href="${base}account/" class="flex items-center gap-3 border-b border-white/5 py-4 text-lg font-medium"><span class="text-glow-300">${icon(USER)}</span><span>Your account <span class="block text-sm font-normal text-slate-400">Sign in, pay, your install day</span></span></a>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <a href="${TEL}" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 py-3 font-semibold">${icon(PHONE)} Call</a>
            <a href="${business.smsHref}" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 py-3 font-semibold">${icon(CHAT)} Text us</a>
          </div>
          <a href="${base}#estimate" class="mt-3 block rounded-full bg-glow-400 py-3.5 text-center font-semibold text-night-950">Get a free estimate</a>
        </nav>
      </details>
    </div>
  </div>
</header>`

// The home page's thumb-reach bar (MobileCta.jsx), always shown here (no JavaScript to watch the
// page's own buttons); hidden while the menu is open.
const bar = `<div class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-white/10 bg-night-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden [body:has(details[open])_&]:hidden">
  <a href="${TEL}" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/10 py-3 font-semibold">${icon(PHONE)} Call</a>
  <a href="${base}#estimate" class="inline-flex min-h-11 items-center justify-center rounded-full bg-glow-400 py-3 font-semibold text-night-950">Free estimate</a>
</div>`

// The same footer links as the home page, 44 px tall.
const footer = `<footer class="border-t border-white/10 px-4 pb-28 pt-8 text-sm text-slate-400 lg:pb-10">
  <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6">
    <span class="inline-flex min-h-11 items-center">© ${new Date().getFullYear()} ${esc(business.name)} · ${esc(business.city)}</span>
    <a href="${TEL}" class="inline-flex min-h-11 items-center gap-2 font-semibold text-glow-300">${icon(PHONE)} ${business.phone}</a>
    ${footerLinks.map((l) => `<a href="${href(l.href)}" class="inline-flex min-h-11 items-center hover:text-glow-300">${esc(l.label)}</a>`).join('\n    ')}
  </div>
</footer>`

// An area page's <head>: title, description (pages.mjs), the share picture (its first photo) and
// the Service structured data, whose provider is the business described on the home page.
// `styles`: the main page's stylesheet(s), so the area pages match the site.
function head(a, styles) {
  const url = `${SITE}/${pagePath(a)}`
  const title = `Christmas Light Installation in ${a.name}, TX | ${business.name}`
  const description = areaDescription(a, business)
  const image = `${SITE}/images/gallery/${a.photos[0].file}`
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Christmas light installation in ${a.name}`,
    serviceType: 'Christmas light installation',
    url,
    image,
    areaServed: a.towns.map((t) => ({ '@type': 'Place', name: `${townName(t)}, TX` })),
    provider: { '@type': 'HomeAndConstructionBusiness', '@id': BUSINESS_ID, name: business.name, telephone: '+1-281-819-0163', url: `${SITE}/` },
  }
  return `<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#050b1a" />
<meta name="robots" content="noai, noimageai" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="${esc(business.name)}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:alt" content="${esc(a.photos[0].alt)}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
<link rel="icon" type="image/png" sizes="192x192" href="${base}icon-192.png" />
<link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />
<link rel="preload" href="${base}fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="${base}fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin />
${styles.map((h) => `<link rel="stylesheet" href="${h}" />`).join('\n')}
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
`
}

// The page's one script is the Google Ads loader (src/lib/ads.js), so an ad click
// that lands here keeps its click id; nothing at all when the tag is off.
export function areaPage(a, styles = []) {
  const others = areas.filter((o) => o.slug !== a.slug)
  const ads = adsLoaderScript()

  return `<!doctype html>
<html lang="en">
${head(a, styles)}<body>
<a href="#main" class="skip-link">Skip to main content</a>
${header}
<main id="main" tabindex="-1">
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
    <h2 class="sr-only">Our work nearby</h2>
    <ul class="mx-auto grid max-w-6xl grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
      ${a.photos.map((p, i) => `<li${i === 0 ? ' class="col-span-2 row-span-2"' : ''}><figure class="relative h-full overflow-hidden rounded-xl bg-night-900"><img src="${base}images/gallery/${p.file}" srcset="${gallerySrcSet(`${base}images/gallery/${p.file}`)}" sizes="${i === 0 ? GRID_SIZES_WIDE : GRID_SIZES}" alt="${esc(p.alt)}" loading="lazy" class="aspect-[4/3] h-full w-full object-cover" /><figcaption class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950/90 to-night-950/0 px-3 pb-2.5 pt-10 text-sm font-medium text-white">${esc(p.place)}</figcaption></figure></li>`).join('\n      ')}
    </ul>
    ${a.photosNote ? `<p class="mx-auto mt-3 max-w-6xl text-sm text-slate-400">${esc(a.photosNote)}</p>` : ''}
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
        ${others.map((o) => `<li><a href="${base}${pagePath(o)}" class="inline-flex min-h-11 items-center rounded-full bg-white/5 px-4 text-sm hover:bg-white/10">${esc(o.name)}</a></li>`).join('\n        ')}
        <li><a href="${base}" class="inline-flex min-h-11 items-center rounded-full bg-white/5 px-4 text-sm hover:bg-white/10">Home page</a></li>
      </ul>
    </div>
  </nav>
</main>
${footer}
${bar}
${ads ? `<script>${ads}</script>\n` : ''}</body>
</html>
`
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

async function build() {
  // Reuse the main page's stylesheet(s) so the area pages match the site.
  const mainHtml = await readFile(new URL('index.html', dist), 'utf8')
  const styles = [...mainHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/g)].map((m) => m[1])

  for (const a of areas) {
    const dir = new URL(pagePath(a), dist)
    await mkdir(dir, { recursive: true })
    await writeFile(new URL('index.html', dir), areaPage(a, styles))
  }

  for (const [from, to] of Object.entries(REDIRECTS)) {
    const target = `${base}${to}`
    const dir = new URL(`${from}/`, dist)
    await mkdir(dir, { recursive: true })
    await writeFile(new URL('index.html', dir), `<!doctype html><meta charset="utf-8"><title>Moved</title>`
      + `<link rel="canonical" href="${SITE}/${/^[#?]/.test(to) ? '' : to}"><meta name="robots" content="noindex, noai, noimageai">`
      + `<meta http-equiv="refresh" content="0; url=${target}"><script>location.replace(${JSON.stringify(target)})</script>`
      + `<a href="${target}">Continue to Christmas Light Creations</a>
`)
  }

  const urls = sitemapUrls(areas)
  await writeFile(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`)

  console.log(`area pages: ${areas.length}, redirects: ${Object.keys(REDIRECTS).length}, sitemap: ${urls.length} urls, styles: ${styles.length}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build()
