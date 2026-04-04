import type { LatLng } from '../geo'

export type Branch = {
  _id: string
  _modified: string
  Name: string
  Street: string
  City: string
  Country: string
  CountryCode: string
  ZipCode: string
  Coordinates: string
  Phone: string | null
  Email: string
}

export type BranchWithComputed = Branch & {
  coords: LatLng | null
  distanceKm: number | null
}
