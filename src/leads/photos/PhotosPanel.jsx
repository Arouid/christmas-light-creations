import { useEffect, useRef, useState } from 'react'
import { canDeletePhoto, photoDate, photosBySeason, storageProblem } from '../../lib/jobRecord'
import { staffName, staffNamesMap } from '../../lib/activity'
import { useStaff } from '../staffContext'
import { addPhoto, removePhoto, setHousePhoto, storageEnabled, useIsOwner } from './photoStore'

const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50'

// After-install photos of one customer (docs/specs/job-record.md): take or
// pick pictures on a phone, see them newest first by season, tap for full
// size, remove your own (the owner can remove any).
export default function PhotosPanel({ customer, season }) {
  const { user, settings } = useStaff()
  const isOwner = useIsOwner(user)
  const names = staffNamesMap([], settings?.staffNames ?? [])
  const [enabled, setEnabled] = useState(null) // null = checking
  const [busy, setBusy] = useState('') // "Uploading 1 of 3…"
  const [error, setError] = useState('')
  const [note, setNote] = useState('') // "already here" after an upload
  const [open, setOpen] = useState(null) // photo being viewed
  const camera = useRef(null)
  const gallery = useRef(null)
  const groups = photosBySeason(customer.photos)
  const count = groups.reduce((n, [, list]) => n + list.length, 0)

  useEffect(() => { storageEnabled().then(setEnabled) }, [])

  async function picked(e) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!files.length || !user) return
    setError('')
    setNote('')
    // Photos added in this batch count too, so the same picture twice in one pick is caught.
    let photos = customer.photos ?? {}
    let already = 0
    for (const [i, file] of files.entries()) {
      setBusy(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : 'Uploading…')
      try {
        const { id, duplicate, ...entry } = await addPhoto(user, { ...customer, photos }, season, file)
        if (duplicate) already += 1
        else photos = { ...photos, [id]: entry }
      } catch (err) {
        console.warn('Photo upload failed', err)
        setError(storageProblem(err))
        break
      }
    }
    setBusy('')
    if (already) setNote(already === 1 ? 'That picture is already here, so it wasn’t added again.' : `${already} of those pictures are already here, so they weren’t added again.`)
  }

  async function remove(photo) {
    if (!window.confirm('Remove this photo? This can’t be undone.')) return
    setError('')
    try {
      await removePhoto(user, customer, photo)
      setOpen(null)
    } catch (err) {
      console.warn('Photo remove failed', err)
      setError(storageProblem(err))
    }
  }

  // The card shows this photo instead of Street View (HousePicture.jsx).
  async function makeHouse(photo) {
    setError('')
    try {
      await setHousePhoto(user, customer, photo.id)
    } catch (err) {
      console.warn('House photo change failed', err)
      setError('Couldn’t change it. Check your signal and try again.')
    }
  }

  const who = (p) => staffName(p.by, names)
  const isHouse = (p) => Boolean(p?.id) && p.id === customer.housePhoto

  return (
    <div className="space-y-3">
      {enabled === false ? (
        <p className="rounded-xl bg-glow-400/10 px-3 py-2 text-sm text-glow-300">Photos aren’t turned on yet: Firebase Storage needs to be enabled for the project (Scott, docs/TODO.md #51). Nothing else changes.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={picked} aria-label="Take a photo" />
          <input ref={gallery} type="file" accept="image/*" multiple className="hidden" onChange={picked} aria-label="Choose photos" />
          <button type="button" onClick={() => camera.current?.click()} disabled={Boolean(busy) || !user} className={btn}>📷 Take photo</button>
          <button type="button" onClick={() => gallery.current?.click()} disabled={Boolean(busy) || !user} className={btn}>🖼 From gallery</button>
          {busy && <span className="text-sm text-slate-400" role="status">{busy}</span>}
        </div>
      )}
      {error && <p role="alert" className="rounded-xl border border-berry-500/50 bg-berry-600/15 px-3 py-2 text-sm">{error}</p>}

      {count === 0
        ? <p className="text-sm text-slate-400">No photos yet. After an install, take a few of the finished house: they help next year’s crew, service calls and reviews.</p>
        : groups.map(([s, list]) => (
          <section key={s} aria-label={`${s} photos`}>
            {groups.length > 1 && <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{s} season · {list.length}</h4>}
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {list.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setOpen(p)} className="relative block w-full text-left" aria-label={`Photo from ${photoDate(p.at)} by ${who(p)}${isHouse(p) ? ', the house photo' : ''}`}>
                    <img src={p.thumbUrl || p.url} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-white/5 object-cover" />
                    {isHouse(p) && <span className="absolute left-1.5 top-1.5 rounded-full bg-night-950/80 px-2 py-0.5 text-xs font-medium">🏠 House</span>}
                    <span className="mt-1 block truncate text-xs text-slate-400">{photoDate(p.at)} · {who(p)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      {count > 0 && <p className="text-xs text-slate-400">Tap a photo to see it full size, make it the house photo or remove it.</p>}
      {note && <p role="status" className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">{note}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-night-950/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Photo">
          {/* Kept to the photo's width, with the actions right under it: on a wide screen they sat in the far corners. */}
          <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-slate-300">{photoDate(open.at)} · {who(open)} · {open.season} season</p>
              <button type="button" onClick={() => setOpen(null)} className={btn} aria-label="Close">✕</button>
            </div>
            <button type="button" onClick={() => setOpen(null)} className="min-h-0 flex-1 cursor-zoom-out" aria-label="Close the photo">
              <img src={open.url} alt={`Install photo from ${photoDate(open.at)}`} className="mx-auto max-h-full max-w-full rounded-xl object-contain" />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {isHouse(open)
                ? <span className="px-2 text-sm font-semibold text-glow-300">🏠 The house photo</span>
                : <button type="button" onClick={() => makeHouse(open)} disabled={!user} className={btn}>🏠 Use as house photo</button>}
              {canDeletePhoto(open, user?.email, isOwner)
                ? <button type="button" onClick={() => remove(open)} className={`${btn} text-berry-500`}>🗑 Remove photo</button>
                : <span className="text-xs text-slate-500">Only {who(open)} or the owner can remove it</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
