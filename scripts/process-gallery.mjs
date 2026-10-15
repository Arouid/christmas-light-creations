// Hi-res gallery originals (assets-source/photos/gallery-hi-res/, not in git; the owner's rescans of
// 2026-10-14, about 3 MB each, named by neighborhood and town) -> the web copies in
// public/images/gallery/: file name lowercased with the owner's typos fixed, camera orientation
// applied, 1600 px wide, JPEG quality 82 (mozjpeg), metadata stripped. The one older web-size
// photo the owner kept (listed in KEEP) is left as it is. Run: node scripts/process-gallery.mjs
// The order, places and alt texts live in src/data/content.js (gallery); area pages pick files in
// src/data/areas.js. tests/areaPhotos.test.mjs checks the list and the folder agree. Then the
// 800 px phone copies in public/images/gallery/800/ are remade (scripts/gallery-thumbs.mjs).
import { readdir, stat, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { makeThumbs } from './gallery-thumbs.mjs'

const SRC = new URL('../assets-source/photos/gallery-hi-res/', import.meta.url)
const OUT = new URL('../public/images/gallery/', import.meta.url)
const WIDTH = 1600
// west-ranch-friendswood.jpg: its hi-res original was overwritten by mistake on 2026-10-15, so the
// web copy made on 2026-10-14 is kept as it is until the owner re-downloads that rescan.
const KEEP = ['friendswood-warm-white-ivy-home.jpg', 'west-ranch-friendswood.jpg']
// Spelling the owner's file names carry; the web name and the URL use the fixed word.
const FIX = { cleark: 'clear', friendwood: 'friendswood', merdiana: 'meridiana', glenn: 'glen' }

// Privacy (decisions 2026-10-08): house numbers, plates and mailboxes a photo shows are blurred in
// the web copy. [left, top, width, height] in the original's pixels, keyed by the original's name.
const BLUR = {
  'alvin-christmas-installers.jpg': [[1325, 490, 95, 55]], // "205" above the porch
  'west-ranch-friendswood-02.jpg': [[25, 935, 85, 55]], // the pickup's front plate
  'the-lakes-of-highland-glenn-pearland-07.jpg': [[2200, 785, 80, 55]], // address plaque on the brick
}

export const webName = (f) => `${f.toLowerCase().replace(/\.jpe?g$/, '').split('-').map((w) => FIX[w] ?? w).join('-')}.jpg`

// The original with its BLUR regions blurred (same helper as scripts/process-photos.mjs).
async function withBlur(file, regions) {
  const buffer = await sharp(file).rotate().toBuffer()
  if (!regions?.length) return buffer
  const layers = await Promise.all(regions.map(async ([left, top, width, height]) => ({
    input: await sharp(buffer).extract({ left, top, width, height }).blur(30).toBuffer(), left, top,
  })))
  return sharp(buffer).composite(layers).toBuffer()
}

async function main() {
  const originals = (await readdir(SRC)).filter((f) => /\.jpe?g$/i.test(f)).sort((a, b) => a.localeCompare(b))
  const wanted = new Set([...originals.map(webName), ...KEEP])
  // Clear the folder of everything that isn't a kept photo, so names come out exactly as computed
  // (Windows keeps an existing file's letter case otherwise) and no hi-res copy ships by accident.
  for (const f of await readdir(OUT)) {
    if (!wanted.has(f) || !KEEP.includes(f)) await unlink(new URL(f, OUT)).catch(() => {})
  }
  let bytes = 0
  for (const f of originals) {
    const out = new URL(webName(f), OUT)
    await sharp(await withBlur(fileURLToPath(new URL(f, SRC)), BLUR[f]))
      .resize({ width: WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(fileURLToPath(out))
    bytes += (await stat(out)).size
  }
  console.log(`${originals.length} photos -> public/images/gallery at ${WIDTH} px, ${(bytes / 1048576).toFixed(1)} MB total (+ ${KEEP.length} kept)`)
  const renamed = originals.filter((f) => webName(f) !== f)
  if (renamed.length) console.log('renamed:', renamed.map((f) => `${f} -> ${webName(f)}`).join(', '))
  await makeThumbs()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
