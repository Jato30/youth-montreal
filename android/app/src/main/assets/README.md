# church-finder

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
  - optional Google Sheets sync via Apps Script endpoint (set `SHEETS_WEB_APP_URL` in `src/config.js`, or set `window.__SHEETS_WEB_APP_URL__` / localStorage key `youth-montreal-sheets-url` at runtime).
- Phase 5 hardening additions: privacy/legal pages, ADM JSON export/import backup tools, and a lightweight audit log.

## Run locally (web)

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Cloud sync note (multi-device consistency)

By default, saves are local-only (`localStorage`).  
To share changes across devices, configure a valid Apps Script endpoint:

- `src/config.js` → `SHEETS_WEB_APP_URL`
- or runtime global: `window.__SHEETS_WEB_APP_URL__`
- or runtime localStorage override: `youth-montreal-sheets-url`

If remote sync is configured but unreachable, the app now keeps the local save and shows a cloud-sync failure message so admins/hosts know data was not pushed to the shared backend.

### Common “DB not updating” root cause

If the web app shows **Local only**, no remote endpoint is active for that browser session.  
Most frequent causes:

1. `src/config.js` still has an empty `SHEETS_WEB_APP_URL`.
2. Endpoint is set only in Android asset config, while you are testing the web build.
3. Endpoint URL is missing/invalid in local runtime storage.

Quick fix during runtime: click the sync chip and paste the deployed Apps Script URL.

### Sync blocked by remote endpoint failures (diagnosis)

If a broken URL or unavailable Apps Script endpoint is configured, startup can feel blocked while each remote resource times out.

Mitigations now in place:

- Cloud reads are requested in parallel during startup (instead of sequentially), so fallback to local cache is much faster when remote is down.
- After a remote timeout/error, only that failing resource enters a short cooldown window before retrying (resource-scoped cooldown), preventing repeated timeout loops without blocking other resources like hosts.
- Manual retry still works from the sync chip and clears the cooldown immediately.

### Terminology migration compatibility (merge-readiness)

Internal code now standardizes on:

- `host` (instead of church/place/organizer internals)
- `event`
- `report`

For merge safety while all modules are being aligned, repository and app state keep backward-compatible aliases so older modules still run during transition. User-facing labels remain context-specific aliases from i18n.

### Apps Script resource mapping requirement

The frontend syncs using canonical resources: `hosts`, `reports`, and `hostRequests`.

Your Apps Script backend must map those resources to sheet tabs:

- `hosts` -> `hosts`
- `reports` -> `reports`
- `hostRequests` -> `hostRequests`

Without this exact mapping, reads/writes can fail for host data and leave sync pending forever.

Note: for canonical resource names, backend GET now auto-creates missing tabs with `data_json` header and returns an empty list (so a missing `reports`/`hostRequests` tab no longer blocks loading `hosts`).

Migration tip (required when moving from old builds):
- Google Sheets: keep tab name as `hosts` (you already renamed it).
- Browser local data: open DevTools -> Application (or Storage) -> Local Storage -> your app origin and delete `youth-montreal-churches`; the app now uses `youth-montreal-hosts`.
- If needed from console: `localStorage.setItem('youth-montreal-hosts', localStorage.getItem('youth-montreal-churches') || '[]'); localStorage.removeItem('youth-montreal-churches');`

### Apps Script CORS gotcha

For POST writes, this project now sends a **simple request body** (no custom JSON header) to avoid browser CORS preflight failures against Apps Script web apps.  
If you reintroduce custom `Content-Type: application/json`, some deployments may stop accepting browser writes.

### Startup sync deadlock guard

Initialization now uses a bounded retry window for startup sync and always clears the loading overlay in a `finally` block.  
If cloud calls stall/fail, the UI falls back to available local data instead of staying blocked behind the loader.

### Sync indicator in UI

