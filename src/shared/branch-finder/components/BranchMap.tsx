import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  computeDistanceKm,
  formatInlineAddress,
  parseCoordinates,
} from '../utils'

type Props = {
  branches: BranchWithComputed[]
  selectedBranchId: string | null
  onSelectBranchId: (id: string) => void
  userLocation: LatLng | null
  route: DirectionsRoute | null
  resultsFocusKey?: string | null
}

function MapEffects(props: {
  selected: BranchWithComputed | null
  userLocation: LatLng | null
  route: DirectionsRoute | null
  resultsFocusKey?: string | null
  resultsCoords: LatLng[]
  nearbyCoords: LatLng[]
}) {
  const { selected, userLocation, route, resultsFocusKey, resultsCoords, nearbyCoords } =
    props
  const map = useMap()
  const lastResultsFocusKey = useRef<string | null>(null)
  const lastUserLocationKey = useRef<string | null>(null)

  useEffect(() => {
    // NOTE(leaflet): Map container height can be driven by surrounding layout.
    // Ensure the map recalculates tiles after layout-driven height changes.
    const t = window.setTimeout(() => map.invalidateSize(), 0)
    return () => window.clearTimeout(t)
  }, [map, route, selected?.coords?.lat, selected?.coords?.lng])

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

    // NOTE(ux): When the user applies a country/city filter, focus the filtered
    // set of branches rather than snapping back to the user's location.
    if (resultsFocusKey) {
      if (resultsFocusKey !== lastResultsFocusKey.current) {
        lastResultsFocusKey.current = resultsFocusKey

        if (resultsCoords.length === 1) {
          map.flyTo(resultsCoords[0], Math.max(map.getZoom(), 6), {
            duration: 0.6,
          })
          return
        }

        if (resultsCoords.length > 1) {
          const bounds = L.latLngBounds(resultsCoords.map((p) => [p.lat, p.lng]))
          map.fitBounds(bounds.pad(0.18))
          return
        }
      }

      // NOTE(ux): While a country/city filter is active, don't auto-focus to
      // the user's location; keep the map stable.
      return
    } else if (lastResultsFocusKey.current !== null) {
      lastResultsFocusKey.current = null
    }

    if (userLocation) {
      const nextKey = `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`
      if (nextKey === lastUserLocationKey.current) return
      lastUserLocationKey.current = nextKey

      // NOTE(ux): When geolocation becomes available, show the "nearest" area
      // (user + closest few branches) rather than zooming out to a generic view.
      const focusPoints = [userLocation, ...nearbyCoords.slice(0, 8)]
      if (focusPoints.length >= 2) {
        const bounds = L.latLngBounds(focusPoints.map((p) => [p.lat, p.lng]))
        map.fitBounds(bounds.pad(0.18))
        return
      }

      map.flyTo(userLocation, Math.max(map.getZoom(), 11), { duration: 0.6 })
      return
    } else if (lastUserLocationKey.current !== null) {
      lastUserLocationKey.current = null
    }
  }, [map, nearbyCoords, resultsCoords, resultsFocusKey, route, selected, userLocation])

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
  const {
    branches,
    selectedBranchId,
    onSelectBranchId,
    userLocation,
    route,
    resultsFocusKey,
  } = props

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

  const resultsCoords: LatLng[] = useMemo(
    () => branchesWithCoords.map((b) => b.coords!) as LatLng[],
    [branchesWithCoords],
  )

  const nearbyCoords: LatLng[] = useMemo(() => {
    if (!userLocation) return []
    return branchesWithCoords
      .map((b) => ({
        coords: b.coords!,
        distanceKm: computeDistanceKm(userLocation, b.coords!),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8)
      .map((x) => x.coords)
  }, [branchesWithCoords, userLocation])

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

        <MapEffects
          selected={selected}
          userLocation={userLocation}
          route={route}
          resultsFocusKey={resultsFocusKey}
          resultsCoords={resultsCoords}
          nearbyCoords={nearbyCoords}
        />
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
                <div className="mapPopup__body">{formatInlineAddress(b)}</div>
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
