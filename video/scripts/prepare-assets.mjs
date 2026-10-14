// Copies what the video needs into video/public/ (gitignored), so Remotion can serve it with
// staticFile(): the photos from photos-incoming/ (resized to 1920 wide, EXIF stripped, so no
// GPS data leaves the drop folder), the cottage logo SVG and the site's two fonts.
// Which photos: every `file` named in src/data.js. Safe to run again; skips files already done.
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const here = dirname(fileURLToPath(import.meta.url))
const videoRoot = resolve(here, '..')
const repoRoot = resolve(videoRoot, '..')
const out = join(videoRoot, 'public')
const index = readFileSync(join(repoRoot, 'assets-source', 'ads', 'contact-sheet-index.txt'), 'utf8')
  .split(/\r?\n/).filter(Boolean)
  .map((l) => l.split('\t'))
const byNumber = Object.fromEntries(index.map(([n, p]) => [n, join(repoRoot, p.trim())]))

const { default: data } = await import('../src/data.js')
const { cutout } = await import('./cutout.mjs')

mkdirSync(join(out, 'photos'), { recursive: true })
mkdirSync(join(out, 'fonts'), { recursive: true })
mkdirSync(join(out, 'logo'), { recursive: true })
mkdirSync(join(out, 'music'), { recursive: true })

const fresh = (src, dst) => !existsSync(dst) || statSync(dst).mtimeMs < statSync(src).mtimeMs

for (const photo of Object.values(data.photos)) {
  const src = byNumber[String(photo.number)]
  if (!src || !existsSync(src)) {
    console.error(`photo ${photo.number} not found in photos-incoming/ (see assets-source/ads/contact-sheet-index.txt)`)
    process.exitCode = 1
    continue
  }
  const dst = join(out, 'photos', `${photo.number}.jpg`)
  if (!fresh(src, dst)) continue
  await sharp(src).rotate().resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(dst)
  console.log('photo', photo.number, '->', dst)
}

for (const f of ['fraunces-latin.woff2', 'inter-latin.woff2']) {
  const src = join(repoRoot, 'public', 'fonts', f)
  const dst = join(out, 'fonts', f)
  if (fresh(src, dst)) { copyFileSync(src, dst); console.log('font', f) }
}
for (const f of ['clc-cottage-color.svg', 'clc-cottage-one-color-white.svg']) {
  const src = join(repoRoot, 'assets-source', 'brand', 'logo-vector', f)
  const dst = join(out, 'logo', f)
  if (fresh(src, dst)) { copyFileSync(src, dst); console.log('logo', f) }
}

// Bulb-colour variants for the design mock: the bulbs (small blobs much brighter than their
// surroundings, plus their halo) are tinted cool white or red, the rest of the photo untouched.
// Written as photos/<number>-cool.jpg and photos/<number>-red.jpg. Only for photos with `tints`.
const TINTS = { cool: [0.84, 0.92, 1.0], red: [1.0, 0.22, 0.18], green: [0.3, 1.0, 0.35] }
for (const photo of Object.values(data.photos)) {
  if (!photo.tints) continue
  const lit = join(out, 'photos', `${photo.number}.jpg`)
  const todo = photo.tints.filter((t) => TINTS[t] && fresh(lit, join(out, 'photos', `${photo.number}-${t}.jpg`)))
  if (!todo.length) continue
  const { data: grey, info } = await sharp(lit).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
  const { data: local } = await sharp(lit).toColourspace('b-w').blur(9).raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels: ch } = info
  const n = width * height
  const core = Buffer.alloc(n)
  for (let i = 0; i < n; i++) core[i] = grey[i * ch] > (photo.bulbThreshold ?? 215) && grey[i * ch] - local[i * ch] > 45 ? 255 : 0
  const { data: mask, info: mi } = await sharp(core, { raw: { width, height, channels: 1 } }).blur(5).threshold(8).blur(3).raw().toBuffer({ resolveWithObject: true })
  const mch = mi.channels
  const { data: rgb } = await sharp(lit).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  for (const t of todo) {
    const [tr, tg, tb] = TINTS[t]
    const outRgb = Buffer.alloc(n * 3)
    for (let i = 0; i < n; i++) {
      const a = mask[i * mch] / 255
      const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
      const lum = 0.3 * r + 0.59 * g + 0.11 * b
      outRgb[i * 3] = Math.round(r * (1 - a) + Math.min(255, lum * tr) * a)
      outRgb[i * 3 + 1] = Math.round(g * (1 - a) + Math.min(255, lum * tg) * a)
      outRgb[i * 3 + 2] = Math.round(b * (1 - a) + Math.min(255, lum * tb) * a)
    }
    const dst = join(out, 'photos', `${photo.number}-${t}.jpg`)
    await sharp(outRgb, { raw: { width, height, channels: 3 } }).jpeg({ quality: 88 }).toFile(dst)
    console.log('tint', t, photo.number, '->', dst)
  }
}

