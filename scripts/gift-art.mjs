// The gift-wrapping page's licensed decorations (docs/specs/gift-wrapping.md):
// the owner's Vecteezy Pro vectors (raw EPS files in
// assets-source/stock/vecteezy/packs/gift-wrap/, git-ignored, never shipped)
// → public/images/gift-wrap/decor/. Decoration only: no gifts in any of it.
//
// Each EPS is drawn by Ghostscript (installed by the owner, 2026-10-15), then
// the white background the artist built into most of them (and a thin frame
// round some) is taken out: the near-white, colourless area joined to the
// edges becomes see-through, and
// the soft grey shadows in it become see-through shade (white "colour to
// alpha"), so the pieces sit on the page's pale wrapping paper with no box.
//   node scripts/gift-art.mjs
// Ghostscript elsewhere: GS="C:\…\gswin64c.exe" node scripts/gift-art.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

const GS = process.env.GS || 'C:\\Program Files\\gs\\gs10.08.0\\bin\\gswin64c.exe'
const PACK = 'assets-source/stock/vecteezy/packs/gift-wrap'
const OUT = 'public/images/gift-wrap/decor'
mkdirSync(OUT, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'gift-art-'))

// EPS → RGBA pixels at `dpi`.
function render(eps, dpi) {
  const png = join(tmp, 'r.png')
  execFileSync(GS, ['-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pngalpha', `-r${dpi}`, `-sOutputFile=${png}`, eps])
  return sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
}

// The white background (and the grey shadows on it) → see-through.
function keyWhite({ data, info }) {
  const W = info.width, H = info.height
  const light = (p) => { const i = p * 4, lo = Math.min(data[i], data[i + 1], data[i + 2]), hi = Math.max(data[i], data[i + 1], data[i + 2]); return lo >= 170 && hi - lo <= 22 }
  // Some artboards have a 1 px frame drawn round them: the outer 2 px count as background.
  const edge = (p) => { const x = p % W, y = (p / W) | 0; return x < 2 || y < 2 || x >= W - 2 || y >= H - 2 }
  const bg = new Uint8Array(W * H)
  const todo = []
  for (let x = 0; x < W; x++) todo.push(x, (H - 1) * W + x)
  for (let y = 0; y < H; y++) todo.push(y * W, y * W + W - 1)
  while (todo.length) {
    const p = todo.pop()
    if (bg[p] || !(edge(p) || light(p))) continue
    bg[p] = 1
    const x = p % W
    if (x > 0) todo.push(p - 1)
    if (x < W - 1) todo.push(p + 1)
    if (p >= W) todo.push(p - W)
    if (p < (H - 1) * W) todo.push(p + W)
  }
  for (let p = 0; p < W * H; p++) {
    if (!bg[p]) continue
    const i = p * 4
    if (edge(p)) { data[i + 3] = 0; continue }
    const a = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) / 255
    for (let c = 0; c < 3; c++) data[i + c] = a ? Math.round((data[i + c] - (1 - a) * 255) / a) : 0
    data[i + 3] = Math.round(a * data[i + 3])
  }
  return { data, info, bg }
}

// Rows (or columns) of a line across the art that aren't background.
const solidRun = (bg, W, H, { x, y }) => {
  const hits = []
  if (x !== undefined) for (let r = 0; r < H; r++) { if (!bg[r * W + x]) hits.push(r) }
  else for (let c = 0; c < W; c++) { if (!bg[y * W + c]) hits.push(c) }
  return [hits[0], hits.at(-1)]
}

const image = ({ data, info }) => sharp(data, { raw: info })
async function save(name, pipeline, widths) {
  const buf = await pipeline.png().toBuffer()
  for (const w of widths) {
    const file = `${OUT}/${name}${widths.length > 1 ? `-${w}` : ''}.webp`
    const r = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(file)
    console.log(`${file}: ${r.width}×${r.height}, ${Math.round(r.size / 1024)} KB`)
  }
}
// A part of the art, as its own picture (so a trim after it sees only that part).
const crop = async (art, l, t, r, b) => {
  const W = art.info.width, H = art.info.height
  const left = Math.round(l * W), top = Math.round(t * H)
  return sharp(await image(art).extract({ left, top, width: Math.round(r * W) - left, height: Math.round(b * H) - top }).png().toBuffer())
}

