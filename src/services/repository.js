import { SHEETS_WEB_APP_URL } from '../config.js';
import { loadHosts as loadLocalHosts, saveHosts as saveLocalHosts } from './storage.js';

const REPORTS_KEY = 'youth-montreal-reports';
const HOST_REQUESTS_KEY = 'youth-montreal-host-requests';
const HOST_MEMBERSHIPS_KEY = 'youth-montreal-host-memberships';
const LIVE_EVENTS_KEY = 'youth-montreal-live-events';
const LIVE_EVENT_PARTICIPANTS_KEY = 'youth-montreal-live-event-participants';
const AUDIT_LOG_KEY = 'youth-montreal-audit-log';
const PENDING_SYNC_KEY = 'youth-montreal-pending-sync';
const SYNC_URL_KEY = 'youth-montreal-sheets-url';
const LEGACY_LOCAL_KEYS = {
  [REPORTS_KEY]: ['youth-montreal-suggestions'],
  [HOST_REQUESTS_KEY]: ['youth-montreal-title-requests'],
  [HOST_MEMBERSHIPS_KEY]: ['youth-montreal-hostMemberships'],
  [LIVE_EVENTS_KEY]: ['youth-montreal-liveEvents'],
  [LIVE_EVENT_PARTICIPANTS_KEY]: ['youth-montreal-liveEventParticipants']
};
const syncListeners = new Set();
const REMOTE_TIMEOUT_MS = 8000;
const REMOTE_COOLDOWN_MS = 30000;
const remoteBlockedUntilByResource = new Map();

function getRemoteUrl() {
  if (SHEETS_WEB_APP_URL && SHEETS_WEB_APP_URL.trim()) return SHEETS_WEB_APP_URL.trim();
  if (typeof window !== 'undefined') {
    const runtimeUrl = window.__SHEETS_WEB_APP_URL__ || localStorage.getItem(SYNC_URL_KEY);
    if (runtimeUrl && runtimeUrl.trim()) return runtimeUrl.trim();
  }
  return '';
}

const hasRemote = () => Boolean(getRemoteUrl());

function canAttemptRemote(resource) {
  if (!hasRemote()) return false;
  const blockedUntil = remoteBlockedUntilByResource.get(resource) || 0;
  return Date.now() >= blockedUntil;
}

function clearRemoteCooldown(resource) {
  remoteBlockedUntilByResource.delete(resource);
}

function markRemoteCooldown(resource) {
  remoteBlockedUntilByResource.set(resource, Date.now() + REMOTE_COOLDOWN_MS);
}

export function getConfiguredSyncUrl() {
  return getRemoteUrl();
}

export function setConfiguredSyncUrl(url) {
  const value = String(url || '').trim();
  if (typeof window === 'undefined') return;
  if (!value) {
    localStorage.removeItem(SYNC_URL_KEY);
    emitSyncState();
    return;
  }
  localStorage.setItem(SYNC_URL_KEY, value);
  emitSyncState();
}

function readPendingSync() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '{}');
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writePendingSync(data) {
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(data));
}

function emitSyncState() {
  const state = getSyncState();
  syncListeners.forEach((listener) => listener(state));
}

function markPending(resource, payload, errorMessage = '') {
  const pending = readPendingSync();
  pending[resource] = {
    payload,
    failedAt: new Date().toISOString(),
    errorMessage
  };
  writePendingSync(pending);
  emitSyncState();
}

function clearPending(resource) {
  const pending = readPendingSync();
  if (!pending[resource]) return;
  delete pending[resource];
  writePendingSync(pending);
  emitSyncState();
}

