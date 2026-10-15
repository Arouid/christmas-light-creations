// The gift-wrapping page's bows (docs/specs/gift-wrapping.md), from the
// owner's Vecteezy Pro PNGs with real transparency (raw files at the top of
// assets-source/stock/vecteezy/, git-ignored, never shipped) →
// public/images/gift-wrap/decor/. Owner 2026-10-15: "please look at the new
// PNG's I added I really like them and think they can be used to upgrade the
// bows", "pick new bows for all 3 gifts". No white to take out, so no fringe.
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
// The big bow on the top ribbon: the owner's own pick, which he saved as top-bow.png (2026-10-15:
// a red bow with gold edges and stars, holly on top), on the black ribbon he asked for.
await save('bow-top', sharp(`${SRC}/top-bow.png`), [480, 720])
// The price tag's bow and the home card's: red satin (51962097).
await save('bow-satin', sharp(`${SRC}/vecteezy_elegant-red-satin-bow-on-transparent-background-perfect-for_51962097.png`), [360])

// Santa and the elf walking on the price tag (owner 2026-10-15: "the characters, place them like
// theyre walking ontop of the price sign and get rid of the bow thats there"), from the 3D
// illustration 9299942, without its stack of presents: the page only ever shows the owner's own
// wrapping. The three touch in the picture, so each character is cut by hand-traced outlines, in
// two passes: a rough box round each (in 1/1000ths of the part of the picture they stand in,
// x 0.12–0.92 and y 0.15–0.90), then tighter outlines round arms, legs and shoes (in % of that
// first cut). Checked on a green background at 2×: no part of a present left.
const people = `${SRC}/vecteezy_3d-christmas-illustration_9299942.png`
const ROUGH = {
  santa: [[[20, 20], [300, 20], [300, 432], [243, 432], [243, 792], [300, 792], [300, 910], [20, 910]]],
  elf: [
    [[680, 20], [960, 20], [960, 548], [680, 548]],
    [[757, 540], [812, 540], [812, 796], [757, 796]],
    [[818, 540], [888, 540], [888, 796], [818, 796]],
    [[685, 788], [900, 788], [900, 885], [685, 885]],
  ],
}
const TIGHT = {
  santa: [[[0, 0], [100, 0], [100, 43], [82, 43], [82, 45.5], [70, 45.5], [70, 62], [67, 62], [67, 86], [80, 86], [80, 88], [100, 88], [100, 100], [0, 100]]],
  elf: [
    [[0, 0], [100, 0], [100, 59.6], [73.5, 59.6], [73.5, 60.9], [37, 60.9], [37, 58.6], [33, 58.6], [33, 46.5], [7, 46.5], [7, 40], [0, 40]], // head, arms, jacket, skirt
    [[38.3, 59.5], [48.9, 59.5], [48.9, 61.1], [46.7, 65.7], [45.6, 71.1], [45.6, 80], [45, 83.6], [44.4, 90.7], [29.8, 90.7], [29.8, 86.1], [30, 80], [31.7, 75], [33.3, 71.1], [36.7, 65.7], [38.3, 61.1]], // a leg
    [[50.6, 59.5], [62.2, 59.5], [64.4, 65.7], [66.7, 71.1], [70, 75], [73.3, 80], [76.1, 85.4], [77.2, 90.7], [57.8, 90.7], [57.8, 86.1], [57.2, 80], [56.1, 75], [55, 71.1], [52.2, 65.7], [50.9, 61.1]], // the other leg
    [[6, 90.5], [78, 90.5], [78, 100], [6, 100]], // the shoes
  ],
}
async function keepInside(input, parts, toPx) {
  const buf = await sharp(input).ensureAlpha().png().toBuffer()
  const { width, height } = await sharp(buf).metadata()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.map((p) => `<polygon points="${p.map((pt) => toPx(pt, width, height).join(',')).join(' ')}" fill="#fff"/>`).join('')}</svg>`
  return sharp(await sharp(await sharp(buf).composite([{ input: Buffer.from(svg), blend: 'dest-in' }]).png().toBuffer()).trim().png().toBuffer())
}
for (const name of ['santa', 'elf']) {
  const rough = await keepInside(people, ROUGH[name], ([x, y], w, h) => [(0.12 + (x / 1000) * 0.8) * w, (0.15 + (y / 937.5) * 0.75) * h])
  const tight = await keepInside(await rough.png().toBuffer(), TIGHT[name], ([x, y], w, h) => [(x / 100) * w, (y / 100) * h])
  const buf = await tight.png().toBuffer()
  const r = await sharp(buf).resize({ height: 400 }).webp({ quality: 84, alphaQuality: 95 }).toFile(`${OUT}/${name}.webp`)
  console.log(`${OUT}/${name}.webp: ${r.width}×${r.height}, ${Math.round(r.size / 1024)} KB`)
}

// The ornaments hanging from the top ribbon (owner's picks, matching his top bow): striped
// (70397459), ornate gold (54122407) and patterned with a gold cap (73206478). Their strings are CSS.
await save('ornament-striped', sharp(`${SRC}/vecteezy_red-and-gold-striped-christmas-ornament-with-metallic-cap_70397459.png`), [200])
await save('ornament-ornate', sharp(`${SRC}/vecteezy_a-beautifully-ornate-red-ornament-with-intricate-gold_54122407.png`), [200])
await save('ornament-gold', sharp(`${SRC}/vecteezy_red-and-gold-christmas-ornament-with-hanging-string_73206478.png`), [200])
// Accents: glossy holly on the ribbon between boxes (50176637) and a pine garland with ornaments
// and pinecones along the foot of the page (49146397). (The candy cane 31099142 and the pine corner
// spray 45838499 came off on 2026-10-15: "ditch the candy cane".)
await save('holly-glossy', sharp(`${SRC}/vecteezy_holly-leaves-with-berries-isolated-on-transparent-background_50176637.png`), [300])
await save('garland', sharp(`${SRC}/vecteezy_festive-garland-with-ornaments-and-pinecones-cut-out-stock_49146397.png`), [700, 1100])
// A red-and-gold bell with a satin bow (86864817), hanging over the form box: ring us.
await save('bell', sharp(`${SRC}/vecteezy_red-and-gold-christmas-bell-ornament-with-red-satin-bow-and_86864817.png`), [240])

// The questions box wrapped like a gift card (owner 2026-10-15: "thorw one of those corner wrap
// ribbon sets on it", then his own picture, "ribbon corner.png": a white card with red satin
// ribbon across two corners). The card is opaque white, so only the red is kept, by how much
// redder than green and blue each pixel is (the satin's shading stays). The left half gives the
// bow with its ribbon running off the card's top and left edges, the right half the plain strip
// running off its right and bottom edges; both at one scale, so the two read as one ribbon.
{
  const { data, info } = await sharp(`${SRC}/ribbon corner.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const red = (data[i] - Math.max(data[i + 1], data[i + 2]) - 25) / 60
    data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, red)))
  }
  const half = (left) => sharp(data, { raw: info }).extract({ left, top: 0, width: info.width / 2, height: info.height }).png().toBuffer()
  const bow = await sharp(await half(0)).trim().png().toBuffer()
  const strip = await sharp(await half(info.width / 2)).trim().png().toBuffer()
  const k = 300 / (await sharp(bow).metadata()).width
  for (const [name, buf] of [['ribbon-corner-bow', bow], ['ribbon-corner-strip', strip]]) {
    const { width } = await sharp(buf).metadata()
    const r = await sharp(buf).resize({ width: Math.round(width * k) }).webp({ quality: 84, alphaQuality: 95 }).toFile(`${OUT}/${name}.webp`)
    console.log(`${OUT}/${name}.webp: ${r.width}×${r.height}, ${Math.round(r.size / 1024)} KB`)
  }
}

