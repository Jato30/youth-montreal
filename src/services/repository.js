import { SHEETS_WEB_APP_URL } from '../config.js';
import { loadHosts as loadLocalHosts, saveHosts as saveLocalHosts } from './storage.js';

const REPORTS_KEY = 'youth-montreal-reports';
const HOST_REQUESTS_KEY = 'youth-montreal-host-requests';
const AUDIT_LOG_KEY = 'youth-montreal-audit-log';
const PENDING_SYNC_KEY = 'youth-montreal-pending-sync';
const SYNC_URL_KEY = 'youth-montreal-sheets-url';
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

function readLocalList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeLocalList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function normalizeEntry(entry) {
  return {
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...entry
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

export async function updateHostRequestStatus(id, status) {
  const list = await loadHostRequests();
  const next = list.map((item) => (item.id === id ? { ...item, status, reviewedAt: new Date().toISOString() } : item));
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
