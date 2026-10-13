// Tell Bing (and the other IndexNow engines: Yandex, Naver, Seznam) which pages
// changed, right after each deploy, so they recrawl within hours instead of
// months. The URLs come from the sitemap built into dist/ (the deploy job
// downloads it as the `sitemap` artifact) or, when that file is missing, from
// the live https://christmas-light-creations.com/sitemap.xml. One POST to
// api.indexnow.org fans out to every participating engine.
// Protocol: https://www.indexnow.org/documentation. Ours: docs/specs/indexnow.md.
//
// Best effort: a bad answer or no network is a warning and exit code 0, so a
// deploy never fails because of a ping. `--dry-run` prints the body, sends nothing.
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE = 'https://christmas-light-creations.com'
export const ENDPOINT = 'https://api.indexnow.org/indexnow'
export const MAX_URLS = 10000

const root = new URL('../', import.meta.url)

/** Every <loc> of a sitemap, in order, trimmed, XML entities decoded, duplicates dropped. */
export function sitemapUrls(xml) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
  const urls = []
  for (const [, loc] of String(xml).matchAll(/<loc>([^<]*)<\/loc>/g)) {
    const url = loc.trim().replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => entities[e])
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
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

async function findKey(dir) {
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.txt')) continue
    const key = keyOfFile(name, await readFile(new URL(name, dir), 'utf8'))
    if (key) return key
  }
  return ''
}

async function sitemap() {
  try {
    return { source: 'dist/sitemap.xml', xml: await readFile(new URL('dist/sitemap.xml', root), 'utf8') }
  } catch {
    // Not built here (the deploy job without the artifact): read what the site serves.
  }
  const source = `${SITE}/sitemap.xml`
  const res = await fetch(source)
  if (!res.ok) throw new Error(`could not read ${source}: HTTP ${res.status}`)
  return { source, xml: await res.text() }
}

async function main() {
  const key = await findKey(new URL('public/', root))
  if (!key) return say('warning', 'IndexNow: no key file in public/ (<key>.txt whose body is the key); nothing sent')
  const { source, xml } = await sitemap()
  const body = indexNowBody({ key, urls: sitemapUrls(xml) })
  if (!body.urlList.length) return say('warning', `IndexNow: no URLs in ${source}; nothing sent`)
  if (process.argv.includes('--dry-run')) return console.log(JSON.stringify(body, null, 2))
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
