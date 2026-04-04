import { useMemo, useState } from 'react'
import { BranchFilters } from './components/BranchFilters'
import { BranchList } from './components/BranchList'
import { BranchMap } from './components/BranchMap'
import { BranchSidePanel } from './components/BranchSidePanel'
import { useBranches } from './hooks/useBranches'
import { useGeolocation } from './hooks/useGeolocation'
import type { DirectionsRoute } from './routing'
import type { Branch, BranchWithComputed } from './types'
import {
  computeDistanceKm,
  normalizeSearchText,
  parseCoordinates,
} from './utils'

type ViewMode = 'list' | 'map'
type PanelMode = 'details' | 'directions'

export function BranchFinder() {
  const branchesQuery = useBranches()
  const geo = useGeolocation()

  const [query, setQuery] = useState('')
  const [countryCode, setCountryCode] = useState<string>('all')
  const [city, setCity] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<PanelMode>('details')
  const [originText, setOriginText] = useState('')
  const [route, setRoute] = useState<DirectionsRoute | null>(null)

  const branches: Branch[] = useMemo(
    () => branchesQuery.data ?? [],
    [branchesQuery.data],
  )
  const selectedBranch = useMemo(() => {
    if (!selectedBranchId) return null
    return branches.find((b) => b._id === selectedBranchId) ?? null
  }, [branches, selectedBranchId])

  const searchText = normalizeSearchText(query)

  const branchesWithComputed: BranchWithComputed[] = useMemo(() => {
    const origin = geo.location
    return branches.map((b) => {
      const coords = parseCoordinates(b.Coordinates)
      const distanceKm =
        origin && coords
          ? computeDistanceKm(origin, coords)
          : origin
            ? null
            : null
      return { ...b, coords, distanceKm }
    })
  }, [branches, geo.location])

  const countries = useMemo(() => {
    const all = new Map<string, string>()
    for (const b of branches) {
      if (b.CountryCode) all.set(b.CountryCode, b.Country)
    }
    return Array.from(all.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([code, name]) => ({ code, name }))
  }, [branches])

  const cities = useMemo(() => {
    const citySet = new Set<string>()
    for (const b of branches) {
      if (countryCode !== 'all' && b.CountryCode !== countryCode) continue
      if (b.City) citySet.add(b.City)
    }
    return Array.from(citySet).sort((a, b) => a.localeCompare(b))
  }, [branches, countryCode])

  const filteredBranches = useMemo(() => {
    const q = searchText
    let out = branchesWithComputed

    if (countryCode !== 'all') {
      out = out.filter((b) => b.CountryCode === countryCode)
    }
    if (city !== 'all') {
      out = out.filter((b) => b.City === city)
    }
    if (q) {
      out = out.filter((b) => {
        const haystack = normalizeSearchText(
          [
            b.Name,
            b.City,
            b.Country,
            b.CountryCode,
            b.ZipCode,
            b.Street,
          ].join(' '),
        )
        return haystack.includes(q)
      })
    }

    // NOTE(branch-finder): When geolocation is available, prioritize nearest;
    // otherwise provide a stable alphabetical order.
    out = out.slice().sort((a, b) => {
      if (geo.location) {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY
        if (da !== db) return da - db
      }
      return a.Name.localeCompare(b.Name)
    })

    return out
  }, [branchesWithComputed, city, countryCode, geo.location, searchText])

  const statsLabel = useMemo(() => {
    if (branchesQuery.status === 'loading') return 'Loading branches…'
    if (branchesQuery.status === 'error') return 'Unable to load branches.'
    return `${filteredBranches.length.toLocaleString()} branches`
  }, [branchesQuery.status, filteredBranches.length])

  const listKey = `${countryCode}:${city}:${searchText}`

  return (
    <div className="finder">
      <div className="finder__header">
        <div>
          <h2 className="finder__title">Find a Brightstream branch</h2>
          <p className="finder__meta">{statsLabel}</p>
        </div>

        <div className="finder__viewToggle" role="tablist" aria-label="View">
          <button
            type="button"
            className={
              viewMode === 'list'
                ? 'bs-segment bs-segment--active'
                : 'bs-segment'
            }
            onClick={() => setViewMode('list')}
            role="tab"
            aria-selected={viewMode === 'list'}
          >
            List
          </button>
          <button
            type="button"
            className={
              viewMode === 'map'
                ? 'bs-segment bs-segment--active'
                : 'bs-segment'
            }
            onClick={() => setViewMode('map')}
            role="tab"
            aria-selected={viewMode === 'map'}
          >
            Map
          </button>
        </div>
      </div>

      <BranchFilters
        query={query}
        onQueryChange={setQuery}
        countryCode={countryCode}
        onCountryCodeChange={(next) => {
          setCountryCode(next)
          setCity('all')
        }}
        city={city}
        onCityChange={setCity}
        countries={countries}
        cities={cities}
        geolocation={geo}
      />

      <div className="finder__layout">
        <div
          className={
            viewMode === 'list'
              ? 'finder__panel finder__panel--active'
              : 'finder__panel finder__panel--inactive'
          }
        >
          <BranchList
            key={listKey}
            status={branchesQuery.status}
            branches={filteredBranches}
            error={branchesQuery.error}
            selectedBranchId={selectedBranchId}
            onSelectBranch={(b) => {
              setSelectedBranchId(b._id)
              setPanelMode('details')
              setRoute(null)
            }}
          />
        </div>

        <div
          className={
            viewMode === 'map'
              ? 'finder__panel finder__panel--active'
              : 'finder__panel finder__panel--inactive'
          }
        >
          <BranchMap
            branches={filteredBranches}
            selectedBranchId={selectedBranchId}
            onSelectBranchId={(id) => {
              setSelectedBranchId(id)
              setPanelMode('details')
              setRoute(null)
            }}
            userLocation={geo.location}
            route={route}
          />
        </div>
      </div>

      <BranchSidePanel
        branch={selectedBranch}
        mode={panelMode}
        onModeChange={(m) => {
          setPanelMode(m)
          // NOTE(ux): Directions are shown in-app on the map; ensure the map is visible.
          if (m === 'directions') setViewMode('map')
        }}
        userLocation={geo.location}
        geolocation={geo}
        originText={originText}
        onOriginTextChange={setOriginText}
        route={route}
        onRouteChange={setRoute}
        onClose={() => {
          setSelectedBranchId(null)
          setPanelMode('details')
          setRoute(null)
        }}
      />
    </div>
  )
}
