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
