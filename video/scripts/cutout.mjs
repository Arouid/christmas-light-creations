// Cuts the photoreal cottage out of its own night sky, so it can sit on any scene without the
// render's background showing as a patch. Sky = dark, blue-leaning pixels; everything the sky
// can reach from the picture's edges is background; of what is left, the biggest connected piece
// (the cottage on its snow mound) is kept, so loose snowflakes and smoke wisps go. The mound's
// bottom is faded so it dissolves into the scene. Writes <name>-cut.png (lit) and
// <name>-cut-off.png (lights off) next to the inputs, RGBA.
export async function cutout(sharp, litPath, offPath, outLit, outOff) {
  const meta = await sharp(litPath).metadata()
  const W = meta.width, H = meta.height
  const work = 1024
  const scale = work / W
  const w = work, h = Math.round(H * scale)
  const { data: rgb } = await sharp(litPath).resize(w, h).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const n = w * h
  const sky = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const max = Math.max(r, g, b)
    const blueish = b >= r && b >= g
    sky[i] = blueish && max < 125 ? 1 : 0
  }
  // Flood from the edges through sky.
  const label = new Int32Array(n) // 0 = unvisited, 1 = background, 2+ = foreground component id
  const stack = []
  const push = (i) => { if (label[i] === 0 && sky[i]) { label[i] = 1; stack.push(i) } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (stack.length) {
    const i = stack.pop()
    const x = i % w, y = (i - x) / w
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (y > 0) push(i - w)
    if (y < h - 1) push(i + w)
  }
  // Foreground components; keep the biggest.
  let next = 2, best = 0, bestSize = 0
  for (let s = 0; s < n; s++) {
    if (label[s] !== 0) continue
    const id = next++
    let size = 0
    label[s] = id; stack.push(s)
    while (stack.length) {
      const i = stack.pop(); size++
      const x = i % w, y = (i - x) / w
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
      for (const j of nb) if (j >= 0 && label[j] === 0) { label[j] = id; stack.push(j) }
    }
    if (size > bestSize) { bestSize = size; best = id }
  }
  const alphaSmall = Buffer.alloc(n)
  for (let i = 0; i < n; i++) alphaSmall[i] = label[i] === best ? 255 : 0
  // Soften the edge, shave a hair off it (no navy fringe), fade the mound's bottom.
  const { data: alphaFull, info } = await sharp(alphaSmall, { raw: { width: w, height: h, channels: 1 } })
    .resize(W, H, { kernel: 'lanczos3' }).blur(2.5).threshold(150).blur(1.6).raw().toBuffer({ resolveWithObject: true })
  const ach = info.channels
  const alpha = Buffer.alloc(W * H)
  const fadeFrom = Math.round(H * 0.86)
  for (let y = 0; y < H; y++) {
    const fade = y < fadeFrom ? 1 : 1 - (y - fadeFrom) / (H - fadeFrom)
    for (let x = 0; x < W; x++) alpha[y * W + x] = Math.round(alphaFull[(y * W + x) * ach] * fade)
  }
  for (const [src, dst] of [[litPath, outLit], [offPath, outOff]]) {
    const { data: px } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const rgba = Buffer.alloc(W * H * 4)
    for (let i = 0; i < W * H; i++) {
      rgba[i * 4] = px[i * 3]; rgba[i * 4 + 1] = px[i * 3 + 1]; rgba[i * 4 + 2] = px[i * 3 + 2]; rgba[i * 4 + 3] = alpha[i]
    }
    await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 8 }).toFile(dst)
  }
  return { kept: bestSize / n }
}
