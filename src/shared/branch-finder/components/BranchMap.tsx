import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { BranchWithComputed } from '../types'
import type { LatLng } from '../../../shared/geo'
import type { DirectionsRoute } from '../routing'
import { configureLeafletDefaultIcon } from '../leaflet'
import { getBranchMarkerIcon } from '../markerIcons'
import { parseCoordinates } from '../utils'

type Props = {
  branches: BranchWithComputed[]
  selectedBranchId: string | null
  onSelectBranchId: (id: string) => void
  userLocation: LatLng | null
  route: DirectionsRoute | null
}

function MapEffects(props: {
  selected: BranchWithComputed | null
  userLocation: LatLng | null
  route: DirectionsRoute | null
}) {
  const { selected, userLocation, route } = props
  const map = useMap()

  useEffect(() => {
    if (route?.geometry?.length) {
      const bounds = L.latLngBounds(route.geometry.map((p) => [p.lat, p.lng]))
      map.fitBounds(bounds.pad(0.15))
      return
    }

    if (selected?.coords) {
      map.flyTo(selected.coords, Math.max(map.getZoom(), 11), { duration: 0.6 })
      return
    }

    if (userLocation) {
      map.flyTo(userLocation, Math.max(map.getZoom(), 4), { duration: 0.6 })
    }
  }, [map, route, selected, userLocation])

  return null
}

function MapZoomWatcher(props: { onZoomChange: (zoom: number) => void }) {
  const { onZoomChange } = props
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  })

  useEffect(() => {
    onZoomChange(map.getZoom())
  }, [map, onZoomChange])

  return null
}

export function BranchMap(props: Props) {
  const { branches, selectedBranchId, onSelectBranchId, userLocation, route } =
    props

  useEffect(() => {
    configureLeafletDefaultIcon(L)
  }, [])

  const [zoom, setZoom] = useState<number>(2)
  const showLabels = zoom >= 12

  const branchesWithCoords = useMemo(() => {
    return branches
      .map((b) => ({ ...b, coords: b.coords ?? parseCoordinates(b.Coordinates) }))
      .filter((b) => Boolean(b.coords))
  }, [branches])

  const selected =
    selectedBranchId == null
      ? null
      : branchesWithCoords.find((b) => b._id === selectedBranchId) ?? null

  const initialCenter: LatLng = userLocation
    ? userLocation
    : selected?.coords ?? branchesWithCoords[0]?.coords ?? { lat: 20, lng: 0 }

  const initialZoom = userLocation ? 4 : selected ? 11 : 2

  return (
    <div className="finderMap" aria-label="Branch map">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        className="finderMap__leaflet"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEffects selected={selected} userLocation={userLocation} route={route} />
        <MapZoomWatcher onZoomChange={setZoom} />

        {userLocation && (
          <CircleMarker
            center={userLocation}
            radius={8}
            pathOptions={{
              color: '#0d4d56',
              fillColor: '#0d4d56',
              fillOpacity: 0.35,
              weight: 2,
            }}
          >
            <Popup>You are here</Popup>
          </CircleMarker>
        )}

        {route?.geometry?.length ? (
          <Polyline
            positions={route.geometry}
            pathOptions={{ color: '#0d4d56', weight: 5, opacity: 0.9 }}
          />
        ) : null}

        {branchesWithCoords.map((b) => (
          <Marker
            key={b._id}
            position={b.coords!}
            icon={getBranchMarkerIcon(b._id === selectedBranchId)}
            eventHandlers={{ click: () => onSelectBranchId(b._id) }}
          >
            <Popup>
              <div className="mapPopup">
                <div className="mapPopup__title">{b.Name}</div>
              </div>
            </Popup>
            <Tooltip
              className="branchLabel"
              direction="top"
              opacity={1}
              permanent={showLabels || b._id === selectedBranchId}
              sticky={!showLabels && b._id !== selectedBranchId}
            >
              {b.Name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