- Startup now registers the sync-status click/online listeners only once (duplicate setup bindings removed) to prevent double retry side effects.
- Header chip shows current status:
  - `Local only` → no cloud backend configured
  - `Sync pending (N)` → unsynced resources queued for retry
  - `Cloud synced` → local and cloud are up to date
- Clicking the chip triggers a manual retry.
- Pending sync also retries automatically when network comes back (`online` event).

## Editable icon assets

Mobile action icons are now regular files so you can tweak them anytime:

- `assets/icons/report.svg`
- `assets/icons/edit-pin.svg`
- `assets/icons/delete.svg`
- `assets/icons/add.svg`

The mobile button CSS uses those files directly (`styles.css`), instead of embedded data-URI SVG blobs.

## Address normalization rules (web + app)

- All church/address autocomplete flows now store and re-fill compact addresses in this format:
  - `unit-streetNumber streetNameAbbrev, City, PostalCode`
  - Example: `104-515 Rue Cherrier, Montreal, H2L 1H2`
- Address reverse geocoding and typed search both map to this compact format before persisting.
- Church cards and event rows render shortened addresses via `shortenAddress(...)` so overlong provider strings do not leak into the UI.

## Event editor layout notes (web + Android asset parity)

- The event editor template intentionally keeps:
  - no inner \"Gathering details\" label row (removed from both template and i18n),
  - top row with three direct fields: `Event title`, `From`, `at`,
  - line break before `Event type` block (event type should not sit on the same row as date/time on desktop),
  - `Age group` + `Repeats` grouped in `.event-row-meta-grid`.
  - row delete action positioned at the bottom action row (`.event-row-actions`), close to the `+ Add gathering` control area.
  - no extra inner bordered card for each gathering row; visual frame belongs to parent `Gatherings` region only.
- Admin church form grouping on desktop:
  - `Google Maps pin URL + Google Place ID + Latitude + Longitude`
  - `Website + Instagram + Facebook (+ WhatsApp kept on same social row grid)`
  - Final cascade overrides for event-row ordering are intentionally placed at the end of `styles.css` (and Android asset CSS) to prevent older duplicated rules from re-breaking desktop layout.
- Both files must stay aligned when editing this UX:
  - `index.html` + `styles.css`
  - `android/app/src/main/assets/index.html` + `android/app/src/main/assets/styles.css`

## Android build + Play Store prep

The repository includes a native Android wrapper in `android/` that loads this web app in a WebView and syncs site files into app assets on each build.

### 1) Build a debug APK (quick local install)

```bash
cd android
gradle assembleDebug
```

Expected artifact:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### 2) Configure release signing (required for Play)

Copy and fill the signing template:

```bash
cp android/keystore.properties.example android/keystore.properties
```

Then edit `android/keystore.properties` with your upload key values:

```properties
storeFile=/absolute/path/to/your-upload-keystore.jks
storePassword=...
keyAlias=...
keyPassword=...
```

> `android/keystore.properties` is git-ignored and should never be committed.
>
> Recommended: keep your upload key outside the repo (e.g. `C:/Users/<you>/upload-keys/...`) and never commit `.jks` / `.keystore` files.

Alternative: set these environment variables instead of using the file:

- `ANDROID_STORE_FILE`
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

### 3) Set app version for release

In `android/gradle.properties`:

- `YOUTH_MTL_VERSION_CODE` (must increase every Play upload)
- `YOUTH_MTL_VERSION_NAME` (human-readable version)

### 4) Build release App Bundle (.aab)

```bash
cd android
gradle bundleRelease
```

Expected artifact:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Use this `.aab` in Google Play Console (recommended flow: Internal testing track first, then Production).

### Release checklist

- [ ] Keystore configured (`keystore.properties` or env vars)
- [ ] `YOUTH_MTL_VERSION_CODE` incremented
- [ ] `gradle bundleRelease` succeeds
- [ ] Upload `.aab` to Internal testing in Play Console
- [ ] Complete Play listing/content/compliance forms
- [ ] Promote tested release to Production
