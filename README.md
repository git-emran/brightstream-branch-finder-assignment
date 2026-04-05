# Brightstream Branch Finder

Web-based branch finder for Brightstream that fetches real branch data from Optimizely Graph (GraphQL) and provides search, filters, an interactive map, and “nearest branch” sorting via browser geolocation.

[**Visit Live Website**](https://exquisite-belekoy-5321ab.netlify.app/)

<img width="1749" height="1247" alt="Brightstream branch finder" src="https://github.com/user-attachments/assets/966b9297-665b-491a-ac18-f8b2c3744f00" />

## Features

- Optimizely Graph integration (GraphQL) with paged fetching (`limit`/`skip`)
- Local branch caching (12h TTL) for a fast first paint, then background refresh
- Search with debounced filtering (snappy while typing)
- Autocomplete dropdown suggestions (keyboard + mouse, ARIA combobox/listbox)
- Pagination (5 items per page)
- Filters: country + city, with active filter chips + clear filters
- Map view (Leaflet + OpenStreetMap tiles) with labeled markers
- Branch details left-side panel with tabs (Details / Directions)
- In-app directions (no redirect): OSRM routing + Nominatim geocoding fallback
- Directions are cached per-branch/per-origin (revisits are instant)
- “Locate me” populates the search input and focuses nearest branches on the map
- Copy-to-clipboard for phone numbers in the details panel
- Responsive layout (desktop split view, mobile map then list)

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

### Requirements

- Node.js 18+ recommended

### Optimizely Graph Endpoint (Required)

This app requires an Optimizely Graph endpoint (including the single-key `auth=...` query param).

1. Copy `.env.example` to `.env`
2. Set `VITE_OPTIMIZELY_GRAPH_ENDPOINT` to the endpoint provided in the assignment brief

Example:

```bash
VITE_OPTIMIZELY_GRAPH_ENDPOINT="YOUR_KEY_HERE"
```

Note: `src/shared/optimizelyGraphClient.ts` intentionally does not hardcode the endpoint so the repo can stay public without embedding credentials.

## Build / Preview

```bash
npm run build
npm run preview
```

## Deploy (Netlify)

This repo includes `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`

Also configure the `VITE_OPTIMIZELY_GRAPH_ENDPOINT` environment variable in Netlify.

## Notes / Limitations

- Branch coordinates are parsed from the `Coordinates` string field (e.g. `"35.218630, -80.796530"`).
- Optimizely Graph enforces a max `limit` of `100` for queries; fetching is done via paging.
- Some fields visible in schema introspection are not queryable at runtime for this dataset, so the UI uses the fields that are queryable and present on records (name, address, coordinates, phone, email).
- Map performance with ~1,000 markers is acceptable for the take-home, but a production build should add marker clustering and/or server-side geo queries.
- Directions use the public OSRM routing endpoint; origin address lookup is best-effort via OpenStreetMap Nominatim and may be rate-limited. For production, use a dedicated geocoding/routing provider with keys + quotas.
- Search suggestions are generated from the already-loaded dataset (no server-side typeahead for this take-home challenge).
