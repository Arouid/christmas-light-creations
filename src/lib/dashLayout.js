// Home panel layout: which panel sits where (two columns on a computer, one
// list on a phone). Staff arrange it themselves (drag, or the arrow buttons);
// the result is kept per device in localStorage (src/leads/HomeView.jsx).

export const PANELS = [
  ['season', 'Season'], ['activity', 'Recent activity'], ['who', 'Who’s on'], ['scheduled', 'Scheduled emails'],
  ['signins', 'Sign-ins'], ['routes', 'Today’s routes'], ['status', 'System status'], ['spent', 'Spent this month'],
]
export const DEFAULT_LAYOUT = { left: ['season', 'activity'], right: ['who', 'scheduled', 'signins', 'routes', 'status', 'spent'] }
export const LAYOUT_KEY = 'clcHomeLayout'
const KNOWN = PANELS.map(([k]) => k)

// Every known panel exactly once; unknown keys dropped; panels added since
// the layout was saved go to the end of the right column.
export function normalize(layout) {
  const seen = new Set()
  const col = (list) => (Array.isArray(list) ? list : []).filter((k) => KNOWN.includes(k) && !seen.has(k) && seen.add(k))
  const left = col(layout?.left)
  const right = col(layout?.right)
  const missing = KNOWN.filter((k) => !seen.has(k))
  return { left, right: [...right, ...missing] }
}

// What's stored (JSON, or junk) -> a usable layout.
export function readLayout(stored) {
  try { return normalize(JSON.parse(stored ?? '')) } catch { return DEFAULT_LAYOUT }
}

// Put `key` in column `col` before `beforeKey` (or at the end when null).
export function placeBefore(layout, key, col, beforeKey = null) {
  if (!KNOWN.includes(key) || !['left', 'right'].includes(col) || key === beforeKey) return layout
  const left = layout.left.filter((k) => k !== key)
  const right = layout.right.filter((k) => k !== key)
  const next = { left, right }
  const list = next[col]
  const at = beforeKey ? list.indexOf(beforeKey) : -1
  if (at < 0) list.push(key)
  else list.splice(at, 0, key)
  return normalize(next)
}

// Arrow buttons: 'up' / 'down' within the column, 'left' / 'right' to the
// other column (same row, or the end). Unchanged when it can't move.
export function nudge(layout, key, dir) {
  const col = layout.left.includes(key) ? 'left' : layout.right.includes(key) ? 'right' : null
  if (!col) return layout
  const list = layout[col]
  const i = list.indexOf(key)
  if (dir === 'up' || dir === 'down') {
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= list.length) return layout
    const moved = [...list]
    moved.splice(i, 1)
    moved.splice(j, 0, key)
    return normalize({ ...layout, [col]: moved })
  }
  const other = dir === 'left' ? 'left' : 'right'
  if (other === col) return layout
  return placeBefore(layout, key, other, layout[other][i] ?? null)
}

// Phone order: one list, left column then right.
export const asList = (layout) => [...layout.left, ...layout.right]
