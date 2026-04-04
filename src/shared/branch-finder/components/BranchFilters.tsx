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
              onChange={(e) => onQueryChange(e.target.value)}
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
