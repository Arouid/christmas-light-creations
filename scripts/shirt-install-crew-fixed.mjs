// Install Crew with the owner's own roofline fix (2026-10-16, made in Inkscape on the gold print: "I fixed this cottage
// for install crew can you use this one to fix the rest"). His file is the gold print (install-crew-on-gold.png,
// embedded) with his layer over it: snow over the pink neon, navy outlines and icicles, leaving a thin strip of the
// red neon showing as one line. That layer, taken out of his file, goes over the prints with the lettering in real
// fonts (scripts/shirt-install-crew-fonts.mjs; owner: "the fonts in Install Crew all need replaced with actual fonts"):
// - gold: over install-crew-fonts-on-gold.png as it is;
// - navy: over install-crew-fonts-red-on-navy.png (the same red neon under the strip), with his navy outlines knocked
//   out to the shirt like the rest of that print (ink = (colour·alpha − k·navy) / (alpha − k), k the share of the
//   pixel his navy covers).
// The new lettering changes how far the art reaches, so the prints are framed a little differently from the one he
// drew on: both frames are measured (the art rendered and trimmed, as scripts/shirt-knockout.mjs frames a print) and
// his layer is placed by them, so it sits on the house exactly where he drew it.
// Run: node scripts/shirt-install-crew-fixed.mjs → recraft/install-crew-fixed-on-gold.png and
// install-crew-fixed-on-navy.png (12 in wide, 300 dpi). His file: recraft/install-crew-owner-fixed-gold.svg.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { PRINT_NAVY } from './lib/logoArt.mjs'

const DIR = fileURLToPath(new URL('../assets-source/shirts/recraft/', import.meta.url))
const BASES = { gold: 'install-crew-fonts-on-gold.png', navy: 'install-crew-fonts-red-on-navy.png' }
const src = readFileSync(DIR + 'install-crew-owner-fixed-gold.svg', 'utf8')
const image = src.match(/<image[^>]*?\/>/)?.[0]
const root = src.match(/<svg[^>]*>/)[0]
if (!image || !/width="1152"/.test(root) || !/viewBox="0 0 1152 1520.64"/.test(root) || !/width="1152"[^>]*height="1520.64"/.test(image)) throw new Error('install-crew-owner-fixed-gold.svg: not the 1152 x 1520.64 page with the gold print across it any more')
const embedded = Buffer.from(image.match(/base64,([^"]*)"/)[1].replace(/&#10;|\s/g, ''), 'base64')
if (!(await sharp(DIR + 'install-crew-on-gold.png').raw().toBuffer()).equals(await sharp(embedded).ensureAlpha().raw().toBuffer())) throw new Error('the image in his file is not install-crew-on-gold.png any more')

// Where a drawing's art sits in its print: rendered as shirt-knockout.mjs does (Recraft's page dropped, density 108),
// then trimmed. Returns the box in render pixels.
async function frame(file) {
  const svg = readFileSync(DIR + file, 'utf8').replace(/<metadata>[^]*?<\/metadata>/, '').replace(/<path fill="[^"]*" d="M0 0L(\d+) 0L\1 \1L0 \1L0 0Z"\/>/, '')
  const { info } = await sharp(Buffer.from(svg), { density: 108 }).ensureAlpha().trim().toBuffer({ resolveWithObject: true })
  return { left: -info.trimOffsetLeft, top: -info.trimOffsetTop, w: info.width, h: info.height }
}
const was = await frame('install-crew-v2-pearland-white.svg'), now = await frame('install-crew-fonts.svg')
if (Math.round((was.h * 3600) / was.w) !== 4752) throw new Error(`the old frame measures ${was.w} x ${was.h}, not the 3600 x 4752 print he drew on`)
const { width: W, height: H } = await sharp(DIR + BASES.gold).metadata()
if (Math.abs(Math.round((now.h * W) / now.w) - H) > 1) throw new Error(`the new frame measures ${now.w} x ${now.h}, not the ${W} x ${H} print`)
// His unit u → new print pixel a·u + b (his page is the old print at 1152 units for 3600 px).
const a = ((W / 1152) * was.w) / now.w
const bx = ((was.left - now.left) * W) / now.w, by = ((was.top - now.top) * W) / now.w

// His layer alone, in the new print's frame; and where it is his navy (white there, black elsewhere, same coverage).
const layer = src.replace(image, '').replace(root, root.replace(/width="1152"/, `width="${W}"`).replace(/height="1520.64"/, `height="${H}"`)
  .replace(/viewBox="[^"]*"/, `viewBox="${-bx / a} ${-by / a} ${W / a} ${H / a}"`))
const render = (svg) => sharp(Buffer.from(svg), { density: 72 }).resize(W, H).ensureAlpha().raw().toBuffer()
const over = await render(layer)
const navyOnly = await render(layer.replace(/(fill|stop-color):(#[0-9a-fA-F]{6})/g, (m, attr, hex) => `${attr}:${hex.toLowerCase() === PRINT_NAVY.toLowerCase() ? '#ffffff' : '#000000'}`))

async function lay(base, knock) {
  const out = Buffer.alloc(W * H * 4)
  const navy = [1, 3, 5].map((i) => parseInt(PRINT_NAVY.slice(i, i + 2), 16))
  for (let p = 0; p < W * H * 4; p += 4) {
    const oa = over[p + 3] / 255, ba = base[p + 3] / 255
    const al = oa + ba * (1 - oa)
    const k = knock ? Math.min(al, (navyOnly[p] / 255) * (navyOnly[p + 3] / 255)) : 0
    const left = al - k
    for (let c = 0; c < 3; c++) {
      const v = over[p + c] * oa + base[p + c] * ba * (1 - oa) // premultiplied, over
      out[p + c] = left > 0.004 ? Math.max(0, Math.min(255, Math.round((v - k * navy[c]) / left))) : 0
    }
    out[p + 3] = Math.round(left * 255)
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).withMetadata({ density: 300 }).png()
}

for (const [shirt, file] of Object.entries(BASES)) {
  const base = await sharp(DIR + file).ensureAlpha().raw().toBuffer()
  await (await lay(base, shirt === 'navy')).toFile(`${DIR}install-crew-fixed-on-${shirt}.png`)
}
console.log(`install-crew-fixed-on-gold.png, install-crew-fixed-on-navy.png: his roofline layer over the font prints (${W} x ${H}, his layer x${(a / (W / 1152)).toFixed(4)}, moved ${bx.toFixed(1)}, ${by.toFixed(1)} px)`)
