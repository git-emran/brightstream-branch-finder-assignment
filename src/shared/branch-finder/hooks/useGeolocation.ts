import { useCallback, useState } from 'react'
import type { LatLng } from '../../../shared/geo'

type Status = 'idle' | 'loading' | 'success' | 'error'

export type GeolocationState = {
  status: Status
  location: LatLng | null
  errorMessage: string | null
  request: () => void
}

export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<Status>('idle')
  const [location, setLocation] = useState<LatLng | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const request = useCallback(() => {
    // NOTE(geolocation): In production, geolocation may be blocked if the app is
    // not running in a secure context (HTTPS) or is opened directly from disk.
    // Provide a clear message and fall back to rough IP geolocation when possible.
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'

    if (!navigator.geolocation) {
      setStatus('error')
      setErrorMessage('Geolocation is not supported by this browser.')
      return
    }

    const requestFallback = async (reason: string) => {
      // NOTE(ux): If the native browser API fails (e.g. macOS "Unknown Error"),
      // fall back to a rough IP-based geolocation so the user still sees relevant branches.
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json')
        if (!res.ok) throw new Error('Fallback failed')
        const data = await res.json()
        setLocation({
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
        })
        setStatus('success')
        setErrorMessage(null)
      } catch {
        setStatus('error')
        setErrorMessage(reason || 'Unable to determine location.')
      }
    }

    if (protocol === 'file:') {
      // File origins typically block required APIs and network requests.
      setStatus('error')
      setErrorMessage(
        'Location requires serving the app over HTTP(S). Use `npm run preview` or deploy to HTTPS.',
      )
      return
    }

    if (!window.isSecureContext && !isLocalhost) {
      requestFallback(
        'Geolocation requires HTTPS. Using an approximate location instead.',
      )
      return
    }

    setStatus('loading')
    setErrorMessage(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('success')
      },
      (err) => {
        // NOTE(branch-finder): Try fallback instead of showing an error immediately.
        requestFallback(err.message)
      },
      { enableHighAccuracy: false, timeout: 6_000 },
    )
  }, [])

  return { status, location, errorMessage, request }
}
