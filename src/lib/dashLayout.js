// Home panel layout: one ordered flow of panels, each with a width: Half (two
// across), 2/3, 1/3, or Wide (the whole row). Computers pack them into rows by
// width and measured height (bands()); phones show them in order, one column.
// Staff arrange it themselves (drag, arrows, size button); the result is kept
// per device in localStorage (src/leads/HomeView.jsx).

export const PANELS = [
  ['season', 'Season'], ['activity', 'Recent activity'], ['who', 'Who’s on'], ['scheduled', 'Scheduled emails'],
  ['signins', 'Sign-ins'], ['routes', 'Today’s routes'], ['status', 'System status'], ['spent', 'Spent this month'], ['ads', 'Google Ads'],
  ['checklist', 'My checklist'], ['marketing', 'Marketing'],
]
// Width in sixths of the row, and the button label.
export const SIZES = { half: { units: 3, label: 'Half' }, two: { units: 4, label: '2/3' }, one: { units: 2, label: '1/3' }, wide: { units: 6, label: 'Wide' } }
const CYCLE = ['half', 'two', 'one', 'wide']
export const DEFAULT_LAYOUT = { order: ['season', 'checklist', 'marketing', 'activity', 'who', 'scheduled', 'signins', 'routes', 'status', 'spent', 'ads'], size: { activity: 'wide' } }
export const LAYOUT_KEY = 'clcHomeLayout'
const KNOWN = PANELS.map(([k]) => k)

// Every known panel exactly once, unknown keys dropped, panels added since the
// layout was saved appended. Reads the older shapes too ({ left, right } and { wide: [] }).
export function normalize(layout) {
  const seen = new Set()
  const keep = (list) => (Array.isArray(list) ? list : []).filter((k) => KNOWN.includes(k) && !seen.has(k) && seen.add(k))
  const order = layout?.order ? keep(layout.order) : [...keep(layout?.left), ...keep(layout?.right)]
  const missing = KNOWN.filter((k) => !seen.has(k))
  const size = {}
  for (const k of Array.isArray(layout?.wide) ? layout.wide : []) if (KNOWN.includes(k)) size[k] = 'wide'
  for (const [k, v] of Object.entries(layout?.size ?? {})) if (KNOWN.includes(k) && SIZES[v] && v !== 'half') size[k] = v
  return { order: [...order, ...missing], size }
}

// What's stored (JSON, or junk) -> a usable layout.
export function readLayout(stored) {
  try { return normalize(JSON.parse(stored ?? '')) } catch { return DEFAULT_LAYOUT }
}

export const sizeOf = (layout, key) => layout.size[key] ?? 'half'
export const isWide = (layout, key) => sizeOf(layout, key) === 'wide'

// The size button: Half → 2/3 → 1/3 → Wide → Half.
export function cycleSize(layout, key) {
  if (!KNOWN.includes(key)) return layout
  const next = CYCLE[(CYCLE.indexOf(sizeOf(layout, key)) + 1) % CYCLE.length]
  return normalize({ ...layout, size: { ...layout.size, [key]: next } })
}
export const toggleWide = (layout, key) => normalize({ ...layout, size: { ...layout.size, [key]: isWide(layout, key) ? 'half' : 'wide' } })

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

// How a computer screen lays the flow out: rows of cells, each cell a width
// (in sixths) holding a stack of panels of that width. A panel goes, in
// order: on top of a same-width cell in the current row if it still fits
// beside the row's first cell by height (px measured by the page; `slack`
// lets it run a little past), else in a new cell if the row has room, else
// in a new row. With no heights yet, every panel starts its own cell.
export function bands(layout, heights = {}, slack = 64) {
  const h = (k) => Number(heights[k]) || 0
  const measured = layout.order.some((k) => h(k) > 0)
  const rows = []
  let row = null
  const cellH = (c) => c.keys.reduce((t, k) => t + h(k), 0)
  for (const key of layout.order) {
    const units = SIZES[sizeOf(layout, key)].units
    if (row) {
      const lead = cellH(row.cells[0])
      const stack = row.cells.slice(1).find((c) => c.units === units && measured && cellH(c) + h(key) <= lead + slack)
      if (stack) { stack.keys.push(key); continue }
      const used = row.cells.reduce((t, c) => t + c.units, 0)
      if (used + units <= 6) { row.cells.push({ units, keys: [key] }); continue }
    }
    row = { cells: [{ units, keys: [key] }] }
    rows.push(row)
  }
  return rows
}
