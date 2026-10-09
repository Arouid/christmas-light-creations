// Distances and simple route ordering for located customers ({ lat, lng }).

const R_MILES = 3958.8

export function milesBetween(a, b) {
  if (!a || !b) return null
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R_MILES * Math.asin(Math.sqrt(h))
}

export const formatMiles = (m) => (m == null ? '' : m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m)} mi`)

// Greedy "nearest next stop" order from the start point. Straight-line
// distance, so it's a good-enough driving order, not an optimal one.
// stops: [{ id, geo: {lat,lng} }] -> [{ stop, legMiles }], plus total.
export function planRoute(start, stops) {
  const left = stops.filter((s) => s.geo)
  const order = []
  let here = start
  let total = 0
  while (left.length) {
    let best = 0
    let bestMiles = Infinity
    left.forEach((s, i) => {
      const m = here ? milesBetween(here, s.geo) : 0
      if (m < bestMiles) { best = i; bestMiles = m }
    })
    const [stop] = left.splice(best, 1)
    const legMiles = here ? bestMiles : 0
    total += legMiles
    order.push({ stop, legMiles })
    here = stop.geo
  }
  return { order, totalMiles: total }
}

// Google Maps directions links. Maps allows 9 waypoints between origin and
// destination, so long routes are split into consecutive legs of up to 10 stops.
export function directionsLinks(start, ordered, perLink = 10) {
  const pt = (g) => `${g.lat},${g.lng}`
  const links = []
  let from = start
  for (let i = 0; i < ordered.length; i += perLink) {
    const chunk = ordered.slice(i, i + perLink).map((s) => s.geo)
    const dest = chunk.at(-1)
    const params = new URLSearchParams({ api: '1', destination: pt(dest), travelmode: 'driving' })
    if (from) params.set('origin', pt(from))
    if (chunk.length > 1) params.set('waypoints', chunk.slice(0, -1).map(pt).join('|'))
    links.push({ from: i + 1, to: i + chunk.length, url: `https://www.google.com/maps/dir/?${params}` })
    from = dest
  }
  return links
}

// Round trip from home base through every stop and back. Starts from the
// nearest-next-stop order, then untangles crossings (2-opt) since the crew
// drives back home at the end. Straight-line miles: a good driving order for
// a day's stops, not a guaranteed best one.
// stops: [{ id, geo }] -> { order: [stop], totalMiles } (stops without geo left out)
export function planLoop(home, stops) {
  let order = planRoute(home, stops).order.map((o) => o.stop)
  const pts = () => [home, ...order.map((s) => s.geo), home].filter(Boolean)
  const length = (list) => list.slice(1).reduce((sum, p, i) => sum + milesBetween(list[i], p), 0)
  if (home && order.length > 2) {
    let improved = true
    while (improved) {
      improved = false
      for (let i = 0; i < order.length - 1; i++) {
        for (let k = i + 1; k < order.length; k++) {
          const next = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)]
          const before = length(pts())
          const saved = order
          order = next
          if (length(pts()) < before - 1e-9) improved = true
          else order = saved
        }
      }
    }
  }
  return { order, totalMiles: length(pts()) }
}

// Google Maps directions for a loop: home -> stops (by address) -> home.
// Maps takes 9 stops between start and end, so long days become several links.
export function loopLinks(homeAddress, addresses, perLink = 10) {
  const points = [...addresses, homeAddress].filter(Boolean)
  const links = []
  let from = homeAddress
  for (let i = 0; i < points.length; i += perLink) {
    const chunk = points.slice(i, i + perLink)
    const params = new URLSearchParams({ api: '1', destination: chunk.at(-1), travelmode: 'driving' })
    if (from) params.set('origin', from)
    if (chunk.length > 1) params.set('waypoints', chunk.slice(0, -1).join('|'))
    links.push({ from: i + 1, to: Math.min(i + chunk.length, addresses.length), url: `https://www.google.com/maps/dir/?${params}` })
    from = chunk.at(-1)
  }
  return links
}

// Miles for home -> points (in this order) -> home.
export const loopMiles = (home, points) => {
  const pts = [home, ...points, home].filter(Boolean)
  return pts.slice(1).reduce((sum, p, i) => sum + milesBetween(pts[i], p), 0)
}
