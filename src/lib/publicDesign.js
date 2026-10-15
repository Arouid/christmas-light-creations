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

// The design in progress, kept in the browser tab (sessionStorage) so a
// reload or the Back button doesn't lose it; gone when the tab closes. The
// photo has its own key so a slider tick only rewrites the small design.
export const SAVED_KEYS = { photo: 'clc-design-photo', design: 'clc-design' }

// What was kept -> { photo: 'sample' | data URL, design, portrait }, or null
// for nothing usable (missing, damaged, or from an older page).
export function savedDesign(photoRaw, designRaw) {
  const jpeg = (s) => typeof s === 'string' && s.startsWith('data:image/jpeg;base64,') && s.length <= LIMITS.photo
  if (photoRaw !== 'sample' && !jpeg(photoRaw)) return null
  let s
  try { s = JSON.parse(designRaw) } catch { return null }
  const d = s?.design
  if (s?.v !== 1 || !d || typeof d !== 'object' || !Array.isArray(d.strands) || !(d.photo?.width > 0 && d.photo?.height > 0)) return null
  return { photo: photoRaw, design: d, portrait: s.portrait === true }
}

// The business mark on every picture the public designer saves or sends
// (spec: "Watermark and terms"): the wide logo on a dark see-through plate in
// the bottom-right corner, the designer's address under it, sized with the
// picture, so a screenshot still says where it came from. Only exported
// bitmaps get it (design/photo.js); the editor on screen stays clean.
export const WATERMARK_TEXT = 'christmas-light-creations.com/design'

// Text size for a picture this wide: 19 px on a 1280-px photo, never under 12.
export const watermarkFontSize = (width) => Math.max(12, Math.round(width / 68))

// Where everything goes, in picture pixels. logoAspect = logo width / height
// (0 = no logo, text only); textWidth = the measured text, or 0 for a guess.
export function watermarkLayout(width, height, { logoAspect = 0, textWidth = 0 } = {}) {
  const font = watermarkFontSize(width)
  const pad = Math.round(font * 0.7)
  const gap = Math.round(font * 0.35)
  const logoW = logoAspect > 0 ? Math.round(width * 0.24) : 0
  const logoH = logoAspect > 0 ? Math.round(logoW / logoAspect) : 0
  const textW = Math.round(textWidth > 0 ? textWidth : font * 0.52 * WATERMARK_TEXT.length)
  const w = Math.max(logoW, textW) + pad * 2
  const h = pad + (logoH ? logoH + gap : 0) + font + pad
  const x = width - pad - w
  const y = height - pad - h
  return {
    font,
    plate: { x, y, w, h, r: Math.round(font * 0.6) },
    logo: logoH ? { x: Math.round(x + (w - logoW) / 2), y: y + pad, w: logoW, h: logoH } : null,
    text: { x: Math.round(x + w / 2), y: y + h - pad },
  }
}

// Draw the mark on a finished picture through its 2D context. `logo` is a
// loaded image (anything with width/height that drawImage accepts) or null
// for text only. Returns the layout it used.
export function watermark(ctx, width, height, { logo = null, text = WATERMARK_TEXT } = {}) {
  const font = `600 ${watermarkFontSize(width)}px Inter, system-ui, sans-serif`
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.font = font
  const measured = ctx.measureText?.(text)?.width
  const aspect = logo && logo.width > 0 && logo.height > 0 ? logo.width / logo.height : 0
  const L = watermarkLayout(width, height, { logoAspect: aspect, textWidth: Number.isFinite(measured) ? measured : 0 })
  const { x, y, w, h, r } = L.plate
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(5,11,26,0.55)'
  ctx.fill()
  if (L.logo) {
    ctx.globalAlpha = 0.92
    ctx.drawImage(logo, L.logo.x, L.logo.y, L.logo.w, L.logo.h)
    ctx.globalAlpha = 1
  }
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(text, L.text.x, L.text.y)
  ctx.restore()
  return L
}
