// "Your property details" on /account/ (owner 2026-10-12: customers fill in
// the things the contract asks them to tell us): gate code, HOA and its
// lights-down-by date, things in the yard to avoid, pets. Pure: the
// updateMyDetails callable (functions/index.js) checks with detailsRequest and
// writes the fields onto the customer record; staff see them under Edit
// details and in Recent activity. Spec: docs/specs/account-service.md.
export const DETAIL_FIELDS = [
  ['gateCode', 'Gate code', 40],
  ['hoa', 'HOA (name, rules)', 160],
  ['lightsDownBy', 'HOA: lights down by', 40],
  ['hazards', 'Things to avoid in the yard', 600],
  ['pets', 'Pets', 120],
]
const KEYS = DETAIL_FIELDS.map(([k]) => k)
const LABEL = Object.fromEntries(DETAIL_FIELDS.map(([k, label]) => [k, label]))

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

// Browser request -> { details: { field: text } } (every field, blanks kept so a cleared box clears the record) or { error }.
export function detailsRequest(data) {
  if (!data || typeof data !== 'object') return { error: ['invalid-argument', 'Nothing to save'] }
  const details = {}
  for (const [key, label, max] of DETAIL_FIELDS) {
    const v = data[key]
    if (v != null && typeof v !== 'string') return { error: ['invalid-argument', `${label} must be text`] }
    const text = clean(v)
    if (text.length > max) return { error: ['invalid-argument', `Please keep ${label.toLowerCase()} under ${max} characters`] }
    details[key] = text
  }
  if (!Object.keys(data).some((k) => KEYS.includes(k))) return { error: ['invalid-argument', 'Nothing to save'] }
  return { details }
}

// What the account page shows: the current values (blank when unset).
export const detailsSummary = (c) => Object.fromEntries(KEYS.map((k) => [k, clean(c?.[k])]))

// Which fields a save changes, as labels for the activity line; [] when nothing changed.
export const detailsChanged = (before, after) => KEYS.filter((k) => clean(before?.[k]) !== clean(after?.[k])).map((k) => LABEL[k])
