// Staff notes (owner 2026-10-13: "an area for Lacie and Katie to keep
// personal notes they can share with me"). One Firestore `notes` record per
// note: { title, text, by (the writer's email, lowercase), shared, createdAt,
// updatedAt, updatedBy }. Private unless `shared`; then the whole team sees
// it (read-only for everyone but the writer). firestore.rules enforce that;
// the app reads two live queries (mine, shared) and merges them here. Pure.
export const TITLE_MAX = 120
export const TEXT_MAX = 5000

export const norm = (email) => String(email ?? '').trim().toLowerCase()

// Browser -> what gets saved, or { problem }.
export function noteRecord({ title, text, shared }, email) {
  const t = String(title ?? '').replace(/\s+/g, ' ').trim()
  const body = String(text ?? '').replace(/\r\n?/g, '\n').trimEnd()
  if (!t && !body.trim()) return { problem: 'Write something first.' }
  if (t.length > TITLE_MAX) return { problem: `Title: ${TITLE_MAX} characters at most.` }
  if (body.length > TEXT_MAX) return { problem: `Note: ${TEXT_MAX.toLocaleString('en-US')} characters at most.` }
  return { record: { title: t || firstLine(body), text: body, by: norm(email), shared: Boolean(shared) } }
}

export const firstLine = (text) => String(text ?? '').split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 60) || 'Untitled'

const ms = (t) => (t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : Number(t) || 0)
export const newestFirst = (a, b) => ms(b.updatedAt ?? b.createdAt) - ms(a.updatedAt ?? a.createdAt)

// mine + shared (two queries) -> { mine, fromOthers: [[email, notes]] }, each newest first, no duplicates.
export function splitNotes(mine = [], shared = [], email) {
  const me = norm(email)
  const seen = new Set()
  const own = [...(mine ?? []), ...(shared ?? []).filter((n) => norm(n.by) === me)]
    .filter((n) => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
    .sort(newestFirst)
  const others = new Map()
  for (const n of (shared ?? []).filter((n) => norm(n.by) !== me).sort(newestFirst)) {
    const k = norm(n.by)
    if (!others.has(k)) others.set(k, [])
    others.get(k).push(n)
  }
  return { mine: own, fromOthers: [...others.entries()] }
}

// Search over title and text, every word must match.
export function searchNotes(notes, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return notes
  return notes.filter((n) => { const hay = `${n.title ?? ''} ${n.text ?? ''}`.toLowerCase(); return words.every((w) => hay.includes(w)) })
}

// "Oct 13, 9:41 PM" for the list.
export const whenText = (t) => (ms(t) ? new Date(ms(t)).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')
