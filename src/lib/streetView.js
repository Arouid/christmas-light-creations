// Google Maps API key for Street View photos and address checks. Public by
// design: locked in Google Cloud to this site's domains and to the Maps
// JavaScript, Geocoding and Street View Static APIs.
export const MAPS_KEY = 'AIzaSyA0JukeFR0g2kSfyR0JrJB8yjO88LjWQjc'

export const streetViewReady = Boolean(MAPS_KEY)

const BASE = 'https://maps.googleapis.com/maps/api/streetview'

// Geocoding from the browser has to go through the Maps JavaScript API: the
// plain web-service endpoint refuses keys locked to websites.
let mapsLoad
export function loadMaps() {
  mapsLoad ??= new Promise((resolve, reject) => {
    const callback = '__clcMapsReady'
    window[callback] = () => resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: MAPS_KEY, v: 'weekly', loading: 'async', callback })}`
    script.async = true
    script.onerror = () => {
      mapsLoad = undefined
      reject(new Error('Google Maps failed to load'))
    }
    document.head.append(script)
  })
  return mapsLoad
}

// Only trust a result that is a specific street address. Typos and made-up
// addresses come back as partial matches or as a street/city, not a house.
const HOUSE_TYPES = ['street_address', 'premise', 'subpremise']

// Map position of an address. exact = Google matched a specific house,
// not just the street or town (typos and made-up addresses aren't exact).
export async function locateAddress(address) {
  const maps = await loadMaps()
  const { Geocoder } = await maps.importLibrary('geocoding')
  let results
  try {
    ;({ results } = await new Geocoder().geocode({ address, componentRestrictions: { country: 'US' } }))
  } catch (e) {
    if (e?.code === 'ZERO_RESULTS') return null
    throw e
  }
  const r = results[0]
  if (!r) return null
  return {
    lat: r.geometry.location.lat(),
    lng: r.geometry.location.lng(),
    exact: !r.partial_match && r.types.some((t) => HOUSE_TYPES.includes(t)),
  }
}

async function locateHouse(address) {
  const found = await locateAddress(address)
  return found?.exact ? found : null
}

// Compass direction from the camera to the house, so the photo faces it.
function bearing(from, to) {
  const rad = Math.PI / 180
  const dLng = (to.lng - from.lng) * rad
  const y = Math.sin(dLng) * Math.cos(to.lat * rad)
  const x = Math.cos(from.lat * rad) * Math.sin(to.lat * rad)
    - Math.sin(from.lat * rad) * Math.cos(to.lat * rad) * Math.cos(dLng)
  return ((Math.atan2(y, x) / rad + 360) % 360).toFixed(0)
}

// Google Maps Street View at the nearest street photo (within 100 m), facing
// the house; null if there's none. Opening Street View at the house's own map
// position often shows black: the house sits off the street, where Google has
// no 360° photo. The metadata call is free.
export async function streetViewLink(house) {
  const meta = await fetch(`${BASE}/metadata?${new URLSearchParams({
    location: `${house.lat},${house.lng}`, source: 'outdoor', radius: '100', key: MAPS_KEY,
  })}`).then((r) => r.json())
  if (meta.status !== 'OK') return null
  return `https://www.google.com/maps/@?${new URLSearchParams({ api: '1', map_action: 'pano', pano: meta.pano_id, heading: bearing(meta.location, house) })}`
}

// Returns { kind: 'photo', image, link } | { kind: 'no-address' } | { kind: 'no-imagery' }
export async function findStreetView(address) {
  const house = await locateHouse(address)
  if (!house) return { kind: 'no-address' }

  // The metadata call is free; only load the billed photo when imagery exists.
  const meta = await fetch(`${BASE}/metadata?${new URLSearchParams({
    location: `${house.lat},${house.lng}`, source: 'outdoor', key: MAPS_KEY,
  })}`).then((r) => r.json())
  if (meta.status !== 'OK') return { kind: 'no-imagery' }

  const heading = bearing(meta.location, house)
  return {
    kind: 'photo',
    image: `${BASE}?${new URLSearchParams({ size: '640x320', pano: meta.pano_id, heading, fov: '80', key: MAPS_KEY })}`,
    link: `https://www.google.com/maps/@?${new URLSearchParams({ api: '1', map_action: 'pano', pano: meta.pano_id, heading })}`,
  }
}
