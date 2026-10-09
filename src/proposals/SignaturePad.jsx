import { useEffect, useRef, useState } from 'react'

// Finger/mouse signature. onChange(pngDataUrl | null) after each stroke.
export default function SignaturePad({ onChange, height = 160 }) {
  const ref = useRef(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = ref.current
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = height * ratio
    const ctx = c.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1220'
  }, [height])

  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  function down(e) {
    try { ref.current.setPointerCapture(e.pointerId) } catch { /* not all pointers can be captured; drawing still works */ }
    drawing.current = true
    const ctx = ref.current.getContext('2d')
    const [x, y] = pos(e)
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke()
  }
  function move(e) {
    if (!drawing.current) return
    const ctx = ref.current.getContext('2d')
    const [x, y] = pos(e)
    ctx.lineTo(x, y); ctx.stroke()
  }
  function up() {
    if (!drawing.current) return
    drawing.current = false
    setEmpty(false)
    onChange?.(ref.current.toDataURL('image/png'))
  }
  function clear() {
    const c = ref.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange?.(null)
  }

  return (
    <div>
      <div className="relative rounded-xl bg-white">
        <canvas ref={ref} style={{ height }} className="block w-full touch-none rounded-xl"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Sign here with your finger or mouse" />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-slate-400">Sign here</span>}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-slate-300" />
      </div>
      <button type="button" onClick={clear} className="mt-1 text-sm text-slate-400 underline">Clear signature</button>
    </div>
  )
}
