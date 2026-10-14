// A new hero photo on every visit (owner 2026-10-14: "can it just load a new
// photo per visit?"). The pool is `heroPhotos` in src/data/content.js.
//
// The pick has to happen before the photo starts downloading, or the phone
// would fetch two photos and the hero would flash. So the built home page
// carries `heroScript(...)` near the top of <head> (scripts/prerender.mjs puts
// it there): it picks one photo, sets the CSS variable --hero-photo on <html>
// and preloads that photo only. The hero's background reads the variable and
// falls back to the first photo of the pool (no JavaScript, or a browser too
// old for the script). In `npm run dev` there is no built HTML, so the hero
// calls showHero itself once it has drawn.
//
// The browser remembers only the number of the last photo it showed
// (localStorage, HERO_KEY), so the next visit opens on a different one. The
// privacy page says so ("What your browser keeps").

export const HERO_KEY = 'clc-hero'
export const HERO_VAR = '--hero-photo'

// Picks a photo, remembers it, shows it. Self-contained: the build inlines
// its source into the page, so it may use nothing from outside its arguments.
// `getStore` returns localStorage (reading it can throw when storage is
// blocked); `random` is Math.random. Returns the index shown.
export function showHero(photos, key, varName, doc, getStore, random) {
  let store = null
  try { store = getStore() } catch { store = null }
  let last = -1
  try { last = parseInt(store ? store.getItem(key) : '', 10) } catch { last = -1 }
  const n = photos.length
  let i = 0
  if (n > 1 && last >= 0 && last < n) {
    i = Math.floor(random() * (n - 1))
    if (i >= last) i += 1
  } else if (n > 1) {
    i = Math.floor(random() * n)
  }
  try { if (store) store.setItem(key, String(i)) } catch { /* storage full or blocked: still show it */ }
  const src = photos[i]
  doc.documentElement.style.setProperty(varName, `url("${src}")`)
  const link = doc.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = src
  link.fetchPriority = 'high'
  doc.head.appendChild(link)
  return i
}

// The <script> body for the built page's <head>.
export const heroScript = (photos) =>
  `(${showHero.toString()})(${JSON.stringify(photos)},${JSON.stringify(HERO_KEY)},${JSON.stringify(HERO_VAR)},document,function(){return window.localStorage},Math.random)`

// The hero's background style: the picked photo, else the first of the pool.
export const heroBackground = (photos) => ({
  backgroundImage: `var(${HERO_VAR}, url("${photos[0]}"))`,
  backgroundPosition: '65% center',
})
