// The gift-wrapping page's bows (docs/specs/gift-wrapping.md), from the
// owner's Vecteezy Pro PNGs with real transparency (raw files at the top of
// assets-source/stock/vecteezy/, git-ignored, never shipped) →
// public/images/gift-wrap/decor/. Owner 2026-10-15: "please look at the new
// PNG's I added I really like them and think they can be used to upgrade the
// bows", "pick new bows for all 3 gifts", then "the gift bows are perfect". No white to take out, so no fringe.
// Decoration only: no gifts in any of them.
//   node scripts/gift-bows.mjs
import sharp from 'sharp'

const SRC = 'assets-source/stock/vecteezy'
const OUT = 'public/images/gift-wrap/decor'

// The bows on a sheet, each cut out on its own: the sheet's see-through background splits it
// into pieces (found on a 1125 px copy, diagonal neighbours counted as touching, so a bow's faint
// watercolour washes stay with it), left to right, top to bottom. Each comes back as its box on
// the full sheet and a mask of just that bow, so the tips of the next bows don't come along.
async function sheetBows(file) {
  const meta = await sharp(file).metadata()
  const { data, info } = await sharp(file).resize({ width: 1125 }).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, k = meta.width / W
  const label = new Int32Array(W * H).fill(-1)
  const found = []
  for (let p = 0; p < W * H; p++) {
    if (label[p] >= 0 || data[p] < 8) continue
    const id = found.length
    let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0
    const todo = [p]
    label[p] = id
    while (todo.length) {
      const q = todo.pop()
      const x = q % W, y = (q / W) | 0
      n++
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
        const r = yy * W + xx
        if (label[r] < 0 && data[r] >= 8) { label[r] = id; todo.push(r) }
      }
    }
    found.push({ id, n, x0, y0, x1, y1 })
  }
  const bows = found.filter((b) => b.n > W * H * 0.005)
    .sort((a, b) => (Math.abs(a.y0 - b.y0) > H * 0.1 ? a.y0 - b.y0 : a.x0 - b.x0))
  return bows.map((b) => async () => {
    const pad = 3
    const bx = Math.max(0, b.x0 - pad), by = Math.max(0, b.y0 - pad)
    const bw = Math.min(W, b.x1 + pad + 1) - bx, bh = Math.min(H, b.y1 + pad + 1) - by
    const mask = Buffer.alloc(bw * bh)
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      // This bow's pixels, widened by 2 so its soft edge is kept whole.
      let mine = false
      for (let dy = -2; dy <= 2 && !mine; dy++) for (let dx = -2; dx <= 2 && !mine; dx++) {
        const xx = bx + x + dx, yy = by + y + dy
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && label[yy * W + xx] === b.id) mine = true
      }
      if (mine) mask[y * bw + x] = 255
    }
    const box = { left: Math.floor(bx * k), top: Math.floor(by * k) }
    box.width = Math.min(meta.width - box.left, Math.ceil(bw * k))
    box.height = Math.min(meta.height - box.top, Math.ceil(bh * k))
    const grey = await sharp(mask, { raw: { width: bw, height: bh, channels: 1 } }).resize(box.width, box.height).blur(1).extractChannel(0).raw().toBuffer()
    // The mask as the alpha of a black picture: 'dest-in' keeps the crop only where it is.
    const alpha = await sharp({ create: { width: box.width, height: box.height, channels: 3, background: '#000' } })
      .joinChannel(grey, { raw: { width: box.width, height: box.height, channels: 1 } }).png().toBuffer()
    return sharp(await sharp(file).extract(box).ensureAlpha().composite([{ input: alpha, blend: 'dest-in' }]).png().toBuffer())
  })
}

async function save(name, input, widths) {
  const buf = await input.png().toBuffer()
  for (const w of widths) {
    const file = `${OUT}/${name}${widths.length > 1 ? `-${w}` : ''}.webp`
    const r = await sharp(buf).trim().resize({ width: w, withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 95 }).toFile(file)
    console.log(`${file}: ${r.width}×${r.height}, ${Math.round(r.size / 1024)} KB`)
  }
}

// The step boxes (owner's picks, 2026-10-15): the green plaid and the plain red watercolor bows
// from the set of six (32476415), and the pink gingham watercolor bow (42074935).
const sheet = `${SRC}/vecteezy_set-of-bows_32476415.png`
const [greenPlaid, , red] = await sheetBows(sheet) // row 1: green plaid, brown plaid; row 2: red, red plaid; row 3: orange, blue
await save('bow-green-plaid', await greenPlaid(), [360])
await save('bow-red-watercolor', await red(), [360])
await save('bow-pink-gingham', sharp(`${SRC}/vecteezy_pink-bow-on-a-transparent-background-pink-ribbon-hand_42074935.png`), [360])
