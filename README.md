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


If browser console shows `ReferenceError: autofillChurchAddress is not defined`, clear site cache / hard-refresh to load the latest JS bundle where the listener now uses `autofillHostAddress`.
Host edit form hidden id field is now canonical: `hostId` (no `churchId` fallback).

### Terminology migration compatibility (merge-readiness)

Internal code now standardizes on:

- `host` (instead of church/place/organizer internals)
- `event`
- `report`
- `hostRequest`
- Host form field names are canonicalized to `hostId` and `hostName`.

Source-of-truth note:

- Web source files at the repo root (`index.html`, `styles.css`, `src/**`) are the source of truth.
- Android assets under `android/app/src/main/assets` are generated from those files by Gradle task `syncWebAssets` before Android builds.
- If web works but Android still looks stale, rebuild the Android project so the asset sync runs.

Compatibility now focuses on persisted data instead of code aliases:

- Local storage auto-migrates `youth-montreal-churches` -> `youth-montreal-hosts`.
- Apps Script accepts legacy resource names like `churches`, `suggestions`, and `titleRequests`, then resolves them to canonical `hosts`, `reports`, and `hostRequests`.
- If an old sheet tab exists with a legacy name and the canonical tab does not exist yet, Apps Script renames the tab to the canonical name.
- User-facing labels can still say church/event/report variants through `src/i18n.js`, depending on context.

### Apps Script resource mapping requirement

The frontend syncs using canonical resources: `hosts`, `reports`, and `hostRequests`.

Your Apps Script backend must resolve those resources to sheet tabs:

- `hosts` -> `hosts`
- `reports` -> `reports`
- `hostRequests` -> `hostRequests`

Without those canonical resources, reads/writes can fail for host data and leave sync pending forever.

Note: backend GET now auto-creates missing tabs with `data_json` header and returns an empty list, so a missing `reports`/`hostRequests` tab no longer blocks loading `hosts`.

Backend normalization hardening now also:
- accepts resource aliases case-insensitively (for example `HostRequests`, `title requests`, `churches`),
- tries legacy sheet-name variants (`hostRequest`, `hostrequests`, `titleRequests`, etc.) before creating a new canonical tab,
- safely handles blank/corrupted JSON payload rows by returning `[]` instead of throwing parse errors.

Migration tip (required when moving from old builds):
- Google Sheets: preferred tab names are `hosts`, `reports`, and `hostRequests`.
- Browser local data: the app will migrate `youth-montreal-churches` automatically on next load.
- Host request payloads are now canonicalized to `hostName`, but older records using `churchName` still load.

### Apps Script CORS gotcha

For POST writes, this project now sends a **simple request body** (no custom JSON header) to avoid browser CORS preflight failures against Apps Script web apps.  
If you reintroduce custom `Content-Type: application/json`, some deployments may stop accepting browser writes.

### Authentication transition note

- Host/ADM passcode prompts are replaced by email/password login prompts.
- ADM login is restricted to an allowlist of ADM emails in `src/services/auth.js`.
- Host signup now creates a host account and automatically submits a canonical `hostRequest`. Applicants can request a `new_host` or `join_existing_host` by searching the existing host name/address.
- Host requests persist `type`, `targetHostId`, `requesterAccountId`/`requesterEmail`, and `status` so ADM review can distinguish new registrations from membership joins.
- Host account activation happens only after ADM approval of the host request. Approving `join_existing_host` creates a `hostMembership` for the requester and existing host without creating another host location entry.
- Rejected host emails are blocked from re-requesting the same target host for 30 days, and only one pending request per email per target host is allowed.
- Current implementation is client-side/localStorage based; production rollout should move credential checks to a dedicated backend identity provider.

### Startup sync deadlock guard

Initialization now uses a bounded retry window for startup sync and always clears the loading overlay in a `finally` block.  
If cloud calls stall/fail, the UI falls back to available local data instead of staying blocked behind the loader.

### Duplicate-host protection (ADM + host workspace)

