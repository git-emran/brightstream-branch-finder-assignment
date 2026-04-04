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

    setStatus('loading')
    setErrorMessage(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('success')
      },
      (err) => {
        // NOTE(branch-finder): Message is user-facing; keep it short.
        setStatus('error')
        setErrorMessage(err.message || 'Location permission denied.')
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }, [])

  return { status, location, errorMessage, request }
}
