// Dev-only harness for the light designer (not built or deployed).
//   /dev/designer.html                 editor on the test photo with a sample design
//   /dev/designer.html?peek=1          final render only (for tuning the look)
//   &crop=x,y,w,h                      zoom into part of the photo (photo pixels)
//   &photo=/photos-incoming/<file>     another photo; &blank=1 starts empty
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import { Designer, loadImage, newDesign, photoToDataUrl, renderDesign } from '../src/designer'

const q = new URLSearchParams(location.search)
const k = 1600 / 900 // sample points were picked on a 900px-wide preview

function sample(photo) {
  const d = newDesign(photo)
  const pts = (list) => list.map(([x, y]) => [x * k, y * k])
  d.strands = [
    { id: 'eave', style: 'c9', colors: ['warm'], groupSize: 1, spacingIn: 12, size: 1, points: pts([[100, 128], [300, 126], [520, 128], [700, 132], [822, 138]]) },
    { id: 'garage', style: 'c9', colors: ['red', 'green', 'blue', 'gold', 'orange'], groupSize: 1, spacingIn: 12, size: 1, points: pts([[0, 312], [50, 288], [100, 300]]) },
    { id: 'ice', style: 'icicle', colors: ['cool'], groupSize: 1, spacingIn: 3, size: 1, points: pts([[826, 330], [900, 320]]) },
  ]
  d.decorations = [{ id: 'w1', type: 'wreath', x: 391 * k, y: 336 * k, size: 0.6, rotation: 0 }]
  return d
}

function Peek({ photo, design }) {
  const ref = useRef(null)
  useEffect(() => {
    loadImage(photo.src).then((img) => {
      const o = document.createElement('canvas')
      o.width = photo.width
      o.height = photo.height
      renderDesign(o.getContext('2d'), design, img)
      const [x, y, w, h] = (q.get('crop') ?? `0,0,${photo.width},${photo.height}`).split(',').map(Number)
      const c = ref.current
      c.width = w
      c.height = h
      c.getContext('2d').drawImage(o, x, y, w, h, 0, 0, w, h)
    })
  }, [photo, design])
  return <canvas ref={ref} className="block w-full" />
}

function Harness() {
  const [photo, setPhoto] = useState(null)
  useEffect(() => {
    const src = q.get('photo') ?? '/photos-incoming/20151118_173345.jpg'
    fetch(src).then((r) => r.blob()).then((b) => photoToDataUrl(b)).then((p) => setPhoto({ src: p.dataUrl, width: p.width, height: p.height }))
  }, [])
  if (!photo) return <p className="p-6">Loading…</p>
  const design = q.has('blank') ? null : sample(photo)
  if (q.has('peek')) return <Peek photo={photo} design={design ?? newDesign(photo)} />
  return <Designer photo={photo} design={design} title="Test house" brand="Christmas Light Creations" onSave={async (d) => { window.__saved = d }} onClose={() => {}} />
}
createRoot(document.getElementById('root')).render(<StrictMode><Harness /></StrictMode>)
