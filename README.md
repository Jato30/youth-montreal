# youth-montreal

Web app to help youth and young adults in Montreal discover nearby churches and gatherings.

## Features (free-first MVP)

- Landing section with mission/vision and Instagram call-to-action.
- Tabs for **Map**, **Calendar**, and **Contact us** sections.
- Interactive Leaflet map (drag/swipe + pinch/scroll zoom).
- Address + radius search to find nearby churches.
- Calendar view with filters and recurring event support (weekly, bi-weekly, monthly, one-time).
- Contact forms for:
  - public suggestions / issue reports
  - host registration requests
- ADM editing with passcode gate, map-click coordinate capture, and recurring event entry.
- Google Maps reference workflow: store Google Maps URL + optional Google Place ID per church.
- Free data persistence strategy:
  - localStorage fallback by default
  - optional Google Sheets sync via Apps Script endpoint (set `SHEETS_WEB_APP_URL` in `src/config.js`).

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>
