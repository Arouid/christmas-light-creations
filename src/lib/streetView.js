// Google Maps API key for the Street View Static API. Public by design:
// lock it in Google Cloud to this site's domains and to Street View only.
export const MAPS_KEY = 'AIzaSyA0JukeFR0g2kSfyR0JrJB8yjO88LjWQjc'

export const streetViewReady = Boolean(MAPS_KEY)

const BASE = 'https://maps.googleapis.com/maps/api/streetview'

// The metadata call is free; it tells us whether imagery exists (and where)
// before we load a billed photo.
export async function findStreetView(address) {
  const params = new URLSearchParams({ location: address, source: 'outdoor', key: MAPS_KEY })
  const res = await fetch(`${BASE}/metadata?${params}`)
  const data = await res.json()
  if (data.status !== 'OK') return null
  const { lat, lng } = data.location
  return {
    image: `${BASE}?${new URLSearchParams({ size: '640x320', location: address, source: 'outdoor', fov: '80', key: MAPS_KEY })}`,
    link: `https://www.google.com/maps/@?${new URLSearchParams({ api: '1', map_action: 'pano', viewpoint: `${lat},${lng}` })}`,
  }
}
