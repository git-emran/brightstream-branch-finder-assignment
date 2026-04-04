import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

let configured = false

export function configureLeafletDefaultIcon(L: typeof import('leaflet')) {
  if (configured) return
  configured = true

  // NOTE(leaflet): Leaflet ships marker icons as static assets and expects a
  // bundler-specific URL resolution. Vite doesn't wire these by default.
  // This fixes broken marker icons in dev + production builds.
  L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })
}
