import { useEffect, useState } from 'react'
import { accountHouse } from '../data/content'
import { photoDate } from '../lib/jobRecord'
import { findStreetView, streetViewReady } from '../lib/streetView'

const frame = 'relative overflow-hidden rounded-2xl bg-white/5'
const shape = 'aspect-[3/2] w-full sm:aspect-[2/1]'
const tag = 'absolute bottom-2 left-2 rounded-full bg-night-950/80 px-3 py-1 text-xs font-medium'

// The picture of their house under "Hi, <name>" (docs/specs/account-house-photo.md,
// owner 2026-10-14), the same one staff see on the customer card: our own photo
// when staff picked one (myAccount hands a link that works for an hour), else
// Google Street View of the address, else nothing. The box keeps its shape
// while the picture loads, so the page doesn't jump.
export default function AccountHouse({ house, address, className = '' }) {
  // Every reload of the account brings a fresh link to the same photo: keep
  // the one already showing (no second download) unless it stops working.
  const [shown, setShown] = useState(house)
  const [broken, setBroken] = useState('') // a link that wouldn't load
  if ((house?.id ?? '') !== (shown?.id ?? '')) setShown(house)
  function failed() {
    if (house?.url && house.url !== shown.url) setShown(house)
    else setBroken(shown.url)
  }

  if (shown?.url && shown.url !== broken) {
    const when = photoDate(shown.at)
    return (
      <figure className={`${frame} ${className}`}>
        <img src={shown.url} alt={`${accountHouse.alt}${address ? ` at ${address}` : ''}`} loading="lazy" decoding="async" onError={failed} className={`${shape} object-cover`} />
        <figcaption className={tag}>📷 {accountHouse.ours}{when ? ` · ${when}` : ''}</figcaption>
      </figure>
    )
  }
  return address && streetViewReady ? <StreetView address={address} className={className} /> : null
}

// Street View facing the house (src/lib/streetView.js, the staff card's lookup).
// Nothing at all when Google has no picture there, can't be reached or doesn't
// answer in time (a refused key never answers): the customer gets no "not
// found" notice and no box left waiting.
const STREET_VIEW_WAIT_MS = 10_000
function StreetView({ address, className }) {
  const [view, setView] = useState(undefined) // undefined = looking it up
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    let done = false
    const settle = (v) => { if (!done) { done = true; setView(v) } }
    const timer = setTimeout(() => settle(null), STREET_VIEW_WAIT_MS)
    findStreetView(address).then(settle, () => settle(null))
    return () => { done = true; clearTimeout(timer) }
  }, [address])

  if (view === undefined) return <div className={`${frame} ${shape} animate-pulse ${className}`} aria-hidden="true" />
  if (view?.kind !== 'photo' || broken) return null
  return (
    <figure className={`${frame} ${className}`}>
      <img src={view.image} alt={accountHouse.streetViewAlt} loading="lazy" decoding="async" onError={() => setBroken(true)} className={`${shape} object-cover`} />
      <figcaption className={tag}>{accountHouse.streetView}</figcaption>
    </figure>
  )
}
