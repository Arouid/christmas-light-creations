// The gift-wrapping page's "Wrapped by us" photos (docs/specs/gift-wrapping.md): the owner's own
// wrapping, his rescans in assets-source/ads/Gift-Wrapping/ (git-ignored, up to 2752 px, never
// shipped) → public/images/gift-wrap/: camera orientation applied, at most 800 px each way, JPEG
// quality 80 (mozjpeg), metadata stripped (sharp keeps none unless asked). An existing web copy is
// never overwritten: delete it first to remake it. Owner 2026-10-15: "we can use my gift photos for now
// as placeholders". The order and alt texts live in src/data/content.js (giftWrapping.photos).
//   node scripts/gift-photos.mjs
import { existsSync } from 'node:fs'
import sharp from 'sharp'

const SRC = 'assets-source/ads/Gift-Wrapping'
const OUT = 'public/images/gift-wrap'
export const GIFT_PHOTOS = {
  'luxury-gift-01.jpg': 'black-gold-snowflake-bow.jpg',
  'luxury-gift-02.jpg': 'white-and-navy-gift-set.jpg',
  'luxury-gift-03.jpg': 'joy-paper-and-gingham-bow.jpg',
  'luxury-gift-04.jpg': 'rose-gold-polka-dot-bow.jpg',
  'luxury-gift-05.jpg': 'buffalo-check-tree-ribbon-bow.jpg',
  'luxury-gift-06.jpg': 'buffalo-check-and-gold-snowflakes.jpg',
  'luxury-gift-07.jpg': 'gold-mesh-and-gingham-bows.jpg',
  'luxury-gift-08.jpg': 'gifts-under-a-flocked-tree.jpg',
}

for (const [from, to] of Object.entries(GIFT_PHOTOS)) {
  const file = `${OUT}/${to}`
  if (existsSync(file)) { console.log(`${file}: kept (delete it to remake)`); continue }
  const r = await sharp(`${SRC}/${from}`).rotate().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true }).toFile(file)
  console.log(`${file}: ${r.width}×${r.height}, ${Math.round(r.size / 1024)} KB`)
}
