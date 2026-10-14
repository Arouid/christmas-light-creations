// Holiday icons (assets-source/stock/svg-repo-icons, SVG Repo, free with no credit:
// owner 2026-10-13) repainted in the site's palette by scripts/holiday-icons.mjs
// into public/images/holiday/. The stock files are red/green/yellow with a
// black outline; on the site every fill becomes gold, white, berry or pine by
// hue, and the outline becomes navy (invisible on the dark pages, a crisp
// line on white email backgrounds). Pure.
export const PALETTE = { navy: '#050b1a', gold: '#ffcf4d', goldLight: '#ffe08a', white: '#f1f4fb', berry: '#d7263d', pine: '#2a9d6a' }

const hex = (s) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(s).trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
}

// rgb (0..1) -> { h: 0..360, s: 0..1, l: 0..1 }
export function hsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60
  return { h, s, l }
}

// A stock fill -> the brand fill (null = not a colour we touch, e.g. "none" or a url()).
export function brandFill(fill) {
  const rgb = hex(fill)
  if (!rgb) return null
  const { h, s, l } = hsl(rgb)
  if (l < 0.22) return PALETTE.navy // the black outline
  if (s < 0.18 || l > 0.9) return PALETTE.white // whites and greys
  if (h < 20 || h >= 330) return PALETTE.berry // reds and pinks
  if (h < 70) return l > 0.72 ? PALETTE.goldLight : PALETTE.gold // oranges and yellows
  if (h < 170) return PALETTE.pine // greens
  return PALETTE.goldLight // blues and purples: a light gold, so nothing reads cold on navy
}

// The SVG text with every fill repainted; the SVG Repo comment dropped.
export function repaint(svg) {
  return String(svg)
    .replace(/<!--[^]*?-->\s*/g, '')
    .replace(/fill="(#[0-9a-fA-F]{3,6})"/g, (m, c) => `fill="${brandFill(c) ?? c}"`)
    .replace(/fill:\s*(#[0-9a-fA-F]{3,6})/g, (m, c) => `fill:${brandFill(c) ?? c}`)
    .replace(/stroke="(#[0-9a-fA-F]{3,6})"/g, (m, c) => `stroke="${brandFill(c) ?? c}"`)
}
