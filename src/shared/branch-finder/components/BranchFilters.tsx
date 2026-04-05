import { useId, useMemo, useState } from 'react'
import type { BranchWithComputed } from '../types'
import type { GeolocationState } from '../hooks/useGeolocation'

type Props = {
  query: string
  onQueryChange: (next: string) => void
  countryCode: string
  onCountryCodeChange: (next: string) => void
  city: string
  onCityChange: (next: string) => void
  countries: Array<{ code: string; name: string }>
  cities: string[]
  branchSuggestions: BranchWithComputed[]
  isSuggestLoading: boolean
  onSelectBranchSuggestion: (branch: BranchWithComputed) => void
  geolocation: GeolocationState
  onLocateMe: () => void
  onClearFilters: () => void
}

export function BranchFilters(props: Props) {
  const {
    query,
    onQueryChange,
    countryCode,
    onCountryCodeChange,
    city,
    onCityChange,
    countries,
    cities,
    branchSuggestions,
    isSuggestLoading,
    onSelectBranchSuggestion,
    geolocation,
    onLocateMe,
    onClearFilters,
  } = props

  const selectedCountryName =
    countryCode === 'all'
      ? null
      : countries.find((c) => c.code === countryCode)?.name ?? countryCode

  const selectedCityName = city === 'all' ? null : city
  const hasActiveFilters = Boolean(selectedCountryName || selectedCityName)

  const listboxId = useId()
  const [isSuggestOpen, setIsSuggestOpen] = useState(false)
  const [active, setActive] = useState<{ queryKey: string; index: number }>({
    queryKey: '',
    index: -1,
  })

  const trimmedQuery = query.trim()
  const shouldSuggest =
    trimmedQuery.length >= 2 && trimmedQuery.toLowerCase() !== 'my location'

  const suggestions = useMemo(() => {
    if (!shouldSuggest) return []
    return branchSuggestions.slice(0, 6)
  }, [branchSuggestions, shouldSuggest])

  const showSuggestPanel = isSuggestOpen && shouldSuggest
  const showSuggestions = showSuggestPanel && suggestions.length > 0

  const activeIndex =
    showSuggestions && active.queryKey === trimmedQuery ? active.index : -1

  function selectSuggestion(next: BranchWithComputed) {
    onQueryChange(next.Name)
    onSelectBranchSuggestion(next)
    setIsSuggestOpen(false)
    setActive({ queryKey: next.Name.trim(), index: -1 })
  }

  return (
    <div className="finderFilters" aria-label="Search and filters">
      <div className="finderFilters__grid">
        <div className="bs-field finderFilters__search">
          <label className="bs-label" htmlFor="branchQuery">
            Search
          </label>
          <div className="bs-inputWrap">
            <input
              id="branchQuery"
              className="bs-input bs-input--withIcon"
              type="search"
              inputMode="search"
              placeholder="City, ZIP, or branch name"
              value={query}
              onChange={(e) => {
                const next = e.target.value
                onQueryChange(next)
                setActive({ queryKey: next.trim(), index: -1 })
                setIsSuggestOpen(true)
              }}
              onFocus={() => setIsSuggestOpen(true)}
              onBlur={() => {
                setIsSuggestOpen(false)
                setActive({ queryKey: trimmedQuery, index: -1 })
              }}
              onKeyDown={(e) => {
                if (!shouldSuggest) return

                if (e.key === 'Escape') {
                  setIsSuggestOpen(false)
                  setActive({ queryKey: trimmedQuery, index: -1 })
                  return
                }

                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setIsSuggestOpen(true)
                  setActive((prev) => {
                    const current =
                      prev.queryKey === trimmedQuery ? prev.index : -1
                    return {
                      queryKey: trimmedQuery,
                      index: Math.min(suggestions.length - 1, current + 1),
                    }
                  })
                  return
                }

                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((prev) => {
                    const current =
                      prev.queryKey === trimmedQuery ? prev.index : 0
                    return {
                      queryKey: trimmedQuery,
                      index: Math.max(0, current - 1),
                    }
                  })
                  return
                }

                if (e.key === 'Enter') {
                  if (!showSuggestions) return
                  if (activeIndex < 0) return
                  e.preventDefault()
                  const next = suggestions[activeIndex]
                  if (next) selectSuggestion(next)
                }
              }}
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls={showSuggestions ? listboxId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={
                showSuggestions && activeIndex >= 0
                  ? `${listboxId}-opt-${activeIndex}`
                  : undefined
              }
            />
            <button
              type="button"
              className={
                geolocation.status === 'loading'
                  ? 'bs-inputIconBtn bs-inputIconBtn--loading'
                  : 'bs-inputIconBtn'
              }
              onClick={onLocateMe}
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
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </button>

            {showSuggestPanel && (
              <div
                id={listboxId}
                className="comboList"
                role="listbox"
                aria-label="Branch suggestions"
              >
                {isSuggestLoading ? (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={`combo-skel-${i}`} className="comboItem comboItem--skeleton">
                        <span className="comboItem__icon" aria-hidden="true">
                          <span className="skeletonLine skeletonLine--comboIcon" />
                        </span>
                        <span className="comboItem__text" aria-hidden="true">
                          <span className="skeletonLine skeletonLine--comboTitle" />
                          <span className="skeletonLine skeletonLine--comboSub" />
                        </span>
                      </div>
                    ))}
                  </>
                ) : suggestions.length > 0 ? (
                  <>
                    {suggestions.map((b, i) => {
                      const isActive = i === activeIndex
                      return (
                        <button
                          key={b._id}
                          id={`${listboxId}-opt-${i}`}
                          type="button"
                          className={
                            isActive ? 'comboItem comboItem--active' : 'comboItem'
                      }
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selectSuggestion(b)
                      }}
                      onMouseEnter={() =>
                        setActive({ queryKey: trimmedQuery, index: i })
                      }
                    >
                          <span className="comboItem__icon" aria-hidden="true">
                            <svg
                              width="16"
                              height="16"
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
                          <span className="comboItem__text">
                            <span className="comboItem__title">{b.Name}</span>
                            <span className="comboItem__sub">
                              {b.City}
                              {b.ZipCode ? ` · ${b.ZipCode}` : ''} · {b.Country}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </>
                ) : (
                  <div className="comboEmpty" role="presentation">
                    No matches.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="finderFilters__row">
          <div className="bs-field">
            <label className="bs-label" htmlFor="country">
              Country
            </label>
            <select
              id="country"
              className="bs-select"
              value={countryCode}
              onChange={(e) => onCountryCodeChange(e.target.value)}
            >
              <option value="all">All countries</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bs-field">
            <label className="bs-label" htmlFor="city">
              City
            </label>
            <select
              id="city"
              className="bs-select"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              disabled={cities.length === 0}
            >
              <option value="all">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="filterChips" aria-label="Active filters">
          <div className="filterChips__list">
            {selectedCountryName && (
              <button
                type="button"
                className="chip"
                onClick={() => onCountryCodeChange('all')}
                aria-label={`Remove country filter: ${selectedCountryName}`}
                title="Remove filter"
              >
                Country: {selectedCountryName}
                <span className="chip__x" aria-hidden="true">
                  ×
                </span>
              </button>
            )}

            {selectedCityName && (
              <button
                type="button"
                className="chip"
                onClick={() => onCityChange('all')}
                aria-label={`Remove city filter: ${selectedCityName}`}
                title="Remove filter"
              >
                City: {selectedCityName}
                <span className="chip__x" aria-hidden="true">
                  ×
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="chip chip--clear"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        </div>
      )}

      {geolocation.status === 'error' && (
        <p className="bs-help bs-help--error" role="status">
          {geolocation.errorMessage ??
            'Location unavailable. Check browser permissions.'}
        </p>
      )}
    </div>
  )
}
