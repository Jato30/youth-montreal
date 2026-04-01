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

## Run locally (web)

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

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
