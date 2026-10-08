import { useEffect, useState } from 'react'
import { findStreetView, streetViewReady } from '../lib/streetView'

// Photo of the house from Street View; tap to open the interactive view.
// Only mounted when a card is open, so closed cards cost nothing.
export default function StreetViewPhoto({ address }) {
  const [view, setView] = useState(undefined) // undefined = loading, null = none

  useEffect(() => {
    if (!streetViewReady) return
    let cancelled = false
    findStreetView(address)
      .then((v) => { if (!cancelled) setView(v) })
      .catch(() => { if (!cancelled) setView(null) })
    return () => { cancelled = true }
  }, [address])

  if (!streetViewReady) return null
  if (view === undefined) return <div className="aspect-[2/1] animate-pulse rounded-xl bg-white/5" />
  if (view === null) return <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-400">No Street View here</p>

  return (
    <a href={view.link} target="_blank" rel="noreferrer" className="relative block overflow-hidden rounded-xl">
      <img src={view.image} alt={`Street View of ${address}`} className="aspect-[2/1] w-full object-cover" />
      <span className="absolute bottom-2 right-2 rounded-full bg-night-950/80 px-3 py-1 text-xs font-medium">Open Street View ↗</span>
    </a>
  )
}
