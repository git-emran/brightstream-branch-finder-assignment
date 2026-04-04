import type { Branch } from './types'
import type { LatLng } from '../geo'

export function normalizeSearchText(input: string) {
  return input.trim().toLowerCase()
}

export function parseCoordinates(coords: string): LatLng | null {
  // NOTE(branch-finder): Dataset uses a single string field like "35.2, -80.7".
  const [latRaw, lngRaw] = coords.split(',').map((p) => p.trim())
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function computeDistanceKm(a: LatLng, b: LatLng) {
  // NOTE(branch-finder): Haversine formula. Good enough for "nearest branch".
  const R = 6371
  const dLat = degToRad(b.lat - a.lat)
  const dLng = degToRad(b.lng - a.lng)
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const q =
    s1 * s1 + Math.cos(degToRad(a.lat)) * Math.cos(degToRad(b.lat)) * s2 * s2
  return 2 * R * Math.asin(Math.sqrt(q))
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function formatDistance(km: number) {
  const miles = km * 0.621371
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

export function formatInlineAddress(b: Pick<
  Branch,
  'Street' | 'City' | 'ZipCode' | 'Country'
>) {
  return `${b.Street}, ${b.City} ${b.ZipCode}, ${b.Country}`
}