// The owner's Gemini renders (assets-source/ads/gemini/, e.g. the photoreal cottage) → public/gemini/.
const geminiDir = join(repoRoot, 'assets-source', 'ads', 'gemini')
mkdirSync(join(out, 'gemini'), { recursive: true })
if (existsSync(geminiDir)) {
  for (const f of readdirSync(geminiDir)) {
    const src = join(geminiDir, f)
    if (statSync(src).isDirectory() || !/\.(jpe?g|png|webp)$/i.test(f)) continue
    const dst = join(out, 'gemini', f)
    if (fresh(src, dst)) { copyFileSync(src, dst); console.log('gemini', f) }
  }
}
for (const k of ['cottageImage', 'cottageImageWide']) if (data[k] && !existsSync(join(out, 'gemini', data[k]))) { console.error(`${k} ${data[k]} is missing from assets-source/ads/gemini/`); process.exitCode = 1 }

// "Lights off" copies of the cottage renders: the neon tubes, the warm door and window and the
// chimney (saturated pixels, plus bright pixels right next to them) go dark; a wider, softer mask
// takes the coloured glow off the snow around them; the rest stays. Written as
// gemini/<name>-off.jpg; the ads crossfade from it to the lit render, so only the lights change.
for (const k of ['cottageImage', 'cottageImageWide']) {
  const name = data[k]
  if (!name) continue
  const lit = join(out, 'gemini', name)
  const off = join(out, 'gemini', name.replace(/\.(jpe?g|png|webp)$/i, '') + '-off.jpg')
  if (!existsSync(lit) || !fresh(lit, off)) continue
  const { data: rgb, info } = await sharp(lit).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const n = width * height
  const sat = new Float32Array(n)
  const mx = new Uint8Array(n)
  const core = Buffer.alloc(n)
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    sat[i] = max ? (max - min) / max : 0
    mx[i] = max
    const warm = r > 170 && g > 110 && b < 130 && r - b > 70
    // the sky and the snow lean blue (blue is the strongest channel, then green); the lights never do
    const blueish = b >= r && b >= g && g >= r
    core[i] = !blueish && ((sat[i] > 0.38 && max > 80) || warm) ? 255 : 0
  }
  const grow = async (sigma, thr) => (await sharp(core, { raw: { width, height, channels: 1 } }).blur(sigma).threshold(thr).raw().toBuffer({ resolveWithObject: true }))
  const near = await grow(7, 8) // ~10 px around the saturated parts
  const wide = await grow(26, 4) // the glow on the snow
  const nch = near.info.channels, wch = wide.info.channels
  const lightsRaw = Buffer.alloc(n)
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const blueish = b >= r && b >= g && g >= r
    lightsRaw[i] = near.data[i * nch] > 0 && !blueish && (sat[i] > 0.15 || mx[i] > 200) ? 255 : 0
  }
  const { data: lights, info: li } = await sharp(lightsRaw, { raw: { width, height, channels: 1 } }).blur(2).raw().toBuffer({ resolveWithObject: true })
  const { data: glow, info: gi } = await sharp(wide.data, { raw: { width, height, channels: wch } }).blur(12).raw().toBuffer({ resolveWithObject: true })
  const lch = li.channels, gch = gi.channels
  const outRgb = Buffer.alloc(n * 3)
  for (let i = 0; i < n; i++) {
    const a = lights[i * lch] / 255
    const gAlpha = (glow[i * gch] / 255) * 0.7
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const lum = 0.3 * r + 0.59 * g + 0.11 * b
    // glow off: pull toward grey and a little darker
    let rr = r + (lum - r) * gAlpha, gg = g + (lum - g) * gAlpha, bb = b + (lum - b) * gAlpha
    rr *= 1 - 0.22 * gAlpha; gg *= 1 - 0.22 * gAlpha; bb *= 1 - 0.2 * gAlpha
    // lights off: dark, nearly grey
    const dr = lum * 0.17, dg = lum * 0.17, db = lum * 0.21
    outRgb[i * 3] = Math.round(rr * (1 - a) + dr * a)
    outRgb[i * 3 + 1] = Math.round(gg * (1 - a) + dg * a)
    outRgb[i * 3 + 2] = Math.round(bb * (1 - a) + db * a)
  }
  await sharp(outRgb, { raw: { width, height, channels: 3 } }).modulate({ brightness: 0.85, saturation: 0.8 }).jpeg({ quality: 90 }).toFile(off)
  console.log('lights off', name, '->', off)
}

