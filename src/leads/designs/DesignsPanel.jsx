import { lazy, Suspense, useRef, useState } from 'react'
import { photoToDataUrl } from '../../designer/image.js'
import { business } from '../../data/content'
import { useStaff } from '../staffContext'
import SatelliteMeasure from './SatelliteMeasure'
import { blobToDataUrl, loadDesignPhoto, loadDesignRender, removeDesign, saveDesign, useDesigns } from './useDesigns'

// The editor is big (canvas code): load it only when someone opens a design.
const Designer = lazy(() => import('../../designer/Designer.jsx'))

const shape = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold'
const when = (d) => (d.savedAt ? new Date(d.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

// Light designs for one customer or lead: list, new from a photo, open, save.
// owner: { type: 'customer' | 'lead', id, name, address }
export default function DesignsPanel({ owner }) {
  const { user, settings } = useStaff()
  const { designs, error } = useDesigns(user, owner.id)
  const [open, setOpen] = useState(null) // { id?, photo, design? }
  const [busy, setBusy] = useState(null)
  const [sat, setSat] = useState(null) // pending satellite measurement { resolve }
  const file = useRef(null)

  async function pickPhoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy('Preparing photo…')
    try {
      const p = await photoToDataUrl(f)
      setOpen({ photo: { src: p.dataUrl, width: p.width, height: p.height } })
    } catch {
      setBusy('That file didn’t open as a photo.')
      return
    }
    setBusy(null)
  }

  async function openDesign(d) {
    setBusy('Opening…')
    const src = await loadDesignPhoto(d.id)
    setBusy(null)
    if (!src) return setBusy('This design’s photo is missing.')
    const design = JSON.parse(d.designJson)
    setOpen({ id: d.id, photo: { src, width: design.photo.width, height: design.photo.height }, design })
  }

  async function save(design, { blob, stats }) {
    const [renderDataUrl, thumb] = await Promise.all([blobToDataUrl(blob, 1600, 0.85), blobToDataUrl(blob, 360, 0.75)])
    const id = await saveDesign(user, {
      id: open.id, owner, design, stats, thumb, renderDataUrl,
      photoDataUrl: open.id ? null : open.photo.src, // the photo never changes once saved
    })
    setOpen((o) => ({ ...o, id }))
  }

  async function download(d) {
    const url = await loadDesignRender(d.id)
    if (!url) return
    Object.assign(document.createElement('a'), { href: url, download: `${(d.name || 'design').replace(/[^\w-]+/g, '-')}.jpg` }).click()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => file.current.click()} className={`${shape} bg-glow-400 text-night-950 hover:bg-glow-300`}>🎨 New design from a photo</button>
        <input ref={file} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
        {busy && <span className="text-sm text-glow-300" role="status">{busy}</span>}
      </div>
      {error && error !== 'not-staff' && <p className="text-sm text-berry-500">Couldn’t load designs: {error}</p>}
      {error === 'not-staff' && <p className="text-sm text-glow-300">Designs need the updated database rules (Firebase → Firestore → Rules).</p>}
      {designs?.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {designs.map((d) => (
            <li key={d.id} className="overflow-hidden rounded-xl border border-white/10 bg-night-950">
              <button type="button" onClick={() => openDesign(d)} className="block w-full text-left">
                {d.thumb && <img src={d.thumb} alt={`Light design: ${d.name}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
                <span className="block px-2 pt-1.5 text-sm font-medium">{d.name}</span>
                <span className="block px-2 pb-1.5 text-xs text-slate-400">
                  {d.measured ? '' : '≈ '}{d.feet} ft{d.price != null ? ` · $${d.price.toLocaleString()}` : ''} · {when(d)}
                </span>
              </button>
              <div className="flex border-t border-white/10 text-xs">
                <button type="button" onClick={() => download(d)} className="flex-1 py-1.5 hover:bg-white/5">⬇ Image</button>
                <button type="button" onClick={() => window.confirm(`Delete the design “${d.name}”?`) && removeDesign(d.id)} className="flex-1 py-1.5 text-slate-400 hover:bg-white/5">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-night-950 text-slate-400">Loading designer…</div>}>
          <Designer photo={open.photo} design={open.design} defaults={{ pricePerFoot: settings.designPricePerFoot ?? null }}
            title={`${owner.name || 'Design'}${owner.address ? ` · ${owner.address}` : ''}`} brand={`${business.name} · ${business.phone}`}
            onSave={save} onClose={() => setOpen(null)}
            onSatelliteMeasure={owner.address ? () => new Promise((resolve) => setSat({ resolve })) : undefined} />
        </Suspense>
      )}
      {sat && <SatelliteMeasure address={owner.address} onDone={(r) => { sat.resolve(r); setSat(null) }} />}
    </div>
  )
}