try {
  // 1. The main bow (red-realistic-ribbon-bow, 69103390) and its ribbon. The band runs edge to
  // edge; the bow sits on its left third. The bow is cut with a sliver of band each side, and a thin
  // slice of plain band becomes the ribbon the page repeats across the top and down the middle.
  {
    const art = keyWhite(await render(`${PACK}/red-realistic-ribbon-bow_69103390/vecteezy_red-realistic-ribbon-bow_69103390.eps`, 60))
    const { info, bg } = art
    const W = info.width, H = info.height
    const sliceX = Math.round(W * 0.93)
    const [b0, b1] = solidRun(bg, W, H, { x: sliceX }) // the band's rows, away from the bow
    // Columns where the art is taller than the band: the bow.
    const tall = []
    for (let c = 0; c < W; c++) { let n = 0; for (let r = 0; r < H; r++) if (!bg[r * W + c]) n++; if (n > (b1 - b0) * 1.6) tall.push(c) }
    // A sliver of band each side only: the page's own ribbon runs under the bow, and a longer stub
    // (shaded darker near the bow) would show a seam against it.
    const stub = Math.round((b1 - b0) * 0.08)
    const x0 = Math.max(0, tall[0] - stub), x1 = Math.min(W - 1, tall.at(-1) + stub)
    let y0 = H, y1 = 0
    for (let r = 0; r < H; r++) for (let c = x0; c <= x1; c++) if (!bg[r * W + c]) { y0 = Math.min(y0, r); y1 = Math.max(y1, r); break }
    const bow = image(art).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    // Where the band crosses the bow picture, for lining it up with the page's ribbon (GiftPage.jsx BOW).
    console.log(`bow: ${x1 - x0 + 1}×${y1 - y0 + 1}; band from ${((b0 - y0) / (y1 - y0 + 1) * 100).toFixed(1)}% to ${((b1 + 1 - y0) / (y1 - y0 + 1) * 100).toFixed(1)}% of its height`)
    await save('bow', bow, [480, 800])
    const slice = await image(art).extract({ left: sliceX, top: b0, width: 24, height: b1 - b0 + 1 }).png().toBuffer()
    await save('ribbon-x', sharp(slice).resize({ width: 12, height: 48, fit: 'fill' }), [12])
    await save('ribbon-y', sharp(slice).rotate(90).resize({ width: 48, height: 12, fit: 'fill' }), [48])
  }

  // 2. Holly (christmas-holly-leaves-and-red-berries-3d-illustration, 66917022): the two sprigs.
  {
    const art = keyWhite(await render(`${PACK}/christmas-holly-leaves-and-red-berries-3d-illustration_66917/vecteezy_christmas-holly-leaves-and-red-berries-3d-illustration_66917022.eps`, 40))
    await save('holly-left', (await crop(art, 0.115, 0.2, 0.362, 0.795)).trim(), [240])
    await save('holly-right', (await crop(art, 0.615, 0.2, 0.884, 0.795)).trim(), [240])
  }

  // 3. Ornaments on red strings (red-christmas-ornaments-set-glossy-red-baubles, 86462541): the
  // plain, the starred and the glittered ones, which have no white stripes to lose.
  {
    const art = keyWhite(await render(`${PACK}/red-christmas-ornaments-set-glossy-red-baubles-with-various/vecteezy_red-christmas-ornaments-set-glossy-red-baubles-with-various_86462541.eps`, 40))
    await save('bauble-plain', (await crop(art, 0.036, 0, 0.174, 0.752)).trim(), [160])
    await save('bauble-stars', (await crop(art, 0.668, 0, 0.805, 0.752)).trim(), [160])
    await save('bauble-glitter', (await crop(art, 0.826, 0, 0.963, 0.752)).trim(), [160])
  }

  // 4. A small glossy bow (red-realistic-silk-bows-elements, 8656589), for the price tag.
  {
    const art = keyWhite(await render(`${PACK}/red-realistic-silk-bows-elements-for-festive-decoration-of_8/vecteezy_red-realistic-silk-bows-elements-for-festive-decoration-of_8656589.eps`, 40))
    const { info, bg } = art
    const W = info.width, H = info.height
    const [b0, b1] = solidRun(bg, W, H, { x: Math.round(W * 0.12) })
    const tall = []
    for (let c = 0; c < W; c++) { let n = 0; for (let r = 0; r < H; r++) if (!bg[r * W + c]) n++; if (n > (b1 - b0) * 1.6) tall.push(c) }
    const x0 = tall[0], x1 = tall.at(-1)
    await save('bow-small', sharp(await image(art).extract({ left: x0, top: 0, width: x1 - x0 + 1, height: H }).png().toBuffer()).trim(), [240])
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