// The big bow on the ribbon above the "Wrapped by us" box: the pink gingham watercolor bow
// (42074935, as on step 3) at a size for wide screens, from the owner's mockup (2026-10-15, "have
// the tails go behind the picture"), after the Santa-style red glitter bow (50245493) and the
// glossy pastel pink one (71227298). (The gold corner bow and strip, 26795272, came off the same
// day: "take the gold ribbons off".)
// Softened to baby pink ("if we can make the bow more baby pink that it is now").
await save('bow-pink-gingham-big', sharp(`${SRC}/vecteezy_pink-bow-on-a-transparent-background-pink-ribbon-hand_42074935.png`).modulate({ saturation: 0.55, brightness: 1.1 }), [720])

// A cheerful elf waving, with a candy cane (73327127), popping up from behind the big bow on
// "Wrapped by us" (owner 2026-10-15: "maybe we can have a characters popping their head up from
// behind the pink bow", then "I wanna try some other", "preferably just 1 of whatever it is"). The
// picture ends at his waist, which the bow hides.
await save('elf-waving', sharp(`${SRC}/vecteezy_cheerful-christmas-elf-holding-candy-cane-on-transparent_73327127.png`), [480])

// Crossed candy canes with a red-and-green bow (19006845), standing between Santa and the elf on
// the price tag (owner 2026-10-15, his mockup: "put that candy cane inbetween them at that suze").
await save('candy-canes', sharp(`${SRC}/vecteezy_christmas-candy-cane-and-ribbon_19006845.png`), [440])

// Santa's sleigh and reindeer flying over the top ribbon (73158534, owner 2026-10-15), with its
// trail of stars; the three little presents falling from it are left out (every gift on the page
// is the owner's own).
{
  const file = `${SRC}/vecteezy_santa-claus-riding-a-reindeer-sleigh_73158534.png`
  const { width: W, height: H } = await sharp(file).metadata()
  // The presents, as [left, top, right, bottom] shares of the picture.
  const presents = [[0.172, 0.655, 0.235, 0.762], [0.12, 0.79, 0.163, 0.885], [0.18, 0.77, 0.24, 0.885]]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${presents.map(([x0, y0, x1, y1]) => `<rect x="${x0 * W}" y="${y0 * H}" width="${(x1 - x0) * W}" height="${(y1 - y0) * H}" fill="#fff"/>`).join('')}</svg>`
  const cut = await sharp(file).composite([{ input: Buffer.from(svg), blend: 'dest-out' }]).png().toBuffer()
  await save('sleigh', sharp(cut), [520])
}