- Host saves now run a duplicate analysis before persist.
- Duplicate identity is detected primarily from normalized address (accent-insensitive + compact address normalization), with a coordinate/name fallback for near-identical pins.
- If a duplicate is detected, save is blocked and the UI points to the existing host entry.
- Startup and live-sync host loads are deduplicated automatically, and cleaned data is persisted back to storage/cloud to avoid repeat duplicates across devices.

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

## Privacy Policy for Google Play

This repository now includes:

- `PRIVACY_POLICY.md` (editable source text)
- `privacy-policy.html` (ready-to-publish static page)

### Recommended publish flow (GitHub Pages)

1. Push this repository to GitHub.
2. In GitHub: **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your default branch), folder `/ (root)`
4. Save and wait for deployment.
5. Your policy URL will be similar to:
   - `https://<username>.github.io/<repo>/privacy-policy.html`
6. Open the URL in an incognito window to verify it is publicly accessible.
7. Paste that URL in Google Play Console (App content → Privacy policy).

### Before publishing

- Replace placeholder contact email/address in both files.
- Keep Play Console Data Safety answers aligned with policy content (location + calendar permissions and purposes).
- [ ] Promote tested release to Production


## Backend identity and canonical entities

Auth is now backend-validated and localStorage is no longer treated as the authority for ADM/HOST access decisions.

Canonical backend entities used by the Apps Script backend and sync contract:
- `account`
- `host`
- `hostMembership`
- `hostRequest`
- `liveEvent`
- `liveEventParticipant`
- `report`

`hostMembership` supports many accounts managing one host without creating duplicate host map pins. Approved memberships all render the same host profile in the workspace; only `new_host` approvals create a new host location entry. ADM authority is enforced with a server-side allowlist in Apps Script (`google-sheets-backend.gs`).

### Live event backend contract

Live event collaboration is persisted with two canonical backend resources. `liveEvent` rows use only these canonical fields for the event itself: `id`, `title`, `titleBase`, `description`, `status`, `joinCode`, `createdByAccountId`, `createdByHostId`, `startedAt`, `endedAt`, and `filters`. Active live event titles are unique; when a new active event reuses an active title, the backend assigns the next available suffix such as `Title (2)` or `Title (3)` and returns the assigned `title` to the UI.

`liveEventParticipant` rows use these canonical fields: `liveEventId`, `hostId`, `accountId`, `isLead`, `joinedAt`, `lastLocationAt`, `speedKmh`, and `isSharingEnabled`. Hosts join active live events with `joinCode`; ADMs can join any active live event without a code. Location publishing must always be validated by the backend: the publishing account must be an active member of the host, unless the account is an ADM.

While Apps Script remains the temporary backend, `src/services/google-sheets-backend.gs` owns resource resolution for both `liveEvents` and `liveEventParticipants`, plus the `createLiveEvent`, `joinLiveEvent`, and `publishLiveEventParticipantLocation` actions. The web adapter in `src/services/repository.js` mirrors those operations locally for offline fallback and sends the same actions to Apps Script when a sync URL is configured.

### Live event participant location sharing

Live event participant location sharing uses canonical backend terms: `liveEvent` and `liveEventParticipant`. The client-side scheduler lives in `src/services/live-location-scheduler.js` and should be started only after a host member/admin explicitly begins live sharing. It captures `capturedAt`, `lat`, `lng`, `speedKmh`, and `accuracyMeters` for each update. The scheduler keeps the previous coordinate and timestamp locally to compute speed; it publishes every 180 seconds by default and temporarily switches to every 30 seconds when computed speed is greater than 5 km/h.

The backend endpoint `publishLiveEventParticipantLocation` in `src/services/google-sheets-backend.gs` rejects stale or out-of-order participant updates by comparing the submitted `capturedAt` against the stored participant timestamp, then stores the latest location on the matching `liveEventParticipant`. Map code can call `isLiveParticipantLocationStale` from the scheduler module and `liveParticipantMarkerOptions` from `src/ui/mapView.js` to downgrade participant markers when the most recent update is older than six minutes. The scheduler writes audit actions for `live_sharing_started`, `live_sharing_stopped`, and repeated location failures (`live_location_repeated_failures`).
