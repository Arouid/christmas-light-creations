// Real driving times between stops from Google's Routes API (Compute Route
// Matrix), using the site's Maps key (Routes API must be enabled on it).
// Up to 625 origin x destination pairs per request, so 31 points (home + 30
// stops) take two requests. Throws if Google refuses; callers fall back to
// estimateMatrix() in lib/router.js.
import { MAPS_KEY } from './streetView.js'

const URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix'
const wp = (p) => ({ waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } })

export async function drivingMatrix(points) {
  const n = points.length
  const minutes = points.map(() => Array(n).fill(0))
  const miles = points.map(() => Array(n).fill(0))
  const perRequest = Math.max(1, Math.floor(625 / n))
  for (let start = 0; start < n; start += perRequest) {
    const origins = points.slice(start, start + perRequest)
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': MAPS_KEY,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition',
      },
      body: JSON.stringify({ origins: origins.map(wp), destinations: points.map(wp), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE' }),
    })
    if (!res.ok) throw new Error(`Routes API ${res.status}: ${(await res.text()).slice(0, 200)}`)
    for (const e of await res.json()) {
      const i = start + (e.originIndex ?? 0)
      const j = e.destinationIndex ?? 0
      if (e.condition && e.condition !== 'ROUTE_EXISTS') { minutes[i][j] = 999; continue }
      minutes[i][j] = parseFloat(String(e.duration ?? '0s')) / 60
      miles[i][j] = (e.distanceMeters ?? 0) / 1609.344
    }
  }
  return { minutes, miles, estimated: false }
}
