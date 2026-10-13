// Photos on the public designer (docs/specs/public-designer.md): every upload
// is redrawn at the standard size (which also drops the phone's location
// data), and the finished picture is made from the design with our mark on
// it (the logo and the designer's address, "Watermark and terms" in the
// spec). Browser only. DesignPage loads this file only when it has to draw
// (not at page load).
import { business } from '../data/content.js'
import { loadImage } from '../designer/image.js'
import { renderDesign } from '../designer/render.js'
import { LIMITS, QUALITIES, standardSize, watermark } from '../lib/publicDesign.js'

export { loadImage, renderDesign }

// The wide logo for the mark, loaded once: null until then, or for good if
// it fails (the mark is then text only). DesignPage awaits loadBrand() along
// with the photo, so finishedPicture never runs before it.
let brand = null
let brandLoading
export function loadBrand() {
  brandLoading ??= loadImage(business.logoWide).then((i) => (brand = i), () => null)
  return brandLoading
}

// Our mark on a picture the designer's own ⬇ Save button exports.
export async function stamp(ctx, width, height) {
  watermark(ctx, width, height, { logo: await loadBrand() })
}

// JPEG data URL no longer than `max` characters (lower quality if needed).
function encode(canvas, max) {
  for (const q of QUALITIES) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= max) return url
  }
  return null
}

// A picked file -> { src, width, height, portrait }. Throws an Error whose
// message is 'too-small', 'unreadable' or 'too-big'.
export async function standardPhoto(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('unreadable')
  }
  const size = standardSize(bitmap.width, bitmap.height)
  if (!size) { bitmap.close?.(); throw new Error('too-small') }
  const c = document.createElement('canvas')
  c.width = size.width
  c.height = size.height
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close?.()
  const src = encode(c, LIMITS.photo)
  if (!src) throw new Error('too-big')
  return { src, width: size.width, height: size.height, portrait: size.portrait }
}

// The design drawn on its photo, with our mark -> JPEG data URL that fits the
// limit. This is the thumbnail on the form and what's sent with the request.
export function finishedPicture(design, img, logo = brand) {
  const c = document.createElement('canvas')
  c.width = design.photo.width
  c.height = design.photo.height
  const ctx = c.getContext('2d')
  renderDesign(ctx, design, img)
  watermark(ctx, c.width, c.height, { logo })
  return encode(c, LIMITS.image)
}
