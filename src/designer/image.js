// Photo helpers: shrink a phone photo to a web-friendly JPEG (also drops its
// location/EXIF data, since only pixels are re-encoded), and load images.

export async function photoToDataUrl(file, maxDim = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const k = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * k)
  const h = Math.round(bitmap.height * k)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return { dataUrl: c.toDataURL('image/jpeg', quality), width: w, height: h }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })
}
