// Tell Bing (and the other IndexNow engines: Yandex, Naver, Seznam) which pages
// changed, right after each deploy, so they recrawl within hours instead of
// months. One POST to api.indexnow.org fans out to every participating engine.
// Protocol: https://www.indexnow.org/documentation. Ours: docs/specs/indexnow.md.
//
// Two steps in the deploy workflow:
// - `--compare` (build job, before the deploy, while the live site still has the
//   old pages): reads each sitemap page built into dist/ and the live one, compares
//   them as a search engine reads them (pageText), writes the list to
//   changed-pages.json and gives each <lastmod> in dist/sitemap.xml its real date.
// - no flag (deploy job, once the site is live): pings the pages in
//   changed-pages.json (the `sitemap` artifact carries it over); none changed, no
//   ping. Without that file, every URL of dist/sitemap.xml, else of the live sitemap.
//
// Best effort: a bad answer or no network is a warning and exit code 0, so a
// deploy never fails because of a ping. `--dry-run` prints what would be sent and
// sends nothing; with no changed-pages.json but a built dist/, it compares first.
// `--compare --dry-run` prints the comparison and writes nothing.
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE = 'https://christmas-light-creations.com'
export const ENDPOINT = 'https://api.indexnow.org/indexnow'
export const MAX_URLS = 10000

const root = new URL('../', import.meta.url)
const CHANGES = new URL('changed-pages.json', root)
const SITEMAP = new URL('dist/sitemap.xml', root)

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const locOf = (loc) => loc.trim().replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e])

