// Photos on the public designer (docs/specs/public-designer.md): every upload
// is redrawn at the standard size (which also drops the phone's location
// data), and the finished picture is made from the design. Browser only.
import { renderDesign } from '../designer/render.js'
import { LIMITS, QUALITIES, standardSize } from '../lib/publicDesign.js'

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

// The design drawn on its photo -> JPEG data URL that fits the limit.
export function finishedPicture(design, img) {
  const c = document.createElement('canvas')
  c.width = design.photo.width
  c.height = design.photo.height
  renderDesign(c.getContext('2d'), design, img)
  return encode(c, LIMITS.image)
}
