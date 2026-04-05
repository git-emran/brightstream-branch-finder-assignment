import { memo, useEffect, useMemo, useState } from 'react'
import type { Branch } from '../types'
import type { LatLng } from '../../../shared/geo'
import {
  computeDistanceKm,
  formatDistance,
  formatInlineAddress,
  parseCoordinates,
} from '../utils'
import { formatDuration, type DirectionsRoute } from '../routing'
import type { GeolocationState } from '../hooks/useGeolocation'
import { useDirections } from '../hooks/useDirections'

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

export const BranchSidePanel = memo(function BranchSidePanel(props: Props) {
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
  const coords = useMemo(() => {
    // NOTE(coords): Memoize to keep a stable object identity across renders.
    // This prevents effects (like auto-fetching directions) from re-triggering
    // indefinitely due to a "new" LatLng object each render.
    return branch ? parseCoordinates(branch.Coordinates) : null
  }, [branch])

  const distanceKm = useMemo(() => {
    if (!branch || !userLocation || !coords) return null
    return computeDistanceKm(userLocation, coords)
  }, [branch, coords, userLocation])

  const [phoneCopy, setPhoneCopy] = useState<{
    phone: string | null
    status: 'idle' | 'copied' | 'error'
  }>({ phone: null, status: 'idle' })

  const directions = useDirections({
    isOpen,
    mode,
    branchId: branch?._id ?? null,
    destination: coords,
    userLocation,
    originText,
    route,
    onRouteChange,
  })

  useEffect(() => {
    if (phoneCopy.status !== 'copied') return
    const t = window.setTimeout(
      () => setPhoneCopy({ phone: null, status: 'idle' }),
      1600,
    )
    return () => window.clearTimeout(t)
  }, [phoneCopy.status])

  async function copyPhoneNumber(value: string) {
    // NOTE(clipboard): Prefer the async Clipboard API; fall back to a hidden textarea
    // for older browsers / insecure contexts.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        setPhoneCopy({ phone: value, status: 'copied' })
        return
      }

      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      setPhoneCopy({ phone: value, status: ok ? 'copied' : 'error' })
    } catch {
      setPhoneCopy({ phone: value, status: 'error' })
    }
  }

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

          <div className="sidePanelTabs" role="tablist" aria-label="Panel tabs">
            <button
              type="button"
              className={
                mode === 'details'
                  ? 'sidePanelTab sidePanelTab--active'
                  : 'sidePanelTab'
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
                  ? 'sidePanelTab sidePanelTab--active'
                  : 'sidePanelTab'
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
                <div className="sidePanel__label">
                  <span className="sidePanel__labelIcon" aria-hidden="true">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="10"
                        r="2.5"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </span>
                  Address
                </div>
                <div className="sidePanel__value">{formatInlineAddress(branch)}</div>
              </div>
              <div className="sidePanel__block">
                <div className="sidePanel__label">
                  <span className="sidePanel__labelIcon" aria-hidden="true">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.45 2.1L9.1 10.4a16 16 0 0 0 4.5 4.5l1.1-1.1a2 2 0 0 1 2.1-.45c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Phone
                </div>
                <div className="sidePanel__value sidePanel__valueRow">
                  <span>{branch.Phone ?? '—'}</span>
                  {branch.Phone ? (
                    <button
                      type="button"
                      className="copyIconBtn"
                      onClick={() => copyPhoneNumber(branch.Phone!)}
                      aria-label="Copy phone number"
                      title={
                        (phoneCopy.phone === branch.Phone
                          ? phoneCopy.status
                          : 'idle') === 'copied'
                          ? 'Copied'
                          : (phoneCopy.phone === branch.Phone
                                ? phoneCopy.status
                                : 'idle') === 'error'
                            ? 'Unable to copy'
                            : 'Copy phone'
                      }
                    >
                      {(phoneCopy.phone === branch.Phone
                        ? phoneCopy.status
                        : 'idle') === 'copied' ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M9 9h10v10H9V9z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="sidePanel__block">
                <div className="sidePanel__label">
                  <span className="sidePanel__labelIcon" aria-hidden="true">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 6h16v12H4V6z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 7l8 6 8-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Email
                </div>
                <div className="sidePanel__value">
                  <a className="bs-link" href={`mailto:${branch.Email}`}>
                    {branch.Email}
                  </a>
                </div>
              </div>
            </div>
          )}

          {mode === 'directions' && branch && (
            <div className="sidePanel__body sidePanel__body--directions">
              <div className="sidePanel__directionsForm">
                <div className="bs-field">
                  <label className="bs-label" htmlFor="origin">
                    From
                  </label>
                  {userLocation ? (
                    <div className="sidePanel__originPill">Your location</div>
                  ) : (
                    <div className="bs-inputWrap">
                      <input
                        id="origin"
                        className="bs-input bs-input--withIcon"
                        placeholder="Enter a starting address"
                        value={originText}
                        onChange={(e) => onOriginTextChange(e.target.value)}
                        onBlur={() => directions.request()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') directions.request()
                        }}
                      />
                      <button
                        type="button"
                        className={
                          geolocation.status === 'loading'
                            ? 'bs-inputIconBtn bs-inputIconBtn--loading'
                            : 'bs-inputIconBtn'
                        }
                        onClick={() => geolocation.request()}
                        disabled={geolocation.status === 'loading'}
                        aria-label="Locate me"
                        title="Locate me"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 2v3m0 14v3M2 12h3m14 0h3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="5"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="1.5"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {directions.status === 'loading' && (
                <div className="bs-loading" role="status" aria-live="polite">
                  <div className="bs-loading__spinner" aria-hidden="true" />
                  <div className="bs-loading__label">Getting directions…</div>
                </div>
              )}

              {directions.status === 'error' && directions.error && (
                <p className="bs-help bs-help--error" role="status">
                  {directions.error}
                </p>
              )}

              {route && (
                <div className="sidePanel__directions" aria-label="Directions steps">
                  <div className="sidePanel__routeSummary">
                    {formatDistance(route.distanceMeters / 1000)} ·{' '}
                    {formatDuration(route.durationSeconds)}
                  </div>
                  <div className="sidePanel__stepsWrap">
                    <ol className="sidePanel__steps">
                      {route.steps.map((s, idx) => (
                        <li key={idx} className="sidePanel__step">
                          <div className="sidePanel__stepText">
                            {s.instruction}
                          </div>
                          <div className="sidePanel__stepMeta">
                            {formatDistance(s.distanceMeters / 1000)} ·{' '}
                            {formatDuration(s.durationSeconds)}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
})
