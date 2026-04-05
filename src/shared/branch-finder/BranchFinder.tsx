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

type PanelMode = 'details' | 'directions'
type SearchMode = 'text' | 'nearMe'

export function BranchFinder() {
  const branchesQuery = useBranches()
  const geo = useGeolocation()

  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('text')
  const [countryCode, setCountryCode] = useState<string>('all')
  const [city, setCity] = useState<string>('all')
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
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

  const searchText =
    searchMode === 'nearMe' ? '' : normalizeSearchText(query)

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

  const listKey = `${countryCode}:${city}:${searchMode}:${searchText}`
  const resultsFocusKey =
    countryCode !== 'all' || city !== 'all' ? `${countryCode}:${city}` : null

  function openPanel(mode: PanelMode) {
    setIsPanelOpen(true)
    setPanelMode(mode)
  }

  return (
    <div className="finder">
      <div className="finder__header">
        <div>
          <h2 className="finder__title">Brightstream branches</h2>
          <p className="finder__meta">
            {statsLabel}
            {geo.location && geo.status !== 'error' ? (
              <>
                <br />
                <span className="finder__metaSub">
                  Sorting by nearest branches.
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div />
      </div>

      <BranchFilters
        query={query}
        onQueryChange={(next) => {
          setSearchMode('text')
          setQuery(next)
        }}
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
        onLocateMe={() => {
          // NOTE(ux): "Locate me" populates the search box, but doesn't apply a
          // textual filter. Branches are sorted/zoomed by proximity instead.
          setSearchMode('nearMe')
          setQuery('My location')
          setSelectedBranchId(null)
          setIsPanelOpen(false)
          setPanelMode('details')
          setRoute(null)
          geo.request()
        }}
        onClearFilters={() => {
          setCountryCode('all')
          setCity('all')
        }}
      />

      <div className="finder__layout">
        <div className="finder__panel finder__panel--list">
          <BranchList
            key={listKey}
            status={branchesQuery.status}
            branches={filteredBranches}
            error={branchesQuery.error}
            selectedBranchId={selectedBranchId}
            onSelectBranch={(b) => {
              setSelectedBranchId(b._id)
              setRoute(null)
              openPanel('details')
            }}
          />
        </div>

        <div className="finder__panel finder__panel--map">
          <BranchMap
            branches={filteredBranches}
            selectedBranchId={selectedBranchId}
            onSelectBranchId={(id) => {
              setSelectedBranchId(id)
              setRoute(null)
              openPanel('details')
            }}
            userLocation={geo.location}
            route={route}
            resultsFocusKey={resultsFocusKey}
          />
        </div>
      </div>

      <BranchSidePanel
        branch={isPanelOpen ? selectedBranch : null}
        mode={panelMode}
        onModeChange={(m) => {
          // NOTE(ux): Directions default to the user's current location.
          if (m === 'directions' && !geo.location && geo.status !== 'loading') {
            geo.request()
          }
          openPanel(m)
        }}
        userLocation={geo.location}
        geolocation={geo}
        originText={originText}
        onOriginTextChange={setOriginText}
        route={route}
        onRouteChange={setRoute}
        onClose={() => {
          setIsPanelOpen(false)
          setPanelMode('details')
          setRoute(null)
        }}
      />
    </div>
  )
}
