// Pictures for profiles outside the website (Nextdoor first, 2026-10-15; also Thumbtack, Angi,
// Google): assets-source/listings/. Uploaded by hand; the words are in docs/listings.md.
// - profile-1080.png: the cottage render (assets-source/ads/youtube/youtube-profile-1080.png)
//   moved up to the middle with room around it, so a round crop keeps the whole house.
// - cover-<photo>-2000x1000.jpg: wide covers (2:1) from the owner's hi-res rescans, roofline
//   shots only (no tree wrapping, owner 2026-10-14). The page name sits over the bottom left.
// Run: node scripts/listing-images.mjs (needs assets-source/photos/gallery-hi-res/, on this PC only).
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const src = (p) => fileURLToPath(new URL(`../assets-source/${p}`, import.meta.url))
const OUT = 'listings/'
const NIGHT = { r: 5, g: 11, b: 26 } // the render's own background (night-950)
const COVERS = ['victory-lakes-league-city-04', 'shadow-creek-ranch-pearland-02', 'stonebridge-pearland-04']

await mkdir(src(OUT), { recursive: true })

// The house sits low in the 1080 render: drop 115 px of sky, add them under it, then 60 px all round.
const raised = await sharp(src('ads/youtube/youtube-profile-1080.png'))
  .extract({ left: 0, top: 115, width: 1080, height: 965 })
  .extend({ bottom: 115, background: NIGHT })
  .toBuffer()
await sharp(raised).extend({ top: 60, bottom: 60, left: 60, right: 60, background: NIGHT })
  .resize(1080, 1080).png().toFile(src(`${OUT}profile-1080.png`))

for (const name of COVERS) {
  await sharp(src(`photos/gallery-hi-res/${name}.jpg`))
    .rotate()
    .resize(2000, 1000, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(src(`${OUT}cover-${name}-2000x1000.jpg`))
}
console.log(`assets-source/listings: profile-1080.png + ${COVERS.length} covers (2000x1000)`)
