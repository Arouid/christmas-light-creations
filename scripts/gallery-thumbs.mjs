// Phone-size copies of the gallery photos: public/images/gallery/*.jpg (1600 px wide) ->
// public/images/gallery/800/ (800 px wide, about a quarter of the bytes). The home gallery's
// grid and the area pages offer both through srcset (src/lib/thumb.js), so a phone loads the
// small one in the grid and the lightbox still opens the 1600 px photo. Stale copies are removed.
// Run by scripts/process-gallery.mjs after it makes the web copies, or on its own:
// node scripts/gallery-thumbs.mjs. tests/seo.test.mjs checks every gallery photo has its copy.
import { mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const DIR = new URL('../public/images/gallery/', import.meta.url)
const OUT = new URL('800/', DIR)
const WIDTH = 800

export async function makeThumbs() {
  await mkdir(OUT, { recursive: true })
  const photos = (await readdir(DIR)).filter((f) => f.endsWith('.jpg'))
  for (const f of await readdir(OUT)) if (!photos.includes(f)) await unlink(new URL(f, OUT))
  let bytes = 0
  for (const f of photos) {
    const out = new URL(f, OUT)
    await sharp(fileURLToPath(new URL(f, DIR)))
      .resize({ width: WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(fileURLToPath(out))
    bytes += (await stat(out)).size
  }
  console.log(`${photos.length} thumbnails -> public/images/gallery/800 at ${WIDTH} px, ${(bytes / 1048576).toFixed(1)} MB total`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await makeThumbs()
