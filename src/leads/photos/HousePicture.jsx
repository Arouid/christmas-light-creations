import { useEffect, useRef, useState } from 'react'
import { housePhotoOf, photoDate, photoList, storageProblem } from '../../lib/jobRecord'
import StreetViewPhoto from '../StreetViewPhoto'
import { useStaff } from '../staffContext'
import { addPhoto, setHousePhoto, storageEnabled } from './photoStore'

const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50'

// The house at the top of a customer card (docs/specs/job-record.md → House
// photo; owner 2026-10-14): our own photo when staff picked one
// (customer.housePhoto), else Google Street View. "📷 Use our own photo"
// uploads a picture into the customer's Photos and makes it the house photo in
// one go; any photo under Photos can be picked too (🏠 Use as house photo).
export default function HousePicture({ customer, season, address }) {
  const { user } = useStaff()
  const photo = housePhotoOf(customer)
  const [street, setStreet] = useState(false) // peeking at Street View while a house photo is set
  const [enabled, setEnabled] = useState(null) // null = checking Storage
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [choosing, setChoosing] = useState(false) // their photos to pick from, before uploading a new one
  const input = useRef(null)
  const others = photoList(customer.photos).filter((p) => p.id !== customer.housePhoto)

  // With photos on file, offer those first (picking one is free and makes no copy).
  function change() {
    setError('')
    if (others.length) setChoosing(!choosing)
    else input.current?.click()
  }

  async function pick(p) {
    setError('')
    try {
      await setHousePhoto(user, customer, p.id)
      setChoosing(false)
      setStreet(false)
    } catch (err) {
      console.warn('House photo change failed', err)
      setError('Couldn’t change it. Check your signal and try again.')
    }
  }

  useEffect(() => { storageEnabled().then(setEnabled) }, [])

  async function picked(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setError('')
    setBusy(true)
    try {
      await addPhoto(user, customer, season, file, { house: true })
      setChoosing(false)
      setStreet(false)
    } catch (err) {
      console.warn('House photo upload failed', err)
      setError(storageProblem(err))
    }
    setBusy(false)
  }

  async function backToStreetView() {
    setError('')
    try {
      await setHousePhoto(user, customer, null)
      setStreet(false)
    } catch (err) {
      console.warn('House photo change failed', err)
      setError('Couldn’t change it. Check your signal and try again.')
    }
  }

  const showPhoto = photo && !street
  return (
    <div className="space-y-2">
      {showPhoto ? (
        <a href={photo.url} target="_blank" rel="noreferrer" className="relative block overflow-hidden rounded-xl">
          <img src={photo.url} alt={`Our photo of the house at ${address || customer.fullName}`} className="aspect-[2/1] w-full bg-white/5 object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full bg-night-950/80 px-3 py-1 text-xs font-medium">🏠 House photo{photo.at ? ` · ${photoDate(photo.at)}` : ''}</span>
        </a>
      ) : address ? <StreetViewPhoto address={address} /> : null}

      {user && enabled !== false && (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={picked} aria-label="Choose a photo of the house" />
          <button type="button" onClick={change} disabled={busy || enabled === null} className={btn} aria-expanded={others.length ? choosing : undefined}>
            {busy ? 'Uploading…' : photo ? '📷 Change house photo' : '📷 Use our own photo'}
          </button>
          {photo && address && (
            <button type="button" onClick={() => setStreet(!street)} className={btn} aria-pressed={street}>
              {street ? '🏠 Our photo' : '🗺 Street View'}
            </button>
          )}
          {photo && street && <button type="button" onClick={backToStreetView} className={btn}>Use Street View instead</button>}
        </div>
      )}
      {choosing && others.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-night-900 p-3">
          <p className="text-sm text-slate-300">Pick one of their photos, or add a new one.</p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {others.slice(0, 12).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => pick(p)} className="block w-full" aria-label={`Use the photo from ${photoDate(p.at)} as the house photo`}>
                  <img src={p.thumbUrl || p.url} alt="" loading="lazy" className="aspect-square w-full rounded-lg bg-white/5 object-cover" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className={btn}>📷 New photo</button>
            <button type="button" onClick={() => setChoosing(false)} className={btn}>Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl border border-berry-500/50 bg-berry-600/15 px-3 py-2 text-sm">{error}</p>}
    </div>
  )
}
