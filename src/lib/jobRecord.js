// Job record (docs/specs/job-record.md): after-install photos and the
// "What's up" list of what's installed at a customer's house. Pure functions
// only (no React, no Firebase) so they can be tested; the browser and Storage
// parts live in src/leads/photos/.

export const MAX_PHOTO_PX = 1600
export const THUMB_PX = 400
export const PHOTO_QUALITY = 0.85
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 // same limit as storage.rules

// ---- Photos -----------------------------------------------------------------------

// Shrink to fit the long side in `max` px; never enlarge.
export function fitWithin(width, height, max) {
  const k = Math.min(1, max / Math.max(width || 1, height || 1))
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) }
}

let seq = 0
export const photoId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Where the files live in Storage (must match storage.rules).
export function photoPaths(customerId, season, id) {
  const dir = `customers/${customerId}/${season}`
  return { full: `${dir}/${id}.jpg`, thumb: `${dir}/${id}-thumb.jpg` }
}

// The customer's photos map (or an older array) → a list, newest first.
export function photoList(photos) {
  const list = Array.isArray(photos) ? photos : Object.entries(photos ?? {}).map(([id, p]) => ({ id, ...p }))
  return list.filter((p) => p && (p.url || p.thumbUrl)).toSorted((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0))
}

// [[season, photos newest first], …], newest season first.
export function photosBySeason(photos) {
  const groups = new Map()
  for (const p of photoList(photos)) {
    const s = String(p.season ?? '')
    if (!groups.has(s)) groups.set(s, [])
    groups.get(s).push(p)
  }
  return [...groups].toSorted((a, b) => b[0].localeCompare(a[0]))
}

// The photo staff picked to stand for the house (customer.housePhoto = a photo
// id; owner 2026-10-14): shown at the top of the card instead of Street View.
// null when none is picked, or when that photo is gone.
export function housePhotoOf(customer) {
  const id = customer?.housePhoto
  if (!id) return null
  return photoList(customer.photos).find((p) => p.id === id) ?? null
}

// The photo already on the record that came from the very same picture
// (entry.hash = SHA-256 of the picked file, photoStore.js), or null. Photos
// added before 2026-10-14 carry no hash, so they never match.
export function findByHash(photos, hash) {
  if (!hash) return null
  return photoList(photos).find((p) => p.hash === hash) ?? null
}

// Same rule as storage.rules: the person who added it, or the owner.
export function canDeletePhoto(photo, email, isOwner = false) {
  if (isOwner) return true
  const by = String(photo?.by ?? '').toLowerCase()
  return Boolean(email) && by === String(email).toLowerCase()
}

// "Oct 12", or "Oct 12, 2025" when it isn't this year.
export function photoDate(at, now = new Date()) {
  const d = new Date(Number(at) || 0)
  if (!Number.isFinite(d.getTime()) || !at) return ''
  const opts = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('en-US', opts)
}

// Firebase Storage error → what to tell the crew.
export function storageProblem(err) {
  const code = String(err?.code ?? '')
  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') return 'Not allowed: you must be signed in as staff (and only the person who added a photo, or the owner, can remove it).'
  if (code === 'storage/quota-exceeded') return 'The photo storage is full. Tell Scott.'
  if (code === 'storage/retry-limit-exceeded') return 'Upload timed out. Check your signal and try again.'
  if (code === 'storage/canceled') return 'Upload cancelled.'
  if (code === 'storage/unknown' || code === 'storage/object-not-found' || code === 'storage/bucket-not-found' || code === 'storage/no-default-bucket') {
    return 'Photos aren’t turned on yet: Firebase Storage needs to be enabled for the project (Scott, docs/TODO.md #51).'
  }
  return `Couldn’t upload: ${err?.message ?? err}`
}

// ---- What's up --------------------------------------------------------------------

export const newInstalledItem = (fields = {}) => ({ id: photoId().replace(/^p/, 'w'), what: '', amount: '', color: '', notes: '', ...fields })

const isCount = (amount) => /^\d+$/.test(String(amount ?? '').trim())

// One line as people say it: "2 wrapped oaks", "Roofline C9 warm white 180 ft", "Wreath 36 in".
export function installedLine(item) {
  const what = String(item?.what ?? '').trim()
  const amount = String(item?.amount ?? '').trim()
  const color = String(item?.color ?? '').trim()
  if (!what && !amount && !color) return ''
  if (isCount(amount) && amount !== '1') return [amount, what, color].filter(Boolean).join(' ')
  return [what, color, amount === '1' ? '' : amount].filter(Boolean).join(' ')
}

export const installedLines = (customer) => (customer?.installed ?? []).map(installedLine).filter(Boolean)

// The list in one line for a table cell ("Roofline C9 warm white 180 ft · 2 wrapped oaks"), cut at `max` characters.
export function installedSummary(customer, max = 90) {
  const text = installedLines(customer).join(' · ')
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

// Colour words as they appear on proposal lines and in the designer.
export const COLORS = ['warm white', 'cool white', 'pure white', 'soft white', 'multicolor', 'multi-color', 'multi', 'red and white', 'red & white', 'red/white', 'candy cane', 'red', 'green', 'blue', 'gold', 'amber', 'orange', 'purple', 'pink', 'white', 'clear']

// The first colour mentioned in a text, in its own casing ('' if none).
export function colorIn(text) {
  const t = String(text ?? '')
  for (const c of COLORS) {
    const m = t.match(new RegExp(`(^|[^a-z])(${c.replace(/[-/&]/g, '\\$&')})(?![a-z])`, 'i'))
    if (m) return m[2].toLowerCase() === 'multi' ? 'multicolor' : m[2].toLowerCase()
  }
  return ''
}

// qty × unit → "180 ft"; a lone 1 with no unit is nothing worth saying.
export function amountText(qty, unit) {
  const n = Number(qty)
  if (!Number.isFinite(n) || n <= 0) return ''
  const u = String(unit ?? '').trim()
  const num = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
  if (!u) return n === 1 ? '' : num
  return `${num} ${u}`
}

// The signed proposal's install items → What's up lines (takedown/removal
// lines skipped). Staff check and fix them before saving.
export function installedFromProposal(proposal) {
  const items = (proposal?.items ?? []).filter((i) => i && i.due !== 'removal')
  return items.map((i) => {
    const label = String(i.label ?? '').trim()
    const details = String(i.details ?? '').trim()
    const color = colorIn(details) || colorIn(label)
    // Details minus the colour word (and leftover punctuation) become notes.
    const notes = color
      ? details.replace(new RegExp(color.replace(/[-/&]/g, '\\$&'), 'i'), '').replace(/^[\s,;·-]+|[\s,;·-]+$/g, '').replace(/\s*,\s*,/g, ',').trim()
      : details
    return newInstalledItem({ what: label, amount: amountText(i.qty, i.unit), color, notes })
  }).filter((x) => x.what || x.amount)
}

// The newest signed (or countersigned) proposal, or null.
export function latestSigned(proposals) {
  const when = (p) => String(p.signedAt ?? p.countersignedAt ?? p.savedAt ?? '')
  return (proposals ?? []).filter((p) => p && ['signed', 'countersigned'].includes(p.status))
    .toSorted((a, b) => when(b).localeCompare(when(a)))[0] ?? null
}
