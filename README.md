# youth-montreal

Simple web app to help youth and young adults in Montreal discover nearby churches and upcoming gatherings.

## Features

- Interactive map of Montreal churches using Leaflet + OpenStreetMap (drag/swipe to move, pinch or scroll to zoom).
- Click a church marker to see:
  - church name and address
  - gatherings in the next 7 days
  - map deep-link for directions
  - website + social links (Instagram, Facebook, WhatsApp) when available
  - languages spoken
- ADM mode to add and edit church pins (pin editing is only available in ADM mode).
- In ADM mode, enable map capture and click the map to auto-fill coordinates and reverse-geocoded address.
- Interface language selector with support for: English, French (CA), Spanish (LatAm), Italian, Portuguese (BR), Korean, Chinese, Ukrainian, Hebrew.
- Data persistence in `localStorage` for quick prototyping.

## Run locally

Open `index.html` directly in a browser, or use a static server:

```bash
python3 -m http.server 4173
```

Then visit: <http://localhost:4173>
