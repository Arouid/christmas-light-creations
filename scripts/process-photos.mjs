// Turns the owner's originals in photos-incoming/ (not in git) into web
// photos in public/images/gallery/: resized, compressed, metadata (incl. any
// GPS location) stripped, descriptive file names. Run: node scripts/process-photos.mjs
// The order and captions live in src/data/content.js (gallery).
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const MAP = {
  'Classic-Wally.jpg': 'warm-white-two-story-stone-home.jpg',
  'Clear_LED_Iowa_Colony.jpg': 'iowa-colony-clear-led-gables.jpg',
  'GW.png': 'green-led-two-story-home.jpg',
  'Classic-2-Ivy-Friendswood.jpg': 'friendswood-warm-white-ivy-home.jpg',
  'unnamed.jpg': 'warm-white-roofline-lit-trees.jpg',
  'Classic-Highland-Glen-5.jpg': 'pearland-highland-glen-two-story.jpg',
  'unnamed (4).jpg': 'warm-white-roofline-garden-beds.jpg',
  'Tight_Ends_League_City.jpg': 'league-city-commercial-restaurant.jpg',
  'Colored-LED-MULTI-Pearland.jpg': 'pearland-multicolor-led.jpg',
  'Classic-Highland-Glen-4.jpg': 'pearland-highland-glen-dusk.jpg',
  'unnamed (3).jpg': 'warm-white-brick-home-two-car-garage.jpg',
  'unnamed (5).jpg': 'warm-white-garage-and-windows.jpg',
  'unnamed (6).jpg': 'warm-white-single-story-home.jpg',
  'Classic-League-City.jpg': 'league-city-roofline-and-yard.jpg',
  'Classic-Highland-Glen-3.jpg': 'pearland-highland-glen-garage.jpg',
  'Classic-West-Ranch.jpg': 'friendswood-west-ranch.jpg',
  'Colored-RW-Pearland.jpg': 'pearland-red-and-white.jpg',
  'Colored-LED-MULTI-Highland-Glen.jpg': 'pearland-highland-glen-multicolor.jpg',
  'unnamed (1).jpg': 'community-entrance-sign.jpg',
  'unnamed (2).jpg': 'commercial-building-red-lights.jpg',
  'Classic-Highland-Glen.jpg': 'pearland-highland-glen-walkway.jpg',
}

const src = (f) => fileURLToPath(new URL(`../photos-incoming/${f}`, import.meta.url))
const out = (f) => fileURLToPath(new URL(`../public/images/gallery/${f}`, import.meta.url))

// "Glam" look for night shots: richer color and contrast, crisp detail, a soft
// glow around the bulbs and a vignette. Light and color only: nothing is added
// to or removed from the scene, so photos still show the real install.
async function brightness(file) {
  const { channels } = await sharp(file).stats()
  return (channels[0].mean + channels[1].mean + channels[2].mean) / 3
}

const vignette = (w, h) => Buffer.from(
  `<svg width="${w}" height="${h}"><defs><radialGradient id="v" cx="50%" cy="45%" r="75%">`
  + '<stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/>'
  + `</radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`,
)

for (const [from, to] of Object.entries(MAP)) {
  const mean = await brightness(src(from))
  const night = mean < 70 // daylight/dusk shots skip the glow (a bright sky would haze over)
  const lift = mean < 35 ? 1.3 : mean < 50 ? 1.15 : 1.05
  const { data, info: size } = await sharp(src(from))
    .rotate() // apply camera orientation before metadata is dropped
    .resize({ width: 1600, withoutEnlargement: true })
    .modulate({ brightness: lift, saturation: 1.3 })
    .linear(1.12, -10)
    .sharpen({ sigma: 1 })
    .toBuffer({ resolveWithObject: true })

  const layers = [{ input: vignette(size.width, size.height), blend: 'over' }]
  if (night) {
    // Keep only the brightest pixels (the bulbs), blur them into a halo.
    const glow = await sharp(data).linear(2.4, -330).blur(Math.max(6, size.width / 130)).linear(0.8, 0).toBuffer()
    layers.unshift({ input: glow, blend: 'screen' })
  }
  const info = await sharp(data).composite(layers)
    .jpeg({ quality: 82, mozjpeg: true }) // no withMetadata(): EXIF/GPS stripped
    .toFile(out(to))
  console.log(`${to.padEnd(44)} ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB  ${night ? 'glow' : 'no glow'}`)
}
