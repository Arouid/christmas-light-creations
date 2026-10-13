// "Your property details" on /account/ (owner 2026-10-12: customers fill in
// the things the contract asks them to tell us): gate code, HOA and its
// lights-down-by date, things in the yard to avoid, pets. Plus the one email
// preference (owner 2026-10-12): weather heads-ups and seasonal tips can be
// turned off there; agreements, bills, payment reminders and scheduling can't.
// Pure: the updateMyDetails callable (functions/index.js) checks with
// detailsRequest and writes the fields onto the customer record; staff see
// them under Edit details and in Recent activity. Spec: docs/specs/account-service.md.
export const DETAIL_FIELDS = [
  ['gateCode', 'Gate code', 40],
  ['hoa', 'HOA (name, rules)', 160],
  ['lightsDownBy', 'HOA: lights down by', 40],
  ['hazards', 'Things to avoid in the yard', 600],
  ['pets', 'Pets', 120],
]
// customers/{id}.emailNotices: false = no weather heads-ups or tips (default on).
export const NOTICES_FIELD = 'emailNotices'
export const NOTICES_LABEL = 'Weather and tips emails'
const KEYS = DETAIL_FIELDS.map(([k]) => k)
const LABEL = Object.fromEntries(DETAIL_FIELDS.map(([k, label]) => [k, label]))

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

// Browser request -> { details: { field: text, emailNotices?: bool } } or { error }.
// Text fields come as a set: when any is sent, every one is saved (blanks
// kept so a cleared box clears the record). emailNotices may come alone.
export function detailsRequest(data) {
  if (!data || typeof data !== 'object') return { error: ['invalid-argument', 'Nothing to save'] }
  const details = {}
  const hasText = Object.keys(data).some((k) => KEYS.includes(k))
  if (hasText) {
    for (const [key, label, max] of DETAIL_FIELDS) {
      const v = data[key]
      if (v != null && typeof v !== 'string') return { error: ['invalid-argument', `${label} must be text`] }
      const text = clean(v)
      if (text.length > max) return { error: ['invalid-argument', `Please keep ${label.toLowerCase()} under ${max} characters`] }
      details[key] = text
    }
  }
  if (data[NOTICES_FIELD] !== undefined) {
    if (typeof data[NOTICES_FIELD] !== 'boolean') return { error: ['invalid-argument', `${NOTICES_LABEL} must be on or off`] }
    details[NOTICES_FIELD] = data[NOTICES_FIELD]
  }
  if (!Object.keys(details).length) return { error: ['invalid-argument', 'Nothing to save'] }
  return { details }
}

// What the account page shows: the current values (blank when unset; notices on unless turned off).
export const detailsSummary = (c) => ({ ...Object.fromEntries(KEYS.map((k) => [k, clean(c?.[k])])), [NOTICES_FIELD]: c?.[NOTICES_FIELD] !== false })

// Which fields a save changes, as labels for the activity line; [] when nothing changed.
// Only the fields in `after` count (a notices-only save leaves the text alone).
export const detailsChanged = (before, after) => [
  ...KEYS.filter((k) => k in (after ?? {}) && clean(before?.[k]) !== clean(after[k])).map((k) => LABEL[k]),
  ...(NOTICES_FIELD in (after ?? {}) && (before?.[NOTICES_FIELD] !== false) !== (after[NOTICES_FIELD] !== false) ? [`${NOTICES_LABEL} ${after[NOTICES_FIELD] === false ? 'off' : 'on'}`] : []),
]
