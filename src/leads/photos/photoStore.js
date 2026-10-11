// After-install photos (docs/specs/job-record.md): shrink in the browser,
// upload to Firebase Storage, keep the list on the customer record.
//   Storage   customers/{id}/{season}/{photoId}.jpg (+ -thumb.jpg)
//   Firestore customers/{id}.photos.{photoId} = { path, url, thumbUrl, season, at, by, width, height }
// In demo mode (?demo) the pictures stay in memory as data URLs.
import { firebaseConfig, getFirebaseApp } from '../../lib/firebase'
import { MAX_PHOTO_PX, MAX_UPLOAD_BYTES, PHOTO_QUALITY, THUMB_PX, fitWithin, photoId, photoPaths } from '../../lib/jobRecord'
import { demoMode } from '../demo'
import { mergePaths, useLiveDoc } from '../staffStore'

// Is this staff member the owner (staff/{email}.owner === true)? Decides whether
// Remove shows on other people's photos; storage.rules make the real decision.
export function useIsOwner(user) {
  const email = String(user?.email ?? '').toLowerCase()
  const { data } = useLiveDoc(user, 'staff', email)
  return data?.owner === true
}

async function storage() {
  const [mod, app] = await Promise.all([import('firebase/storage'), getFirebaseApp()])
  return { ...mod, st: mod.getStorage(app) }
}

// A picked file → JPEG blob no bigger than `max` px on the long side. The
// photo is redrawn, so the phone's location data is dropped too. The EXIF
// orientation is applied where the browser supports the option.
async function shrink(file, max, quality = PHOTO_QUALITY) {
  let bmp
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    bmp = await createImageBitmap(file)
  }
  const { width, height } = fitWithin(bmp.width, bmp.height, max)
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, width, height)
  bmp.close?.()
  const blob = await new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t read this picture'))), 'image/jpeg', quality))
  return { blob, width, height, dataUrl: demoMode ? c.toDataURL('image/jpeg', quality) : null }
}

// Upload one picture for a customer and season; resolves to the saved entry.
export async function addPhoto(user, customer, season, file) {
  const id = photoId()
  const paths = photoPaths(customer.id, season, id)
  const [full, thumb] = await Promise.all([shrink(file, MAX_PHOTO_PX), shrink(file, THUMB_PX, 0.8)])
  if (full.blob.size >= MAX_UPLOAD_BYTES) {
    const smaller = await shrink(file, MAX_PHOTO_PX, 0.7)
    if (smaller.blob.size >= MAX_UPLOAD_BYTES) throw new Error('This picture is too big even after shrinking.')
    Object.assign(full, smaller)
  }
  const base = { path: paths.full, season: String(season), at: Date.now(), by: user.email, width: full.width, height: full.height }
  let entry
  if (demoMode) {
    entry = { ...base, url: full.dataUrl, thumbUrl: thumb.dataUrl }
  } else {
    const { st, ref, uploadBytes, getDownloadURL } = await storage()
    const customMetadata = { by: user.email, customerId: customer.id, season: String(season) }
    const fullRef = ref(st, paths.full)
    const thumbRef = ref(st, paths.thumb)
    await uploadBytes(fullRef, full.blob, { contentType: 'image/jpeg', customMetadata })
    await uploadBytes(thumbRef, thumb.blob, { contentType: 'image/jpeg', customMetadata })
    const [url, thumbUrl] = await Promise.all([getDownloadURL(fullRef), getDownloadURL(thumbRef)])
    entry = { ...base, url, thumbUrl }
  }
  await mergePaths(user, 'customers', customer.id, { [`photos.${id}`]: entry })
  return { id, ...entry }
}

// Remove a photo: both files, then the entry on the record.
export async function removePhoto(user, customer, photo) {
  if (!demoMode && photo.path) {
    const { st, ref, deleteObject } = await storage()
    const gone = (err) => { if (err?.code !== 'storage/object-not-found') throw err }
    await deleteObject(ref(st, photo.path)).catch(gone)
    await deleteObject(ref(st, photo.path.replace(/\.jpg$/, '-thumb.jpg'))).catch(gone)
  }
  await mergePaths(user, 'customers', customer.id, { [`photos.${photo.id}`]: null })
}

// Does the project's bucket exist yet? Storage has to be turned on once in the
// Firebase console; until then every upload would fail. One anonymous probe
// per page load: 404 = no bucket; anything else (403 from the rules) = it's on.
let probe
export function storageEnabled() {
  if (demoMode) return Promise.resolve(true)
  probe ??= fetch(`https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o?maxResults=1`, { method: 'GET' })
    .then((r) => r.status !== 404)
    .catch(() => true)
  return probe
}
