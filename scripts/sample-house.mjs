// Renders the public designer's sample house (assets-source/sample-house.svg)
// to public/images/design/sample-house.jpg (1280x800, the standard size).
// Run once after changing the SVG: node scripts/sample-house.mjs
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const out = new URL('../public/images/design/sample-house.jpg', import.meta.url)
await mkdir(new URL('.', out), { recursive: true })
const info = await sharp(new URL('../assets-source/sample-house.svg', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  .resize(1280, 800).jpeg({ quality: 82, mozjpeg: true }).toFile(out.pathname.replace(/^\/([A-Za-z]:)/, '$1'))
console.log(`sample house: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`)
