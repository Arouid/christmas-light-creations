// Staff-app adapter for the light designer: where designs live in Firestore.
//   designs/{id}       { ownerType, ownerId, ownerName, name, designJson, thumb, feet, price, measured }
//   designFiles/{id-photo|id-render}  { dataUrl }   (large images, read only when opened)
// designJson is the designer's JSON as a string (Firestore can't store the
// nested point arrays directly, and a string keeps the module's format as-is).
import { addRecord, deleteRecord, getRecord, saveRecord, useLiveQuery } from '../staffStore'

const newestFirst = (a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? ''))

export function useDesigns(user, ownerId) {
  // useLiveQuery returns the list itself (an empty list if the database refuses).
  return { designs: useLiveQuery(user, 'designs', 'ownerId', ownerId, newestFirst), error: null }
}

export async function loadDesignPhoto(designId) {
  return (await getRecord('designFiles', `${designId}-photo`))?.dataUrl ?? null
}
export async function loadDesignRender(designId) {
  return (await getRecord('designFiles', `${designId}-render`))?.dataUrl ?? null
}

// Save (create or update). Returns the design id.
export async function saveDesign(user, { id, owner, design, photoDataUrl, renderDataUrl, thumb, stats }) {
  const meta = {
    ownerType: owner.type,
    ownerId: owner.id,
    ownerName: owner.name ?? '',
    name: design.name || owner.name || 'Design',
    designJson: JSON.stringify(design),
    thumb,
    feet: Math.round(stats.feet),
    price: stats.price,
    measured: stats.measured,
    savedAt: new Date().toISOString(),
  }
  let designId = id
  if (designId) await saveRecord(user, 'designs', designId, meta)
  else designId = await addRecord(user, 'designs', meta)
  if (photoDataUrl) await saveRecord(user, 'designFiles', `${designId}-photo`, { designId, dataUrl: photoDataUrl })
  if (renderDataUrl) await saveRecord(user, 'designFiles', `${designId}-render`, { designId, dataUrl: renderDataUrl })
  return designId
}

export async function removeDesign(id) {
  await Promise.all([deleteRecord('designFiles', `${id}-photo`), deleteRecord('designFiles', `${id}-render`)])
  await deleteRecord('designs', id)
}

// Blob -> data URL, optionally shrunk (thumbnails for lists).
export async function blobToDataUrl(blob, maxDim = null, quality = 0.8) {
  const bmp = await createImageBitmap(blob)
  const k = maxDim ? Math.min(1, maxDim / Math.max(bmp.width, bmp.height)) : 1
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  return c.toDataURL('image/jpeg', quality)
}
