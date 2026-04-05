import type { LatLng } from '../geo'

export type DirectionsStep = {
  instruction: string
  distanceMeters: number
  durationSeconds: number
}

export type DirectionsRoute = {
  distanceMeters: number
  durationSeconds: number
  geometry: LatLng[]
  steps: DirectionsStep[]
}

type NominatimResult = {
  lat: string
  lon: string
  display_name?: string
}

export async function geocodeOrigin(
  query: string,
  opts?: { signal?: AbortSignal },
): Promise<LatLng> {
  const q = query.trim()
  if (!q) throw new Error('Enter a starting location.')

  // NOTE(geocoding): For the take-home we use Nominatim (OpenStreetMap) to
  // resolve a user-entered origin into coordinates. This is best-effort and
  // may be rate-limited; users can always fall back to browser geolocation.
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), { method: 'GET', signal: opts?.signal })
  if (!res.ok) throw new Error('Unable to geocode the origin location.')

  const json = (await res.json()) as NominatimResult[]
  const first = json[0]
  if (!first) throw new Error('No matches found for the origin location.')

  const lat = Number(first.lat)
  const lng = Number(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid geocoding result.')
  }

  return { lat, lng }
}

type OsrmStep = {
  name: string
  distance: number
  duration: number
  maneuver: { type: string; modifier?: string }
}

type OsrmRoute = {
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] } // [lng,lat]
  legs: Array<{ steps: OsrmStep[] }>
}

type OsrmResponse = {
  code: string
  message?: string
  routes?: OsrmRoute[]
}

function buildInstruction(step: OsrmStep) {
  const name = step.name?.trim()
  const type = step.maneuver?.type
  const modifier = step.maneuver?.modifier

  if (type === 'depart') return name ? `Depart toward ${name}` : 'Depart'
  if (type === 'arrive') return 'Arrive at destination'
  if (type === 'roundabout') return name ? `Enter roundabout toward ${name}` : 'Enter roundabout'
  if (type === 'merge') return name ? `Merge onto ${name}` : 'Merge'
  if (type === 'end of road') return name ? `Continue onto ${name}` : 'Continue'
  if (type === 'new name') return name ? `Continue onto ${name}` : 'Continue'

  if (modifier && name) return `Turn ${modifier} onto ${name}`
  if (modifier) return `Turn ${modifier}`
  if (name) return `Continue onto ${name}`
  return 'Continue'
}

export async function fetchDirectionsRoute(
  origin: LatLng,
  destination: LatLng,
  opts?: { signal?: AbortSignal },
): Promise<DirectionsRoute> {
  // NOTE(routing): OSRM public endpoint (no API key) for take-home use.
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
  )
  url.searchParams.set('overview', 'full')
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('steps', 'true')

  const res = await fetch(url.toString(), { method: 'GET', signal: opts?.signal })
  if (!res.ok) throw new Error('Unable to fetch directions.')

  const json = (await res.json()) as OsrmResponse
  if (json.code !== 'Ok' || !json.routes?.length) {
    throw new Error(json.message || 'Directions request failed.')
  }

  const route = json.routes[0]
  const geometry: LatLng[] = route.geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }))

  const steps: DirectionsStep[] =
    route.legs?.[0]?.steps?.map((s) => ({
      instruction: buildInstruction(s),
      distanceMeters: s.distance,
      durationSeconds: s.duration,
    })) ?? []

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry,
    steps,
  }
}

export function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h} hr ${m} min`
}
