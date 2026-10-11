// Copies what the video needs into video/public/ (gitignored), so Remotion can serve it with
// staticFile(): the photos from photos-incoming/ (resized to 1920 wide, EXIF stripped, so no
// GPS data leaves the drop folder), the cottage logo SVG and the site's two fonts.
// Which photos: every `file` named in src/data.js. Safe to run again; skips files already done.
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, copyFileSync, readFileSync, statSync } from 'node:fs'
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
for (const f of ['clc-cottage-color.svg']) {
  const src = join(repoRoot, 'assets-source', 'logo-vector', f)
  const dst = join(out, 'logo', f)
  if (fresh(src, dst)) { copyFileSync(src, dst); console.log('logo', f) }
}