async function remoteGet(resource) {
  const url = `${getRemoteUrl()}?resource=${encodeURIComponent(resource)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!response.ok) throw new Error(`Remote GET failed: ${resource}`);
    const data = await response.json();
    if (data?.error) throw new Error(`Remote GET error: ${data.error}`);
    clearRemoteCooldown(resource);
    return data;
  } catch (error) {
    markRemoteCooldown(resource);
    throw error;
  }
}

async function remotePost(resource, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(getRemoteUrl(), {
      method: 'POST',
      body: JSON.stringify({ resource, payload }),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    if (!response.ok) throw new Error(`Remote POST failed: ${resource}`);
    const data = await response.json();
    if (data?.error) throw new Error(`Remote POST error: ${data.error}`);
    clearRemoteCooldown(resource);
    return data;
  } catch (error) {
    markRemoteCooldown(resource);
    throw error;
  }
}



async function remotePostJson(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(getRemoteUrl(), {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    if (!response.ok) throw new Error('Remote POST failed');
    const data = await response.json();
    if (data?.error) throw new Error(`Remote POST error: ${data.error}`);
    return data;
  } catch (error) {
    throw error;
  }
}

function readLocalList(key) {
  const saved = localStorage.getItem(key) || migrateLegacyLocalList(key);
  try {
    return JSON.parse(saved || '[]');
  } catch {
    return [];
  }
}

function writeLocalList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function migrateLegacyLocalList(key) {
  const legacyKeys = LEGACY_LOCAL_KEYS[key] || [];
  for (const legacyKey of legacyKeys) {
    const saved = localStorage.getItem(legacyKey);
    if (!saved) continue;
    localStorage.setItem(key, saved);
    localStorage.removeItem(legacyKey);
    return saved;
  }
  return '';
}

function normalizeLiveEvent(entry = {}) {
  const now = new Date().toISOString();
  const titleBase = String(entry.titleBase || entry.title || '').trim();
  return {
    id: entry.id || crypto.randomUUID(),
    title: String(entry.title || titleBase).trim(),
    titleBase,
    description: String(entry.description || ''),
    status: entry.status || 'active',
    joinCode: String(entry.joinCode || '').trim(),
    createdByAccountId: String(entry.createdByAccountId || ''),
    createdByHostId: String(entry.createdByHostId || ''),
    startedAt: entry.startedAt || now,
    endedAt: entry.endedAt || '',
    filters: entry.filters && typeof entry.filters === 'object' ? entry.filters : {}
  };
}

function normalizeLiveEventParticipant(entry = {}) {
  return {
    liveEventId: String(entry.liveEventId || ''),
    hostId: String(entry.hostId || ''),
    accountId: String(entry.accountId || ''),
    isLead: Boolean(entry.isLead),
    joinedAt: entry.joinedAt || new Date().toISOString(),
    lastLocationAt: entry.lastLocationAt || '',
    speedKmh: Number.isFinite(Number(entry.speedKmh)) ? Number(entry.speedKmh) : 0,
    isSharingEnabled: entry.isSharingEnabled !== false
  };
}

function resolveUniqueLiveEventTitle(titleBase, liveEvents, currentId = '') {
  const normalizedBase = String(titleBase || '').trim() || 'Live Event';
  const activeTitles = new Set((liveEvents || [])
    .filter((event) => event.status === 'active' && event.id !== currentId)
    .map((event) => String(event.title || '').trim().toLowerCase())
    .filter(Boolean));
  let candidate = normalizedBase;
  let suffix = 2;
  while (activeTitles.has(candidate.toLowerCase())) {
    candidate = `${normalizedBase} (${suffix})`;
    suffix += 1;
  }
  return candidate;
}

function normalizeEntry(entry) {
  const canonicalEntry = {
    ...entry,
    hostName: entry?.hostName || entry?.churchName || '',
    type: entry?.type || (entry?.targetHostId ? 'join_existing_host' : 'new_host'),
    targetHostId: entry?.targetHostId || '',
    requesterAccountId: entry?.requesterAccountId || entry?.accountId || '',
    requesterEmail: entry?.requesterEmail || entry?.email || ''
  };
  return {
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...canonicalEntry
  };
}

async function loadList(resource, localKey) {
  if (canAttemptRemote(resource)) {
    try {
      const data = await remoteGet(resource);
      const list = Array.isArray(data?.[resource]) ? data[resource].map(normalizeEntry) : [];
      writeLocalList(localKey, list);
      return list;
    } catch {
      // fallback to local cache
    }
  }
  return readLocalList(localKey).map(normalizeEntry);
}

async function saveList(resource, localKey, list) {
  writeLocalList(localKey, list);
  if (canAttemptRemote(resource)) {
    try {
      await remotePost(resource, list);
      clearPending(resource);
    } catch (error) {
      markPending(resource, list, error instanceof Error ? error.message : String(error));
    }
  }
}

export async function loadHosts() {
  if (canAttemptRemote('hosts')) {
    try {
      const data = await remoteGet('hosts');
      if (Array.isArray(data?.hosts)) {
        saveLocalHosts(data.hosts);
        return data.hosts;
      }
    } catch {
      // fallback to local cache
    }
  }
  return loadLocalHosts();
}

export async function saveHosts(hosts) {
  saveLocalHosts(hosts);
  if (canAttemptRemote('hosts')) {
    try {
      await remotePost('hosts', hosts);
      clearPending('hosts');
    } catch (error) {
      markPending('hosts', hosts, error instanceof Error ? error.message : String(error));
    }
  }
}

export async function retryPendingSync() {
  remoteBlockedUntilByResource.clear();
  if (!hasRemote()) return getSyncState();
  const pending = readPendingSync();
  const entries = Object.entries(pending);
  for (const [resource, item] of entries) {
    try {
      await remotePost(resource, item?.payload ?? []);
      clearPending(resource);
    } catch {
      // Keep pending for future retries
    }
  }
  emitSyncState();
  return getSyncState();
}

export function getSyncState() {
  const pending = readPendingSync();
  const pendingResources = Object.keys(pending);
  return {
    hasRemote: hasRemote(),
    pendingResources,
    pendingCount: pendingResources.length,
    pending
  };
}

export function subscribeSyncState(listener) {
  if (typeof listener !== 'function') return () => {};
  syncListeners.add(listener);
  listener(getSyncState());
  return () => syncListeners.delete(listener);
}

export async function loadReports() {
  return loadList('reports', REPORTS_KEY);
}

export async function loadHostRequests() {
  return loadList('hostRequests', HOST_REQUESTS_KEY);
}

export async function loadHostMemberships() {
  return loadList('hostMemberships', HOST_MEMBERSHIPS_KEY);
}

export async function saveHostMemberships(hostMemberships) {
  await saveList('hostMemberships', HOST_MEMBERSHIPS_KEY, hostMemberships);
}

export async function submitReport(report) {
  const list = await loadReports();
  list.push(normalizeEntry(report));
  await saveList('reports', REPORTS_KEY, list);
}

export async function submitHostRequest(hostRequest) {
  const list = await loadHostRequests();
  list.push(normalizeEntry(hostRequest));
  await saveList('hostRequests', HOST_REQUESTS_KEY, list);
}

export async function updateReportStatus(id, status) {
  const list = await loadReports();
  const next = list.map((item) => (item.id === id ? { ...item, status, reviewedAt: new Date().toISOString() } : item));
  await saveList('reports', REPORTS_KEY, next);
  return next;
}

export async function updateHostRequestStatus(id, status, patch = {}) {
  const list = await loadHostRequests();
  const next = list.map((item) => (item.id === id ? { ...item, ...patch, status, reviewedAt: new Date().toISOString() } : item));
  await saveList('hostRequests', HOST_REQUESTS_KEY, next);
  return next;
}

export async function loadAuditLog() {
  return readLocalList(AUDIT_LOG_KEY);
}

export async function appendAuditLog(entry) {
  const list = await loadAuditLog();
  const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry }, ...list].slice(0, 100);
  writeLocalList(AUDIT_LOG_KEY, next);
  return next;
}


export async function verifySessionToken({ role, token = '', accessCode = '' }) {
  if (!canAttemptRemote('session')) return { valid: false };
  try {
    const result = await remotePostJson({ action: 'verifySession', role, token, accessCode });
    return { valid: Boolean(result?.valid), accountId: result?.accountId || null, isAdm: Boolean(result?.isAdm), hostMembership: result?.hostMembership || null };
  } catch {
    return { valid: false };
  }
}

export async function exchangeHostAccessCode(accessCode) {
  if (!canAttemptRemote('session')) return null;
  try {
    const result = await remotePostJson({ action: 'exchangeHostAccessCode', accessCode });
    if (!result?.token) return null;
    return { token: result.token, accountId: result.accountId || null, hostMembership: result.hostMembership || null };
  } catch {
    return null;
  }
}


export async function loadLiveEvents() {
  return loadList('liveEvents', LIVE_EVENTS_KEY).then((list) => list.map(normalizeLiveEvent));
}

export async function saveLiveEvents(liveEvents) {
  await saveList('liveEvents', LIVE_EVENTS_KEY, (liveEvents || []).map(normalizeLiveEvent));
}

export async function loadLiveEventParticipants() {
  return loadList('liveEventParticipants', LIVE_EVENT_PARTICIPANTS_KEY).then((list) => list.map(normalizeLiveEventParticipant));
}

export async function saveLiveEventParticipants(participants) {
  await saveList('liveEventParticipants', LIVE_EVENT_PARTICIPANTS_KEY, (participants || []).map(normalizeLiveEventParticipant));
}

export async function createLiveEvent(liveEvent) {
  if (canAttemptRemote('liveEvents')) {
    try {
      const result = await remotePostJson({ action: 'createLiveEvent', liveEvent });
      if (result?.liveEvent) return normalizeLiveEvent(result.liveEvent);
    } catch (error) {
      markPending('liveEvents', await loadLiveEvents(), error instanceof Error ? error.message : String(error));
    }
  }
  const liveEvents = await loadLiveEvents();
  const nextLiveEvent = normalizeLiveEvent(liveEvent);
  nextLiveEvent.titleBase = nextLiveEvent.titleBase || nextLiveEvent.title;
  nextLiveEvent.title = resolveUniqueLiveEventTitle(nextLiveEvent.titleBase, liveEvents, nextLiveEvent.id);
  liveEvents.push(nextLiveEvent);
  await saveLiveEvents(liveEvents);
  return nextLiveEvent;
}

export async function joinLiveEvent({ liveEventId = '', joinCode = '', hostId = '', accountId = '', isAdm = false, isLead = false }) {
  if (canAttemptRemote('liveEvents')) {
    const result = await remotePostJson({ action: 'joinLiveEvent', liveEventId, joinCode, hostId, accountId, isAdm, isLead });
    if (result?.participant) return normalizeLiveEventParticipant(result.participant);
    throw new Error(result?.error || 'Unable to join live event');
  }
  const liveEvents = await loadLiveEvents();
  const liveEvent = liveEvents.find((event) => event.id === liveEventId && event.status === 'active');
  if (!liveEvent) throw new Error('Live event not found');
  if (!isAdm && liveEvent.joinCode !== String(joinCode || '').trim()) throw new Error('Invalid join code');
  const participants = await loadLiveEventParticipants();
  const participant = normalizeLiveEventParticipant({ liveEventId, hostId, accountId, isLead });
  const next = participants.filter((item) => !(item.liveEventId === liveEventId && item.hostId === hostId && item.accountId === accountId));
  next.push(participant);
  await saveLiveEventParticipants(next);
  return participant;
}

export async function publishLiveEventParticipantLocation({ liveEventId = '', hostId = '', accountId = '', isAdm = false, latitude, longitude, speedKmh = 0, isSharingEnabled = true }) {
  if (canAttemptRemote('liveEventParticipants')) {
    const result = await remotePostJson({ action: 'publishLiveEventParticipantLocation', liveEventId, hostId, accountId, isAdm, latitude, longitude, speedKmh, isSharingEnabled });
    if (result?.participant) return normalizeLiveEventParticipant(result.participant);
    throw new Error(result?.error || 'Unable to publish live event location');
  }
  const memberships = await loadHostMemberships();
  const isMember = memberships.some((item) => item.hostId === hostId && item.accountId === accountId && item.status !== 'revoked');
  if (!isAdm && !isMember) throw new Error('Only host members can publish this host location');
  const liveEvents = await loadLiveEvents();
  if (!liveEvents.some((event) => event.id === liveEventId && event.status === 'active')) throw new Error('Live event not found');
  const participants = await loadLiveEventParticipants();
  const index = participants.findIndex((item) => item.liveEventId === liveEventId && item.hostId === hostId && item.accountId === accountId);
  const patch = { lastLocationAt: new Date().toISOString(), latitude: Number(latitude), longitude: Number(longitude), speedKmh: Number(speedKmh) || 0, isSharingEnabled };
  const participant = normalizeLiveEventParticipant({ ...(participants[index] || { liveEventId, hostId, accountId }), ...patch });
  participant.latitude = patch.latitude;
  participant.longitude = patch.longitude;
  const next = [...participants];
  if (index >= 0) next[index] = participant; else next.push(participant);
  await saveLiveEventParticipants(next);
  return participant;
}
