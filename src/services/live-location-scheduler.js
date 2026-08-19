import { appendAuditLog, publishLiveEventParticipantLocation } from './repository.js';

export const LIVE_LOCATION_DEFAULT_INTERVAL_MS = 180000;
export const LIVE_LOCATION_FAST_INTERVAL_MS = 30000;
export const LIVE_LOCATION_SPEED_THRESHOLD_KMH = 5;
export const LIVE_LOCATION_STALE_THRESHOLD_MS = 6 * 60 * 1000;
export const LIVE_LOCATION_REPEATED_FAILURE_THRESHOLD = 3;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function computeSpeedKmh(previous, current) {
  if (!previous?.capturedAt || !current?.capturedAt) return 0;
  const elapsedHours = (new Date(current.capturedAt).getTime() - new Date(previous.capturedAt).getTime()) / 3600000;
  if (!Number.isFinite(elapsedHours) || elapsedHours <= 0) return 0;
  const previousLat = Number(previous.lat);
  const previousLng = Number(previous.lng);
  const currentLat = Number(current.lat);
  const currentLng = Number(current.lng);
  if (![previousLat, previousLng, currentLat, currentLng].every(Number.isFinite)) return 0;

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(currentLat - previousLat);
  const deltaLng = toRadians(currentLng - previousLng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(previousLat)) * Math.cos(toRadians(currentLat)) * Math.sin(deltaLng / 2) ** 2;
  const distanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distanceKm / elapsedHours;
}

export function isLiveParticipantLocationStale(participant, now = Date.now()) {
  const capturedAt = new Date(participant?.capturedAt || participant?.lastLocationAt || '').getTime();
  return !Number.isFinite(capturedAt) || now - capturedAt > LIVE_LOCATION_STALE_THRESHOLD_MS;
}

export function createLiveLocationScheduler({ geolocation = (typeof navigator !== 'undefined' ? navigator.geolocation : null), publishLocation = publishLiveEventParticipantLocation, writeAuditLog = appendAuditLog } = {}) {
  let timer = null;
  let activeSession = null;
  let previousLocation = null;
  let consecutiveFailures = 0;

  const stopTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const audit = async (action, label) => {
    try { await writeAuditLog({ action, label }); } catch { /* audit must not block live location */ }
  };

  const scheduleNext = (intervalMs) => {
    stopTimer();
    if (activeSession) timer = setTimeout(captureAndPublish, intervalMs);
  };

  const handleFailure = async (error) => {
    consecutiveFailures += 1;
    if (consecutiveFailures >= LIVE_LOCATION_REPEATED_FAILURE_THRESHOLD) {
      await audit('live_location_repeated_failures', `${activeSession?.liveEventId || 'liveEvent'}:${error?.message || error || 'location unavailable'}`);
    }
    scheduleNext(LIVE_LOCATION_DEFAULT_INTERVAL_MS);
  };

  const captureAndPublish = async () => {
    if (!activeSession || !geolocation?.getCurrentPosition) return;
    geolocation.getCurrentPosition(async (position) => {
      const capturedAt = new Date(position.timestamp || Date.now()).toISOString();
      const currentLocation = {
        capturedAt,
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
        accuracyMeters: Number(position.coords.accuracy) || 0
      };
      const speedKmh = computeSpeedKmh(previousLocation, currentLocation);
      try {
        await publishLocation({ ...activeSession, ...currentLocation, speedKmh, latitude: currentLocation.lat, longitude: currentLocation.lng, isSharingEnabled: true });
        previousLocation = currentLocation;
        consecutiveFailures = 0;
        scheduleNext(speedKmh > LIVE_LOCATION_SPEED_THRESHOLD_KMH ? LIVE_LOCATION_FAST_INTERVAL_MS : LIVE_LOCATION_DEFAULT_INTERVAL_MS);
      } catch (error) {
        await handleFailure(error);
      }
    }, handleFailure, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  };

  return {
    start(session) {
      activeSession = { ...session };
      previousLocation = null;
      consecutiveFailures = 0;
      audit('live_sharing_started', `${activeSession.liveEventId}:${activeSession.hostId}:${activeSession.accountId}`);
      captureAndPublish();
    },
    async stop() {
      const stoppedSession = activeSession;
      stopTimer();
      activeSession = null;
      previousLocation = null;
      consecutiveFailures = 0;
      if (stoppedSession) await audit('live_sharing_stopped', `${stoppedSession.liveEventId}:${stoppedSession.hostId}:${stoppedSession.accountId}`);
    },
    getPreviousLocation: () => previousLocation,
    getConsecutiveFailures: () => consecutiveFailures
  };
}
