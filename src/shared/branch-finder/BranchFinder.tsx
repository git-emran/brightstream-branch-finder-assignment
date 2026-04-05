import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { BranchFilters } from './components/BranchFilters'
import { BranchList } from './components/BranchList'
import { BranchMap } from './components/BranchMap'
import { BranchSidePanel } from './components/BranchSidePanel'
import { useBranches } from './hooks/useBranches'
import { useDebouncedValue } from './hooks/useDebouncedValue'
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

  // NOTE(perf): The main search query is already debounced by BranchFilters (250ms),
  // so we can use it directly for most logic.
  const debouncedQuery = useDebouncedValue(query, 50)
  const debouncedSuggestQuery = useDebouncedValue(query, 0)

  const branches: Branch[] = useMemo(
    () => branchesQuery.data ?? [],
    [branchesQuery.data],
  )
  const selectedBranch = useMemo(() => {
    if (!selectedBranchId) return null
    return branches.find((b) => b._id === selectedBranchId) ?? null
  }, [branches, selectedBranchId])

  const debouncedSearchText =
    searchMode === 'nearMe' ? '' : normalizeSearchText(debouncedQuery)
  const immediateSearchText =
    searchMode === 'nearMe' ? '' : normalizeSearchText(query)
  const debouncedSuggestText =
    searchMode === 'nearMe' ? '' : normalizeSearchText(debouncedSuggestQuery)

  const branchesWithComputed: BranchWithComputed[] = useMemo(() => {
    const origin = geo.location
    return branches.map((b) => {
      const coords = parseCoordinates(b.Coordinates)
      const distanceKm =
        origin && coords ? computeDistanceKm(origin, coords) : null
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

  const branchSearchIndex = useMemo(() => {
    const map = new Map<
      string,
      { name: string; city: string; zip: string; full: string }
    >()

    for (const b of branches) {
      const name = normalizeSearchText(b.Name)
      const city = normalizeSearchText(b.City)
      const zip = normalizeSearchText(b.ZipCode)
      const full = normalizeSearchText(
        [b.Name, b.City, b.Country, b.CountryCode, b.ZipCode, b.Street].join(' '),
      )

      map.set(b._id, { name, city, zip, full })
    }

    return map
  }, [branches])

  const baseFilteredBranches = useMemo(() => {
    let out = branchesWithComputed

    if (countryCode !== 'all') {
      out = out.filter((b) => b.CountryCode === countryCode)
    }
    if (city !== 'all') {
      out = out.filter((b) => b.City === city)
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
  }, [branchesWithComputed, city, countryCode, geo.location])

  const filteredBranches = useMemo(() => {
    const q = debouncedSearchText
    if (!q) {
      if (searchMode === 'nearMe') {
        // NOTE(ux): For "Near Me" search, focus on the 50 most relevant (closest)
        // results to keep the map and list localized.
        return baseFilteredBranches.slice(0, 50)
      }
      return baseFilteredBranches
    }

    return baseFilteredBranches.filter((b) => {
      const idx = branchSearchIndex.get(b._id)
      if (!idx) return false
      return idx.full.includes(q)
    })
  }, [baseFilteredBranches, branchSearchIndex, debouncedSearchText, searchMode])

  const deferredFilteredBranches = useDeferredValue(filteredBranches)
  const mapBranches = useMemo(() => {
    // NOTE(perf): Rendering 1,000+ Leaflet markers can be expensive. On large
    // result sets, defer map updates so the list and controls stay responsive.
    return filteredBranches.length > 250 ? deferredFilteredBranches : filteredBranches
  }, [deferredFilteredBranches, filteredBranches])

  const statsLabel = useMemo(() => {
    if (branchesQuery.status === 'loading') return 'Loading branches…'
    if (branchesQuery.status === 'error') return 'Unable to load branches.'
    return `${filteredBranches.length.toLocaleString()} branches`
  }, [branchesQuery.status, filteredBranches.length])

  const branchSuggestions = useMemo(() => {
    if (searchMode !== 'text') return []
    const q = debouncedSuggestText
    if (q.length < 2) return []

    type Candidate = { branch: BranchWithComputed; score: number }

    function cmp(a: Candidate, b: Candidate) {
      if (a.score !== b.score) return b.score - a.score
      const da = a.branch.distanceKm
      const db = b.branch.distanceKm
      if (da != null && db != null && da !== db) return da - db
      return a.branch.Name.localeCompare(b.branch.Name)
    }

    const top: Candidate[] = []

    function pushCandidate(next: Candidate) {
      // NOTE(search): Keep a small sorted list to avoid expensive full sorts.
      top.push(next)
      top.sort(cmp)
      if (top.length > 6) top.length = 6
    }

    for (const b of baseFilteredBranches) {
      const idx = branchSearchIndex.get(b._id)
      if (!idx) continue
      if (!idx.full.includes(q)) continue

      let score = 0
      if (idx.name.startsWith(q)) score += 100
      else if (idx.name.includes(q)) score += 60

      if (idx.city.startsWith(q)) score += 40
      else if (idx.city.includes(q)) score += 20

      if (idx.zip.startsWith(q)) score += 30
      else if (idx.zip.includes(q)) score += 10

      pushCandidate({ branch: b, score })

      // Small shortcut: perfect prefix matches fill the list quickly.
      if (top.length === 6 && top[5].score >= 100) break
    }

    return top.sort(cmp).map((c) => c.branch)
  }, [baseFilteredBranches, branchSearchIndex, debouncedSuggestText, searchMode])

  const isSuggestDebouncing =
    searchMode === 'text' && immediateSearchText !== debouncedSuggestText

  const listKey = `${countryCode}:${city}:${searchMode}:${debouncedSearchText}`
  const resultsFocusKey =
    countryCode !== 'all' || city !== 'all' ? `${countryCode}:${city}` : null

  const openPanel = useCallback((mode: PanelMode) => {
    setIsPanelOpen(true)
    setPanelMode(mode)
  }, [])

  const handleQueryChange = useCallback((next: string) => {
    setSearchMode('text')
    setQuery(next)
  }, [])

  const handleCountryCodeChange = useCallback((next: string) => {
    setCountryCode(next)
    setCity('all')
  }, [])

  const handleSelectBranchSuggestion = useCallback(
    (b: BranchWithComputed) => {
      setSelectedBranchId(b._id)
      setRoute(null)
      openPanel('details')
    },
    [openPanel],
  )

  const handleLocateMe = useCallback(() => {
    setSearchMode('nearMe')
    setQuery('My location')
    setSelectedBranchId(null)
    setIsPanelOpen(false)
    setPanelMode('details')
    setRoute(null)
    geo.request()
  }, [geo])

  const handleClearFilters = useCallback(() => {
    setCountryCode('all')
    setCity('all')
    setQuery('')
  }, [])

  const handleSelectBranch = useCallback(
    (b: BranchWithComputed) => {
      setSelectedBranchId(b._id)
      setRoute(null)
      openPanel('details')
    },
    [openPanel],
  )

  const handleSelectBranchIdFromMap = useCallback(
    (id: string) => {
      setSelectedBranchId(id)
      setRoute(null)
      openPanel('details')
    },
    [openPanel],
  )

  const handleModeChange = useCallback(
    (m: PanelMode) => {
      if (m === 'directions' && !geo.location && geo.status !== 'loading') {
        geo.request()
      }
      openPanel(m)
    },
    [geo, openPanel],
  )

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
    setPanelMode('details')
    setRoute(null)
  }, [])

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
        onQueryChange={handleQueryChange}
        countryCode={countryCode}
        onCountryCodeChange={handleCountryCodeChange}
        city={city}
        onCityChange={setCity}
        countries={countries}
        cities={cities}
        branchSuggestions={branchSuggestions}
        isSuggestLoading={isSuggestDebouncing}
        onSelectBranchSuggestion={handleSelectBranchSuggestion}
        geolocation={geo}
        onLocateMe={handleLocateMe}
        onClearFilters={handleClearFilters}
      />

      <div className="finder__layout">
        <div className="finder__panel finder__panel--list">
          <BranchList
            key={listKey}
            status={branchesQuery.status}
            branches={filteredBranches}
            error={branchesQuery.error}
            selectedBranchId={selectedBranchId}
            onSelectBranch={handleSelectBranch}
          />
        </div>

        <div className="finder__panel finder__panel--map">
          <BranchMap
            branches={mapBranches}
            selectedBranchId={selectedBranchId}
            onSelectBranchId={handleSelectBranchIdFromMap}
            userLocation={geo.location}
            route={route}
            resultsFocusKey={resultsFocusKey}
          />
        </div>
      </div>

      <BranchSidePanel
        branch={isPanelOpen ? selectedBranch : null}
        mode={panelMode}
        onModeChange={handleModeChange}
        userLocation={geo.location}
        geolocation={geo}
        originText={originText}
        onOriginTextChange={setOriginText}
        route={route}
        onRouteChange={setRoute}
        onClose={handleClosePanel}
      />
    </div>
  )
}
