// Who's who on the team, shared by the staff app (src/lib/activity.js
// re-exports this) and the server (functions/index.js signs outgoing email
// with the sender's name, owner 2026-10-13). Pure.
//
// The team (owner, 2026-10-10), shown as first name + last initial: how each
// email starts -> their name, so the app shows names with no setup (no full
// addresses here: the repo is public). Also the suggestions in ⚙ Settings → Staff names.
// [how the email starts, name, title] (titles: owner 2026-10-13).
export const STAFF_PREFIXES = [['exatrum', 'Scott M.', 'Owner'], ['katiep', 'Katie P.', 'Customer care'], ['lacie', 'Lacie M.', 'Co-owner']]
export const STAFF_NAMES = STAFF_PREFIXES.map(([, n]) => n)
const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : '')

export const BUSINESS = 'Christmas Light Creations'

// Email -> name: ⚙ Settings → Staff names ([{ email, name }], shared) first,
// then a `name` on the staff list doc (Firebase console).
export function staffNamesMap(staffDocs = [], settingNames = []) {
  const out = {}
  for (const s of staffDocs ?? []) if (s?.id && s.name) out[s.id.toLowerCase()] = s.name
  for (const s of settingNames ?? []) if (s?.email && String(s.name ?? '').trim()) out[String(s.email).toLowerCase()] = String(s.name).trim()
  return out
}

// Staff email -> "First L.": ⚙ Settings / the staff list's `name` if set, the
// team above, else from the address ("pat.helper@…" -> "Pat H.", "pat@…" -> "Pat").
export function staffName(email, names = {}) {
  if (!email) return 'Someone'
  if (email === 'website') return 'Website'
  const set = names[String(email).toLowerCase()]
  if (set) return set
  const local = String(email).split('@')[0].toLowerCase()
  const known = STAFF_PREFIXES.find(([p]) => local.startsWith(p))
  if (known) return known[1]
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (!parts.length) return email
  return parts.length > 1 ? `${cap(parts[0])} ${parts.at(-1)[0].toUpperCase()}.` : cap(parts[0])
}

// Email -> title: ⚙ Settings → Staff names (`title`), else the team's own above, else none.
export function staffTitlesMap(settingNames = []) {
  const out = {}
  for (const s of settingNames ?? []) if (s?.email && String(s.title ?? '').trim()) out[String(s.email).toLowerCase()] = String(s.title).trim()
  return out
}
export function staffTitle(email, titles = {}) {
  if (!email) return ''
  const set = titles[String(email).toLowerCase()]
  if (set) return set
  const local = String(email).split('@')[0].toLowerCase()
  return STAFF_PREFIXES.find(([p]) => local.startsWith(p))?.[2] ?? ''
}

// "Katie P." -> "Katie" (the sign-off and the From name use the first name).
export const firstNameOf = (name) => String(name ?? '').trim().split(/\s+/)[0] || ''

// The From header for an email a person sends from info@: the address stays
// info@ (replies land in the shared inbox and sync into history), the name
// says who wrote it. No name -> the business alone.
export function fromHeader(name, address) {
  const first = firstNameOf(name)
  const display = first && first !== 'Someone' && first !== 'Website' ? `${first} at ${BUSINESS}` : BUSINESS
  return `"${display.replace(/"/g, '')}" <${address}>`
}