// Cut-outs (RGBA) of the square render, lit and lights off, so the cottage sits on a scene without
// its own sky showing: see cutout.mjs.
{
  const name = data.cottageImage
  if (name) {
    const base = join(out, 'gemini', name.replace(/\.(jpe?g|png|webp)$/i, ''))
    const lit = join(out, 'gemini', name)
    const off = base + '-off.jpg'
    const cutLit = base + '-cut.png'
    const cutOff = base + '-cut-off.png'
    if (existsSync(lit) && existsSync(off) && (fresh(lit, cutLit) || fresh(off, cutOff))) {
      const { kept } = await cutout(sharp, lit, off, cutLit, cutOff)
      console.log('cut-out', name, `(${Math.round(kept * 100)} % of the picture kept)`)
    }
  }
}

// Licensed downloads (Uppbeat and the like): footage, sound effects and music from
// assets-source/ads/{clips,sfx,music}/ are copied into public/{clips,sfx,music}/. Each clip's
// length is probed and written to src/clips.json so scenes can loop it.
const ffprobe = join(videoRoot, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffprobe.exe')
const clipsMeta = {}
for (const kind of ['clips', 'sfx', 'music']) {
  const srcDir = join(repoRoot, 'assets-source', 'ads', kind)
  mkdirSync(join(out, kind), { recursive: true })
  if (!existsSync(srcDir)) continue
  for (const f of readdirSync(srcDir)) {
    const src = join(srcDir, f)
    if (statSync(src).isDirectory()) continue
    const dst = join(out, kind, f)
    if (fresh(src, dst)) { copyFileSync(src, dst); console.log(kind, f) }
    if (kind === 'clips' && existsSync(ffprobe)) {
      const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], { encoding: 'utf8' })
      const sec = parseFloat(r.stdout)
      if (sec > 0) clipsMeta[f] = Math.round(sec * 100) / 100
    }
  }
}
writeFileSync(join(videoRoot, 'src', 'clips.json'), JSON.stringify(clipsMeta, null, 2) + '\n')

// Every file named in data.js must exist after the copy.
const missing = []
if (data.music?.file && !existsSync(join(out, 'music', data.music.file))) missing.push(`music/${data.music.file}`)
for (const [k, f] of Object.entries(data.sfx || {})) if (typeof f === 'string' && f && !existsSync(join(out, 'sfx', f))) missing.push(`sfx/${f} (${k})`)
for (const [k, f] of Object.entries(data.clips || {})) if (f && !existsSync(join(out, 'clips', f))) missing.push(`clips/${f} (${k})`)
for (const [k, p] of Object.entries(data.photos || {})) if (p.clip && !existsSync(join(out, 'clips', p.clip))) missing.push(`clips/${p.clip} (photos.${k}.clip)`)
if (missing.length) {
  console.error('Missing from assets-source/ads/: ' + missing.join(', ') + '. Put the files there (see assets-source/ads/video/README.md) or clear the names in src/data.js.')
  process.exitCode = 1
}
