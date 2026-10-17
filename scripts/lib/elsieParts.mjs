// The pieces of the cream "Elsie" print look (the owner's truck magnet, 2026-10-16), shared by the tailgate magnet
// and the yard sign: colours, Montserrat text, the name in Elsie Swash Caps with its gold dot, the gold sparkle
// divider, a QR code drawn in navy squares, the site with its red x, the thin rounded frame, and the bleed wrapper.
// All in drawing units of U per inch; positions in inches.
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { setWords } from './lettering.mjs'
import { fmt, glyphs, textLine, unifyNavy } from './logoArt.mjs'

export const U = 100
const FONTS = fileURLToPath(new URL('../../assets-source/brand/fonts/', import.meta.url))
export const ELSIE = FONTS + 'elsie-swash-caps/ElsieSwashCaps-Black.ttf'
export const MONTSERRAT = FONTS + 'montserrat/Montserrat-Variable.ttf'
export const C = { ink: '#1F304B', gold: '#D4AF63', deep: '#9A7428', red: '#D7262E', bg: '#FEFCF1' } // the magnet's own
export const SITE_URL = 'https://christmas-light-creations.com/'
export const PHONE = '281-819-0163'

// A Montserrat line by cap height or fitted to a width (inches); .svg(x, y, anchor) in drawing units.
export const T = (s, { font = MONTSERRAT, wght = 600, cap, fit, tracking = 0, fill = C.ink }) => {
  const g = glyphs(s, font, { wght })
  return textLine(s, { font, location: { wght }, em: cap ? (cap * U * g.upem) / g.capHeight : undefined, fitWidth: fit ? fit * U : undefined, tracking, fill })
}

// The name in Elsie Swash Caps Black, one or two lines, each line { text, x0, x1, base } (inches), sized by x-height
// and fitted to the widest line; the first i's dot gold, enlarged and raised like the magnet's.
export function elsieName(lines, xh, { lift = 0.05 } = {}) {
  const items = setWords(lines.map((l) => ({ ...l, x0: l.x0 * U, x1: l.x1 * U, base: l.base * U })), { font: ELSIE, xh: xh * U, accent: [0, 3], accentScale: 1.45, accentLift: lift * U })
  return items.map((it) => `<path transform="${it.tf}" fill="${it.role === 'accent' ? C.gold : C.ink}" d="${it.d}"/>`).join('')
}

const sparkle = (cx, cy, r) => `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`
// The divider: a deep-gold four-point sparkle between two rules tapering away from it, centred on cx at y, half wide.
export function divider(cx, y, half, { r = 0.26, gap = 0.2, t = 0.07 } = {}) {
  const rule = (inner, outer) => `<path fill="${C.deep}" d="M${fmt(outer * U)} ${fmt(y * U)} L${fmt(inner * U)} ${fmt((y - t / 2) * U)} Q${fmt((inner + Math.sign(inner - outer) * t / 2) * U)} ${fmt(y * U)} ${fmt(inner * U)} ${fmt((y + t / 2) * U)} Z"/>`
  return rule(cx - r - gap, cx - half) + rule(cx + r + gap, cx + half) + `<path fill="${C.deep}" d="${sparkle(cx * U, y * U, r * U)}"/>`
}

// A QR code to the site tagged ?sign=<code> (the lead shows where it came from: src/lib/sign.js), high error
// correction, navy squares on the cream; size includes a quiet zone of `quiet` squares. Returns { svg, url, version,
// squares, moduleMm }.
export function qrCode(code, { x, y, size, quiet = 3 }) {
  const url = `${SITE_URL}?sign=${code}`
  const q = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const n = q.modules.size, mod = size / (n + 2 * quiet)
  let d = ''
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!q.modules.get(row, col)) continue
      let run = 1
      while (col + run < n && q.modules.get(row, col + run)) run++
      d += `M${fmt((x + (quiet + col) * mod) * U)} ${fmt((y + (quiet + row) * mod) * U)}h${fmt(run * mod * U)}v${fmt(mod * U)}h${fmt(-run * mod * U)}Z`
      col += run - 1
    }
  }
  return { svg: `<path fill="${C.ink}" d="${d}"/>`, url, version: q.version, squares: n, moduleMm: mod * 25.4 }
}

// clcxmas.com in Montserrat Bold, its x red, w inches wide, centred on cx (or right-aligned to x1), baseline at base.
export function redXSite({ w, base, cx, x1 }) {
  const g = glyphs('clcxmas.com', MONTSERRAT, { wght: 700 })
  const advEm = g.glyphs.reduce((s, gl) => s + gl.advance, 0) / g.upem + 0.01 * (g.glyphs.length - 1)
  const em = (w * U) / advEm, k = em / g.upem
  let x = (x1 !== undefined ? x1 - w : cx - w / 2) * U
  return g.glyphs.map((gl, i) => {
    const p = gl.d ? `<path transform="translate(${fmt(x)} ${fmt(base * U)}) scale(${k} ${-k})" fill="${i === 3 ? C.red : C.ink}" d="${gl.d}"/>` : ''
    x += gl.advance * k + 0.01 * em
    return p
  }).join('')
}

// The thin navy frame, inset from the cut, its corners concentric with the cut's radius.
export const frame = (w, h, { inset = 0.35, radius = 0.75, line = 2 / 72 } = {}) =>
  `<rect x="${fmt(inset * U)}" y="${fmt(inset * U)}" width="${fmt((w - 2 * inset) * U)}" height="${fmt((h - 2 * inset) * U)}" rx="${fmt(Math.max(0, radius - inset) * U)}" fill="none" stroke="${C.ink}" stroke-width="${fmt(line * U)}"/>`

// The page at the cut size (cream, corners rounded to radius) and the upload with bleed (cream square out to b inches
// past the cut all round: BuildASign's designers are the cut plus 1/2 in each side).
export function pages(w, h, body, { radius = 0.75, b = 0.5 } = {}) {
  const trim = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}in" height="${h}in" viewBox="0 0 ${w * U} ${h * U}"><rect width="${w * U}" height="${h * U}" rx="${radius * U}" fill="${C.bg}"/>${body}</svg>`)
  const bled = unifyNavy(`<svg xmlns="http://www.w3.org/2000/svg" width="${w + 2 * b}in" height="${h + 2 * b}in" viewBox="${-b * U} ${-b * U} ${(w + 2 * b) * U} ${(h + 2 * b) * U}"><rect x="${-b * U}" y="${-b * U}" width="${(w + 2 * b) * U}" height="${(h + 2 * b) * U}" fill="${C.bg}"/>${body}</svg>`)
  return { trim, bled, b }
}
