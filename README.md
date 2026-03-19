# youth-montreal

Web app to help youth and young adults in Montreal discover nearby churches and gatherings.

## Features (free-first MVP)

- Landing section with mission/vision and Instagram call-to-action.
- Tabs for **Map**, **Calendar**, and **Contact us** sections (one section visible at a time).
- Interactive Leaflet map (drag/swipe + pinch/scroll zoom).
- Address + radius search to find nearby churches.
- Calendar view with advanced filters (language, event type, age group, weekday, date range) and recurring event support (weekly, bi-weekly, monthly, one-time).
- Contact forms for:
  - public suggestions / issue reports
  - host registration requests
- Contextual suggestion actions for selected places/events so users can report updates on the exact venue or calendar item they are viewing.
- ADM editing with passcode gate, map-click coordinate capture, recurring event entry, moderation queue, and church management (search/edit/delete).
- Host mode with host passcode so a church/organization can edit only its own location and events.
- Map section filters (language, event type, age group) to quickly narrow visible churches.
- Google Maps reference workflow: store Google Maps URL + optional Google Place ID per church.
- Free data persistence strategy:
  - localStorage fallback by default
  - optional Google Sheets sync via Apps Script endpoint (set `SHEETS_WEB_APP_URL` in `src/config.js`).
- Phase 5 hardening additions: privacy/legal pages, ADM JSON export/import backup tools, and a lightweight audit log.

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>