/** Every <loc> of a sitemap, in order, trimmed, XML entities decoded, duplicates dropped. */
export function sitemapUrls(xml) {
  const urls = []
  for (const [, loc] of String(xml).matchAll(/<loc>([^<]*)<\/loc>/g)) {
    const url = locOf(loc)
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

/** Each <url>'s <lastmod>, by its <loc> (URLs without one are left out). */
export function sitemapDates(xml) {
  const dates = {}
  for (const [, block] of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>([^<]*)<\/loc>/)
    const lastmod = block.match(/<lastmod>([^<]*)<\/lastmod>/)
    if (loc && lastmod) dates[locOf(loc[1])] = lastmod[1].trim()
  }
  return dates
}

/** True for a key IndexNow accepts: 8 to 128 letters, digits or dashes. */
export const validKey = (key) => /^[A-Za-z0-9-]{8,128}$/.test(key)

/** The key a public/ file proves: `<key>.txt` whose body is the key. '' for anything else (robots.txt, ai.txt…). */
export function keyOfFile(name, body) {
  const key = name.endsWith('.txt') ? name.slice(0, -4) : ''
  return validKey(key) && String(body).trim() === key ? key : ''
}

/** The body of one submission: host, key, keyLocation, urlList (only this host's URLs, at most 10,000). */
export function indexNowBody({ key, urls, site = SITE }) {
  if (!validKey(key)) throw new Error('IndexNow key must be 8 to 128 letters, digits or dashes')
  const host = new URL(site).host
  const ours = (u) => {
    try { return new URL(u).host === host } catch { return false }
  }
  return { host, key, keyLocation: `${site}/${key}.txt`, urlList: urls.filter(ours).slice(0, MAX_URLS) }
}

/** Every words template in content.js `urgency` with a {n} (days left): those words change by the day, not the page. */
export const countdowns = (urgency) => Object.values(urgency ?? {}).flatMap((v) =>
  typeof v === 'string' ? (v.includes('{n}') ? [v] : []) : v && typeof v === 'object' ? countdowns(v) : [])

// How React writes a string into the HTML, and a string as a literal regular expression.
const asHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
const asPattern = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A page as a search engine reads it (words, title, description, links, image names and
 * alt texts, structured data), without what changes with every build or every day:
 * scripts (except JSON-LD), styles, inline icons, stylesheet and preload links, class
 * and style attributes, the asset hashes in /assets/ names, the build day (`data-day`),
 * the number in each countdown template, comments, and the amount of whitespace.
 * Two builds of the same content give the same text; a change of wording does not.
 */
export function pageText(html, templates = []) {
  let text = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (s, attrs) => (/application\/ld\+json/i.test(attrs) ? s : ''))
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
    .replace(/<link\b[^>]*\brel="(?:stylesheet|modulepreload|preload|prefetch)"[^>]*>/gi, '')
    .replace(/\s(?:class|style|data-day)="[^"]*"/g, '')
    .replace(/(\/assets\/[^"'\s?#),]*?)-[\w-]{8}(\.\w+)/g, '$1$2')
  for (const t of templates) {
    text = text.replace(new RegExp(asHtml(t).split('{n}').map(asPattern).join('\\d+'), 'g'), t)
  }
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Which pages to tell the engines about. `built`: each sitemap URL's HTML from dist/;
 * `live`: the HTML the site serves now, or null when it couldn't be read (missing, an
 * error or no network), which counts as changed: when in doubt, ping. `removed`: URLs
 * the live sitemap lists and the new one no longer does (the engines learn they're gone).
 */
export function changedPages({ urls, built, live, liveUrls = [], templates = [] }) {
  const changed = urls.filter((u) => live[u] == null || pageText(built[u], templates) !== pageText(live[u], templates))
  return {
    changed,
    unchanged: urls.filter((u) => !changed.includes(u)),
    removed: liveUrls.filter((u) => !urls.includes(u)),
  }
}

/** Each URL's <lastmod>: today for a changed page; the live sitemap's date for an unchanged one, else today. */
export function lastmods({ urls, changed, live = {}, today }) {
  const known = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '') && d <= today
  return Object.fromEntries(urls.map((u) => [u, !changed.includes(u) && known(live[u]) ? live[u] : today]))
}

/** The sitemap with each <url>'s <lastmod> set from `dates` (added after <loc> where missing). */
export function withLastmods(xml, dates) {
  return String(xml).replace(/<url>([\s\S]*?)<\/url>/g, (block, inner) => {
    const loc = inner.match(/<loc>([^<]*)<\/loc>/)
    const date = loc && dates[locOf(loc[1])]
    if (!date) return block
    return `<url>${inner.replace(/<lastmod>[^<]*<\/lastmod>/, '').replace('</loc>', `</loc><lastmod>${date}</lastmod>`)}</url>`
  })
}

/** What each answer means, from the protocol, for the log line. */
export const MEANINGS = {
  200: 'submitted',
  202: 'received, key check pending',
  400: 'bad request: the body is malformed',
  403: 'key not valid: the key file is missing from the site root or does not hold the key',
  422: 'the URLs do not belong to the host, or the key does not match',
  429: 'too many requests',
}

// GitHub Actions turns ::warning:: / ::notice:: lines into annotations on the run.
const say = (level, line) => console.log(`${process.env.GITHUB_ACTIONS ? `::${level}::` : ''}${line}`)
const exists = (file) => access(file).then(() => true, () => false)
const path = (u) => new URL(u).pathname

async function findKey(dir) {
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.txt')) continue
    const key = keyOfFile(name, await readFile(new URL(name, dir), 'utf8'))
    if (key) return key
  }
  return ''
}

// What the site serves now, past the CDN's 10-minute cache (a query string is a new cache entry
// on GitHub Pages); null for a missing page, an error or no network.
const stamp = Date.now()
async function fetchLive(url) {
  try {
    const res = await fetch(`${url}?indexnow=${stamp}`, { signal: AbortSignal.timeout(20000) })
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

// The built file behind a sitemap URL: /design/ → dist/design/index.html.
const builtFile = (u) => new URL(`dist${path(u).replace(/\/$/, '/index.html')}`, root)

async function compare() {
  const xml = await readFile(SITEMAP, 'utf8')
  const urls = sitemapUrls(xml)
  const built = Object.fromEntries(await Promise.all(urls.map(async (u) => [u, await readFile(builtFile(u), 'utf8')])))
  const [liveXml, ...pages] = await Promise.all([fetchLive(`${SITE}/sitemap.xml`), ...urls.map(fetchLive)])
  const { urgency } = await import('../src/data/content.js')
  const result = changedPages({
    urls, built, live: Object.fromEntries(urls.map((u, i) => [u, pages[i]])),
    liveUrls: liveXml ? sitemapUrls(liveXml) : [], templates: countdowns(urgency),
  })
  const today = new Date().toISOString().slice(0, 10)
  const dates = lastmods({ urls, changed: result.changed, live: liveXml ? sitemapDates(liveXml) : {}, today })
  const unreachable = urls.filter((u, i) => pages[i] == null)
  return { compared: today, ...result, unreachable, liveSitemap: Boolean(liveXml), lastmod: dates, xml: withLastmods(xml, dates) }
}

function summary(c) {
  const list = (us) => us.map(path).join(' ') || 'none'
  const lines = [`IndexNow: compared ${c.changed.length + c.unchanged.length} pages with ${SITE}: changed ${list(c.changed)}; unchanged ${c.unchanged.length}`]
  if (c.removed.length) lines.push(`  dropped from the sitemap (pinged too): ${list(c.removed)}`)
  if (c.unreachable.length) lines.push(`  not on the live site, or not readable (counted as changed): ${list(c.unreachable)}`)
  if (!c.liveSitemap) lines.push('  live sitemap not readable: unchanged pages get today as <lastmod>')
  return lines.join('\n')
}

// Build job: the list for the ping, and the real dates in dist/sitemap.xml (both before the Pages artifact is made).
async function compareStep(dryRun) {
  const c = await compare()
  console.log(summary(c))
  if (dryRun) return console.log(Object.entries(c.lastmod).map(([u, d]) => `  ${d}  ${path(u)}`).join('\n'))
  await writeFile(SITEMAP, c.xml)
  const { compared, changed, unchanged, removed, unreachable } = c
  await writeFile(CHANGES, `${JSON.stringify({ compared, changed, unchanged, removed, unreachable }, null, 2)}\n`)
}

// What to ping: the build job's list; without it, every URL of the built sitemap, else of the live one.
async function toPing(dryRun) {
  if (await exists(CHANGES)) {
    const c = JSON.parse(await readFile(CHANGES, 'utf8'))
    return { source: `changed-pages.json (${c.compared})`, urls: [...c.changed, ...c.removed] }
  }
  if (await exists(SITEMAP)) {
    if (dryRun) {
      const c = await compare()
      console.log(summary(c))
      return { source: 'a comparison just now', urls: [...c.changed, ...c.removed] }
    }
    return { source: 'dist/sitemap.xml (no changed-pages.json: every URL)', urls: sitemapUrls(await readFile(SITEMAP, 'utf8')) }
  }
  // Not built here (the deploy job without the artifact): read what the site serves.
  const source = `${SITE}/sitemap.xml`
  const res = await fetch(source)
  if (!res.ok) throw new Error(`could not read ${source}: HTTP ${res.status}`)
  return { source: `${source} (every URL)`, urls: sitemapUrls(await res.text()) }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (process.argv.includes('--compare')) return compareStep(dryRun)
  const key = await findKey(new URL('public/', root))
  if (!key) return say('warning', 'IndexNow: no key file in public/ (<key>.txt whose body is the key); nothing sent')
  const { source, urls } = await toPing(dryRun)
  const body = indexNowBody({ key, urls })
  if (!body.urlList.length) return say('notice', `IndexNow: no page changed, per ${source}; nothing sent`)
  if (dryRun) return console.log(`IndexNow (dry run, nothing sent): ${body.urlList.length} URLs from ${source}\n${JSON.stringify(body, null, 2)}`)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })
  const detail = (await res.text()).trim().slice(0, 200)
  const line = `IndexNow: HTTP ${res.status} (${MEANINGS[res.status] || res.statusText}) for ${body.urlList.length} URLs from ${source}${detail ? `: ${detail}` : ''}`
  say(res.status === 200 || res.status === 202 ? 'notice' : 'warning', line)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => say('warning', `IndexNow: ${e.message}. The deploy is fine; the engines will crawl on their own.`))
}
