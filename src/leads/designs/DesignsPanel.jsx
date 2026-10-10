import { lazy, Suspense, useRef, useState } from 'react'
import { photoToDataUrl } from '../../designer/image.js'
import { business } from '../../data/content'
import { useStaff } from '../staffContext'
import SatelliteMeasure from './SatelliteMeasure'
import { blobToDataUrl, loadDesignPhoto, loadDesignRender, removeDesign, saveDesign, useDesigns } from './useDesigns'
import { getRecord } from '../staffStore'

// The editor is big (canvas code): load it only when someone opens a design.
const Designer = lazy(() => import('../../designer/Designer.jsx'))

const shape = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold'
const when = (d) => (d.savedAt ? new Date(d.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

// The design a homeowner made on /design/ and sent with their request
// (leadDesigns, docs/specs/public-designer.md). Loaded only when asked: it's big.
const SAMPLE_SRC = `${import.meta.env.BASE_URL}images/design/sample-house.jpg`
// Uploads are deleted 30 days after they arrive (functions/leadDesigns.js KEEP_DAYS).
const keptUntil = (t) => {
  const ms = t?.toMillis ? t.toMillis() : Date.parse(t) || Date.now()
  return new Date(ms + 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function WebsiteDesign({ id, onOpen }) {
  const [rec, setRec] = useState(null) // null | 'loading' | 'missing' | record
  const show = async () => {
    setRec('loading')
    try { setRec((await getRecord('leadDesigns', id)) ?? 'missing') } catch { setRec('missing') }
  }
  return (
    <div className="rounded-xl border border-glow-400/30 bg-glow-400/5 p-3">
      <p className="text-sm font-semibold text-glow-300">🌐 They designed their lights on the website</p>
      {!rec && <button type="button" onClick={show} className={`${shape} mt-2 bg-white/10`}>Show their design</button>}
      {rec === 'loading' && <p className="mt-2 text-sm text-slate-400">Loading…</p>}
      {rec === 'missing' && <p className="mt-2 text-sm text-slate-400">Not available any more: website uploads are deleted 30 days after they’re sent (or it didn’t pass our checks). A copy you saved stays under Light designs.</p>}
      {rec?.image && (
        <div className="mt-2 space-y-2">
          <img src={rec.image} alt="Their light design" className="w-full rounded-lg" />
          <p className="text-xs text-slate-400">{rec.photo === 'sample' ? 'On our sample house (they liked this look).' : 'On a photo of their home.'} Kept until {keptUntil(rec.createdAt)}; open it and Save to keep a copy.</p>
          <button type="button" onClick={() => onOpen(rec)} className={`${shape} bg-glow-400 text-night-950`}>🎨 Open in designer</button>
        </div>
      )}
    </div>
  )
}

// Light designs for one customer or lead: list, new from a photo, open, save.
// owner: { type: 'customer' | 'lead', id, name, address }
// websiteDesignId: a lead's design from the website (opened, then saved as one of theirs).
export default function DesignsPanel({ owner, websiteDesignId }) {
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

  // Their website design in the staff designer; Save keeps it as one of this owner's designs.
  function openWebsite(rec) {
    const design = JSON.parse(rec.design)
    const src = rec.photo === 'sample' ? SAMPLE_SRC : rec.photo
    setOpen({ photo: { src, width: design.photo.width, height: design.photo.height }, design: { ...design, name: 'Their website design', pricePerFoot: settings.designPricePerFoot ?? null } })
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
      {websiteDesignId && <WebsiteDesign id={websiteDesignId} onOpen={openWebsite} />}
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
