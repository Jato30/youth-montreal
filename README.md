# youth-montreal

Web app to help youth and young adults in Montreal discover nearby churches and gatherings.

## New file organization (React-style mindset, modular files)

The app is still a lightweight static frontend, but code is now split into focused modules so each file has one clear responsibility:

- `src/main.js` — app bootstrap and wiring
- `src/config.js` — app constants/keys/default map settings
- `src/data/defaultChurches.js` — seed data
- `src/i18n.js` — translations + language application
- `src/services/storage.js` — localStorage read/write
- `src/services/geocoding.js` — geocoding/reverse-geocoding API calls
- `src/utils/distance.js` — distance calculation utility
- `src/ui/mapView.js` — Leaflet map setup + marker rendering
- `src/ui/detailsView.js` — church details rendering
- `src/controllers/finderController.js` — address/radius search behavior
- `src/controllers/adminController.js` — ADM editing workflow

## Features

- Landing section with mission/vision and Instagram call-to-action
- Address + radius search to find nearby churches
- Interactive Leaflet map (drag/swipe + pinch/scroll zoom)
- Church details with upcoming 7-day gatherings and social links
- Google Maps reference workflow: store a Google Maps pin URL and optional Google Place ID per church
- ADM-only editing with map click capture + reverse geocoding
- Multilingual interface with language selector
- Data persisted in `localStorage`

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>
