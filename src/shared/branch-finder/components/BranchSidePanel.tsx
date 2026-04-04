import { useEffect, useMemo, useState } from 'react'
import type { Branch } from '../types'
import type { LatLng } from '../../../shared/geo'
import {
  computeDistanceKm,
  formatDistance,
  formatInlineAddress,
  parseCoordinates,
} from '../utils'
import type { GeolocationState } from '../hooks/useGeolocation'
import {
  fetchDirectionsRoute,
  formatDuration,
  geocodeOrigin,
  type DirectionsRoute,
} from '../routing'

type PanelMode = 'details' | 'directions'

type Props = {
  branch: Branch | null
  mode: PanelMode
  onModeChange: (mode: PanelMode) => void
  userLocation: LatLng | null
  geolocation: GeolocationState
  originText: string
  onOriginTextChange: (next: string) => void
  route: DirectionsRoute | null
  onRouteChange: (route: DirectionsRoute | null) => void
  onClose: () => void
}

type DirectionsStatus = 'idle' | 'loading' | 'success' | 'error'

export function BranchSidePanel(props: Props) {
  const {
    branch,
    mode,
    onModeChange,
    userLocation,
    geolocation,
    originText,
    onOriginTextChange,
    route,
    onRouteChange,
    onClose,
  } = props

  const isOpen = Boolean(branch)
  const coords = branch ? parseCoordinates(branch.Coordinates) : null

  const distanceKm = useMemo(() => {
    if (!branch || !userLocation || !coords) return null
    return computeDistanceKm(userLocation, coords)
  }, [branch, coords, userLocation])

  const [directionsStatus, setDirectionsStatus] =
    useState<DirectionsStatus>('idle')
  const [directionsError, setDirectionsError] = useState<string | null>(null)
  const [directionsRequestId, setDirectionsRequestId] = useState(0)

  // NOTE(directions): Auto-fetch once we have browser geolocation (reliable)
  // and the user is viewing the directions tab.
  useEffect(() => {
    if (!isOpen || mode !== 'directions') return
    if (!coords) return
    if (!userLocation) return
    setDirectionsRequestId((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?._id, coords?.lat, coords?.lng, isOpen, mode, userLocation?.lat, userLocation?.lng])

  useEffect(() => {
    if (!isOpen || mode !== 'directions') {
      setDirectionsStatus('idle')
      setDirectionsError(null)
      onRouteChange(null)
      return
    }

    if (!branch) return

    if (!coords) {
      setDirectionsStatus('error')
      setDirectionsError('No coordinates available for this branch.')
      onRouteChange(null)
      return
    }

    const destination = coords

    if (directionsRequestId === 0) {
      setDirectionsStatus('idle')
      setDirectionsError(null)
      onRouteChange(null)
      return
    }

    if (!userLocation && !originText.trim()) {
      setDirectionsStatus('error')
      setDirectionsError('Enter a starting address or use your location.')
      onRouteChange(null)
      return
    }

    let cancelled = false

    async function run() {
      setDirectionsStatus('loading')
      setDirectionsError(null)

      const origin = userLocation
        ? userLocation
        : await geocodeOrigin(originText)

      if (cancelled) return

      const nextRoute = await fetchDirectionsRoute(origin, destination)
      if (cancelled) return

      onRouteChange(nextRoute)
      setDirectionsStatus('success')
    }

    run().catch((err) => {
      if (cancelled) return
      const message = err instanceof Error ? err.message : 'Unable to get directions.'
      setDirectionsStatus('error')
      setDirectionsError(message)
      onRouteChange(null)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    branch?._id,
    coords?.lat,
    coords?.lng,
    directionsRequestId,
    isOpen,
    mode,
    originText,
    userLocation,
  ])

  return (
    <>
      <button
        type="button"
        className={isOpen ? 'sidePanelScrim sidePanelScrim--open' : 'sidePanelScrim'}
        aria-label="Close details panel"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        className={isOpen ? 'sidePanel sidePanel--open' : 'sidePanel'}
        aria-label="Branch details"
      >
        <div className="sidePanel__content">
          <div className="sidePanel__header">
            <div>
              <div className="sidePanel__kicker">Brightstream Branch</div>
              <h3 className="sidePanel__title">{branch?.Name ?? 'Branch'}</h3>
              {branch && (
                <p className="sidePanel__subtitle">{formatInlineAddress(branch)}</p>
              )}
              {distanceKm != null && (
                <p className="sidePanel__distance">{formatDistance(distanceKm)}</p>
              )}
            </div>
            <button
              type="button"
              className="sidePanel__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="sidePanel__tabs" role="tablist" aria-label="Panel tabs">
            <button
              type="button"
              className={
                mode === 'details'
                  ? 'bs-segment bs-segment--active'
                  : 'bs-segment'
              }
              onClick={() => onModeChange('details')}
              role="tab"
              aria-selected={mode === 'details'}
            >
              Details
            </button>
            <button
              type="button"
              className={
                mode === 'directions'
                  ? 'bs-segment bs-segment--active'
                  : 'bs-segment'
              }
              onClick={() => onModeChange('directions')}
              role="tab"
              aria-selected={mode === 'directions'}
            >
              Directions
            </button>
          </div>

          {mode === 'details' && branch && (
            <div className="sidePanel__body">
              <div className="sidePanel__block">
                <div className="sidePanel__label">Address</div>
                <div className="sidePanel__value">{formatInlineAddress(branch)}</div>
              </div>
              <div className="sidePanel__block">
                <div className="sidePanel__label">Phone</div>
                <div className="sidePanel__value">{branch.Phone ?? '—'}</div>
              </div>
              <div className="sidePanel__block">
                <div className="sidePanel__label">Email</div>
                <div className="sidePanel__value">
                  <a className="bs-link" href={`mailto:${branch.Email}`}>
                    {branch.Email}
                  </a>
                </div>
              </div>
            </div>
          )}

          {mode === 'directions' && branch && (
            <div className="sidePanel__body">
              <div className="sidePanel__directionsForm">
                <div className="bs-field">
                  <label className="bs-label" htmlFor="origin">
                    From
                  </label>
                  {userLocation ? (
                    <div className="sidePanel__originPill">Your location</div>
                  ) : (
                    <input
                      id="origin"
                      className="bs-input"
                      placeholder="Enter a starting address"
                      value={originText}
                      onChange={(e) => onOriginTextChange(e.target.value)}
                    />
                  )}
                  {!userLocation && (
                    <p className="bs-help">
                      Tip: use “Use my location” for the most reliable routing.
                    </p>
                  )}
                </div>

                <div className="sidePanel__directionsActions">
                  <button
                    type="button"
                    className="bs-btn bs-btn--primary"
                    onClick={() => geolocation.request()}
                    disabled={geolocation.status === 'loading'}
                  >
                    {geolocation.status === 'loading'
                      ? 'Locating…'
                      : userLocation
                        ? 'Update my location'
                        : 'Use my location'}
                  </button>

                  <button
                    type="button"
                    className="bs-btn bs-btn--secondary"
                    onClick={() => setDirectionsRequestId((n) => n + 1)}
                    disabled={
                      directionsStatus === 'loading' ||
                      (!userLocation && !originText.trim())
                    }
                  >
                    Get directions
                  </button>
                </div>
              </div>

              {directionsStatus === 'loading' && (
                <div className="bs-loading" role="status" aria-live="polite">
                  <div className="bs-loading__spinner" aria-hidden="true" />
                  <div className="bs-loading__label">Getting directions…</div>
                </div>
              )}

              {directionsStatus === 'error' && directionsError && (
                <p className="bs-help bs-help--error" role="status">
                  {directionsError}
                </p>
              )}

              {route && (
                <div className="sidePanel__directions" aria-label="Directions steps">
                  <div className="sidePanel__routeSummary">
                    {formatDistance(route.distanceMeters / 1000)} ·{' '}
                    {formatDuration(route.durationSeconds)}
                  </div>
                  <ol className="sidePanel__steps">
                    {route.steps.map((s, idx) => (
                      <li key={idx} className="sidePanel__step">
                        <div className="sidePanel__stepText">{s.instruction}</div>
                        <div className="sidePanel__stepMeta">
                          {formatDistance(s.distanceMeters / 1000)} ·{' '}
                          {formatDuration(s.durationSeconds)}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
