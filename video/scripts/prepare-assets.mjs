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
  const src = join(repoRoot, 'assets-source', 'logo-vector', f)
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
