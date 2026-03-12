# youth-montreal

Web app to help youth and young adults in Montreal discover nearby churches and gatherings.

## What changed

- New visual identity direction with a bold black/white Youth MTL-inspired header and cleaner landing experience.
- New landing section explaining mission/vision and linking to Instagram.
- New church finder form: enter an address + radius (km) to find churches near you.
- "Open map" button to jump straight to the map view.
- Existing features kept:
  - interactive Leaflet map with draggable/pinch-zoom controls
  - church details and next 7 days gatherings
  - multilingual UI selector
  - ADM-only editing with map click capture + reverse geocoding
  - localStorage persistence

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>
