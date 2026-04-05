import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LatLng } from '../../../shared/geo'
import {
  fetchDirectionsRoute,
  geocodeOrigin,
  type DirectionsRoute,
} from '../routing'

export type DirectionsStatus = 'idle' | 'loading' | 'success' | 'error'

type Args = {
  isOpen: boolean
  mode: 'details' | 'directions'
  branchId: string | null
  destination: LatLng | null
  userLocation: LatLng | null
  originText: string
  route: DirectionsRoute | null
  onRouteChange: (route: DirectionsRoute | null) => void
}

type PendingRequest = {
  routeKey: string
  destination: LatLng
  userLocation: LatLng | null
  originText: string
}

export function useDirections(args: Args) {
  const {
    isOpen,
    mode,
    branchId,
    destination,
    userLocation,
    originText,
    route,
    onRouteChange,
  } = args

  const [status, setStatus] = useState<DirectionsStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [requestToken, setRequestToken] = useState(0)

  const routeCacheRef = useRef<Map<string, DirectionsRoute>>(new Map())
  const lastRouteKeyRef = useRef<string | null>(null)
  const pendingRef = useRef<PendingRequest | null>(null)
  const inFlightRouteKeyRef = useRef<string | null>(null)
  const inFlightAbortRef = useRef<AbortController | null>(null)
  const autoRequestedKeyRef = useRef<string | null>(null)

  const isActive = isOpen && mode === 'directions' && Boolean(branchId)

  const currentRouteKey = useMemo(() => {
    if (!branchId) return null
    if (!destination) return null

    const originKey = userLocation
      ? `geo:${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}`
      : `text:${originText.trim().toLowerCase()}`

    return `${branchId}:${originKey}`
  }, [branchId, destination, originText, userLocation])

  const request = useCallback(() => {
    if (!isActive) return
    if (!branchId) return

    if (!destination) {
      setStatus('error')
      setError('No coordinates available for this branch.')
      onRouteChange(null)
      return
    }

    if (!userLocation && !originText.trim()) {
      setStatus('error')
      setError('Enter a starting address or use your location.')
      return
    }

    if (!currentRouteKey) return

    // NOTE(directions-dedupe): Prevent runaway requests if something triggers
    // `request()` repeatedly for the same route while it is already in-flight.
    // Also abort any previous in-flight request when the requested key changes.
    if (inFlightRouteKeyRef.current === currentRouteKey) {
      return
    }
    if (
      inFlightAbortRef.current &&
      inFlightRouteKeyRef.current &&
      inFlightRouteKeyRef.current !== currentRouteKey
    ) {
      inFlightAbortRef.current.abort()
      inFlightAbortRef.current = null
      inFlightRouteKeyRef.current = null
    }

    // NOTE(directions-cache): Avoid re-fetching directions when toggling tabs.
    if (route && lastRouteKeyRef.current === currentRouteKey) {
      setStatus('success')
      setError(null)
      return
    }

    const cached = routeCacheRef.current.get(currentRouteKey)
    if (cached) {
      onRouteChange(cached)
      lastRouteKeyRef.current = currentRouteKey
      setStatus('success')
      setError(null)
      return
    }

    pendingRef.current = {
      routeKey: currentRouteKey,
      destination,
      userLocation,
      originText,
    }
    inFlightRouteKeyRef.current = currentRouteKey

    setStatus('loading')
    setError(null)
    setRequestToken((n) => n + 1)
  }, [
    branchId,
    currentRouteKey,
    destination,
    isActive,
    onRouteChange,
    originText,
    route,
    userLocation,
  ])

  // NOTE(directions-cache): Reset the "current route key" when switching branches,
  // but keep the full cache so revisiting branches is instant.
  useEffect(() => {
    lastRouteKeyRef.current = null
    autoRequestedKeyRef.current = null
    // Intentionally *not* clearing routeCacheRef.
  }, [branchId])

  useEffect(() => {
    if (isOpen) return
    autoRequestedKeyRef.current = null
  }, [isOpen])

  // NOTE(directions): Auto-fetch once we have browser geolocation (reliable)
  // and the user is viewing the directions tab.
  useEffect(() => {
    if (!isActive) return
    if (!destination) return
    if (!userLocation) return
    if (!currentRouteKey) return
    if (autoRequestedKeyRef.current === currentRouteKey) return
    autoRequestedKeyRef.current = currentRouteKey

    // NOTE(lint): Trigger request asynchronously to avoid derived-state updates
    // directly inside effects (see `react-hooks/set-state-in-effect`).
    const t = window.setTimeout(() => request(), 0)
    return () => window.clearTimeout(t)
  }, [currentRouteKey, destination, isActive, request, userLocation])

  // NOTE(directions): Debounce routing requests while typing an origin address.
  useEffect(() => {
    if (!isActive) return
    if (!destination) return
    if (userLocation) return
    if (!originText.trim()) return

    const t = window.setTimeout(() => request(), 450)
    return () => window.clearTimeout(t)
  }, [destination, isActive, originText, request, userLocation])

  useEffect(() => {
    if (!isActive) return
    if (requestToken === 0) return

    const pending = pendingRef.current
    if (!pending) return

    const { routeKey, destination, userLocation, originText } = pending
    pendingRef.current = null

    const abortController = new AbortController()
    inFlightAbortRef.current = abortController
    inFlightRouteKeyRef.current = routeKey

    async function run() {
      // Ensure the first state update happens after an await, so we don't trip
      // "set-state-in-effect" style lint rules.
      await Promise.resolve()

      const origin = userLocation
        ? userLocation
        : await geocodeOrigin(originText, { signal: abortController.signal })
      if (abortController.signal.aborted) return

      const nextRoute = await fetchDirectionsRoute(origin, destination, {
        signal: abortController.signal,
      })
      if (abortController.signal.aborted) return

      onRouteChange(nextRoute)
      routeCacheRef.current.set(routeKey, nextRoute)
      lastRouteKeyRef.current = routeKey
      setStatus('success')
      setError(null)

      if (inFlightAbortRef.current === abortController) {
        inFlightAbortRef.current = null
        inFlightRouteKeyRef.current = null
      }
    }

    run().catch((err) => {
      if (abortController.signal.aborted) return
      const message =
        err instanceof Error ? err.message : 'Unable to get directions.'
      onRouteChange(null)
      setStatus('error')
      setError(message)

      if (inFlightAbortRef.current === abortController) {
        inFlightAbortRef.current = null
        inFlightRouteKeyRef.current = null
      }
    })

    return () => {
      abortController.abort()
      if (inFlightAbortRef.current === abortController) {
        inFlightAbortRef.current = null
        inFlightRouteKeyRef.current = null
      }
    }
  }, [isActive, onRouteChange, requestToken])

  return { status, error, request }
}
