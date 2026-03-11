# youth-montreal

Simple web app to help youth and young adults in Montreal discover nearby churches and upcoming gatherings.

## Features

- Interactive map of Montreal churches using Leaflet + OpenStreetMap (drag/swipe to move, pinch or scroll to zoom).
- Click a church marker to see:
  - church name
  - gatherings in the next 7 days
  - map deep-link for directions
  - website + social links (Instagram, Facebook, WhatsApp) when available
- ADM mode to add new churches and events.
- Data persistence in `localStorage` for quick prototyping.

## Run locally

Open `index.html` directly in a browser, or use a static server:

```bash
python3 -m http.server 4173
```

Then visit: <http://localhost:4173>
