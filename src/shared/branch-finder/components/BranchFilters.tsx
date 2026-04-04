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
  } = props

  return (
    <div className="finder__filters" aria-label="Search and filters">
      <div className="bs-field">
        <label className="bs-label" htmlFor="branchQuery">
          Search
        </label>
        <input
          id="branchQuery"
          className="bs-input"
          type="search"
          inputMode="search"
          placeholder="City, ZIP, or branch name"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

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

      <div className="finder__geo">
        <button
          type="button"
          className="bs-btn bs-btn--primary"
          onClick={geolocation.request}
          disabled={geolocation.status === 'loading'}
        >
          {geolocation.status === 'loading'
            ? 'Locating…'
            : geolocation.location
              ? 'Update my location'
              : 'Use my location'}
        </button>

        {geolocation.status === 'error' && (
          <p className="bs-help bs-help--error" role="status">
            {geolocation.errorMessage ??
              'Location unavailable. Check browser permissions.'}
          </p>
        )}

        {geolocation.location && geolocation.status !== 'error' && (
          <p className="bs-help" role="status">
            Sorting by nearest branches.
          </p>
        )}
      </div>
    </div>
  )
}

