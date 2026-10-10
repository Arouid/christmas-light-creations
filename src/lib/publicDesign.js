// "Design your lights" on the public site (docs/specs/public-designer.md):
// the standard photo size and what a design attached to an estimate request
// may hold (the same limits as firestore.rules `leadDesigns`). Pure.

export const STANDARD_LONG_SIDE = 1280
export const MIN_LONG_SIDE = 800
export const LIMITS = { photo: 450000, image: 450000, design: 100000 }
export const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42]

// Any photo -> the standard size (long side 1280, same shape), or null if
// it's too small to design on.
export function standardSize(width, height) {
  if (!(width > 0 && height > 0) || Math.max(width, height) < MIN_LONG_SIDE) return null
  const k = STANDARD_LONG_SIDE / Math.max(width, height)
  return { width: Math.round(width * k), height: Math.round(height * k), portrait: height > width }
}

// What's wrong with an attachment before sending it, or ''.
export function attachmentProblem({ design, photo, image } = {}) {
  const jpeg = (s) => typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)
  if (typeof design !== 'string' || !design || design.length > LIMITS.design) return 'design'
  if (photo !== 'sample' && !(jpeg(photo) && photo.length <= LIMITS.photo)) return 'photo'
  if (!(jpeg(image) && image.length <= LIMITS.image)) return 'image'
  return ''
}
