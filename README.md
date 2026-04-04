# Brightstream Branch Finder

Web-based branch finder for Brightstream that fetches real branch data from Optimizely Graph (GraphQL) and provides search, filters, an interactive map, and “nearest branch” sorting via browser geolocation.

## Features

- Optimizely Graph integration (GraphQL) with paged fetching (`limit`/`skip`)
- Fast search across branch name + address fields
- Pagination controls for results
- Filters: country + city
- Map view (Leaflet + OpenStreetMap tiles)
- In-app directions (no redirect) with a left-side directions panel (OSRM)
- “Use my location” to sort by nearest branch + show distance
- Responsive layout (desktop split view, mobile list/map toggle)

## Design System

The Brightstream visual tokens (colors + typography) come from the provided HTML mockups:

- `design/home.html`
- `design/articles.html`

Those tokens are implemented in `src/styles/brightstream.css` and used throughout the branch finder UI.

## Tech Stack

- React + TypeScript + Vite
- Leaflet / React-Leaflet (map)
- OSRM (routing)
- Plain CSS (no CSS framework)

## Getting Started

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

### Optimizely Graph Endpoint (Optional)

By default the app uses the provided single-key Optimizely Graph endpoint (embedded as a default in `src/shared/optimizelyGraphClient.ts`).

To override:

1. Copy `.env.example` to `.env`
2. Set `VITE_OPTIMIZELY_GRAPH_ENDPOINT`

## Build / Preview

```bash
npm run build
npm run preview
```

## Deploy (Netlify)

This repo includes `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`

## Notes / Limitations

- Branch coordinates are parsed from the `Coordinates` string field (e.g. `"35.218630, -80.796530"`).
- Optimizely Graph enforces a max `limit` of `100` for queries; fetching is done via paging.
- Some fields visible in schema introspection are not queryable at runtime for this dataset, so the UI uses the fields that are queryable and present on records (name, address, coordinates, phone, email).
- Map performance with ~1,000 markers is acceptable for the take-home, but a production build should add marker clustering and/or server-side geo queries.
- Directions use the public OSRM routing endpoint; origin address lookup is best-effort via OpenStreetMap Nominatim. For production, use a dedicated geocoding/routing provider with keys + quotas.
