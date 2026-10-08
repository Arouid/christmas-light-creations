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
  // 2015–2024 originals (added 2026-10-08). `blur`: [left, top, width, height]
  // in original pixels, for license plates / house numbers / mailboxes.
  '20181203_175235.jpg': 'estate-wrapped-oaks-gazebo.jpg',
  'PXL_20241116_002328090.jpg': { to: 'pink-and-white-roofline.jpg', blur: [[1400, 1480, 280, 160], [3180, 1060, 220, 150]] },
  'PXL_20241115_234610353.MP.jpg': { to: 'multicolor-windows-and-roofline-dusk.jpg', blur: [[880, 1840, 460, 210]] },
  'PXL_20241122_004349250.jpg': 'blue-wrapped-trees-nativity.jpg',
  'DSCF6305.JPG': 'two-story-wrapped-trees-arched-door.jpg',
  '20231122_185904.jpg': 'blue-wrapped-oaks-estate.jpg',
  '20191205_180121.jpg': 'nativity-trees-roofline.jpg',
  '20171111_184155.jpg': 'white-stone-two-story-warm-white.jpg',
  '20201104_183009.jpg': 'lit-driveway-and-roofline.jpg',
  'DSCF6183.JPG': 'twin-gables-under-full-moon.jpg',
  '20181201_180741.jpg': 'gated-estate-gazebo-lights.jpg',
  '20151118_173345.jpg': 'wrapped-trees-arched-entry.jpg',
}

// Blur the given regions of an image buffer (privacy), returns a new buffer.
async function blurRegions(buffer, regions) {
  const layers = await Promise.all(regions.map(async ([left, top, width, height]) => ({
    input: await sharp(buffer).extract({ left, top, width, height }).blur(30).toBuffer(), left, top,
  })))
  return sharp(buffer).composite(layers).toBuffer()
}

const src = (f) => fileURLToPath(new URL(`../photos-incoming/${f}`, import.meta.url))
const out = (f) => fileURLToPath(new URL(`../public/images/gallery/${f}`, import.meta.url))

// Natural touch-up (owner's choice, 2026-10-08; a stronger "glam" look with
// bulb glow and vignette was tried and rejected): lift the darkest night shots
// a little, slightly richer color, a touch of contrast and sharpness.
async function brightness(file) {
  const { channels } = await sharp(file).stats()
  return (channels[0].mean + channels[1].mean + channels[2].mean) / 3
}

for (const [from, target] of Object.entries(MAP)) {
  const { to, blur = [] } = typeof target === 'string' ? { to: target } : target
  const mean = await brightness(src(from))
  const lift = mean < 35 ? 1.25 : mean < 50 ? 1.12 : 1 // brighten only the darkest shots
  let original = await sharp(src(from)).rotate().toBuffer() // apply camera orientation first
  if (blur.length) original = await blurRegions(original, blur)
  const info = await sharp(original)
    .resize({ width: 1600, withoutEnlargement: true })
    .modulate({ brightness: lift, saturation: 1.12 })
    .linear(1.06, -4) // a touch more contrast, keeps the sky black
    .sharpen({ sigma: 0.7 })
    .jpeg({ quality: 82, mozjpeg: true }) // no withMetadata(): EXIF/GPS stripped
    .toFile(out(to))
  console.log(`${to.padEnd(44)} ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB${lift > 1 ? '  (lifted)' : ''}`)
}
