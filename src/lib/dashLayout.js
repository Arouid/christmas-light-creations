// Home panel layout: one ordered flow of panels, each "half" (two fit side by
// side on a computer) or "wide" (full width). Phones show them in order, one
// column. Staff arrange it themselves (drag, arrows, Wide/Half); the result
// is kept per device in localStorage (src/leads/HomeView.jsx).

export const PANELS = [
  ['season', 'Season'], ['activity', 'Recent activity'], ['who', 'Who’s on'], ['scheduled', 'Scheduled emails'],
  ['signins', 'Sign-ins'], ['routes', 'Today’s routes'], ['status', 'System status'], ['spent', 'Spent this month'], ['ads', 'Google Ads'],
]
export const DEFAULT_LAYOUT = { order: ['season', 'who', 'activity', 'scheduled', 'signins', 'routes', 'status', 'spent', 'ads'], wide: ['activity'] }
export const LAYOUT_KEY = 'clcHomeLayout'
const KNOWN = PANELS.map(([k]) => k)

// Every known panel exactly once, unknown keys dropped, panels added since the
// layout was saved appended. Also reads the first version ({ left, right }).
export function normalize(layout) {
  const seen = new Set()
  const keep = (list) => (Array.isArray(list) ? list : []).filter((k) => KNOWN.includes(k) && !seen.has(k) && seen.add(k))
  const order = layout?.order ? keep(layout.order) : [...keep(layout?.left), ...keep(layout?.right)]
  const missing = KNOWN.filter((k) => !seen.has(k))
  const wide = (Array.isArray(layout?.wide) ? layout.wide : []).filter((k) => KNOWN.includes(k))
  return { order: [...order, ...missing], wide: [...new Set(wide)] }
}

// What's stored (JSON, or junk) -> a usable layout.
export function readLayout(stored) {
  try { return normalize(JSON.parse(stored ?? '')) } catch { return DEFAULT_LAYOUT }
}

export const isWide = (layout, key) => layout.wide.includes(key)

export function toggleWide(layout, key) {
  if (!KNOWN.includes(key)) return layout
  return normalize({ ...layout, wide: isWide(layout, key) ? layout.wide.filter((k) => k !== key) : [...layout.wide, key] })
}

// Drag: put `key` right before `beforeKey` (or at the end when null).
export function placeBefore(layout, key, beforeKey = null) {
  if (!KNOWN.includes(key) || key === beforeKey) return layout
  const order = layout.order.filter((k) => k !== key)
  const at = beforeKey ? order.indexOf(beforeKey) : -1
  if (at < 0) order.push(key)
  else order.splice(at, 0, key)
  return normalize({ ...layout, order })
}

// Arrows: one step earlier ('up') or later ('down') in the flow. Unchanged at the ends.
export function nudge(layout, key, dir) {
  const i = layout.order.indexOf(key)
  const j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= layout.order.length) return layout
  const order = [...layout.order]
  order.splice(i, 1)
  order.splice(j, 0, key)
  return normalize({ ...layout, order })
}

// How a computer screen lays the flow out: runs of Half panels become a band
// of two flush columns (left, right, left, right…); a Wide panel is a band of
// its own. Phones ignore this and show layout.order top to bottom.
export function bands(layout) {
  const out = []
  let run = null
  for (const key of layout.order) {
    if (isWide(layout, key)) {
      run = null
      out.push({ type: 'wide', key })
      continue
    }
    if (!run) { run = { type: 'pair', left: [], right: [] }; out.push(run) }
    ;(run.left.length <= run.right.length ? run.left : run.right).push(key)
  }
  return out
}
