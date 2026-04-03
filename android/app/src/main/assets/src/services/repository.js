import { SHEETS_WEB_APP_URL } from '../config.js';
import { loadChurches as loadLocalChurches, saveChurches as saveLocalChurches } from './storage.js';

const SUGGESTIONS_KEY = 'youth-montreal-suggestions';
const HOST_REQUESTS_KEY = 'youth-montreal-host-requests';
const AUDIT_LOG_KEY = 'youth-montreal-audit-log';
const PENDING_SYNC_KEY = 'youth-montreal-pending-sync';
const syncListeners = new Set();

function getRemoteUrl() {
  if (SHEETS_WEB_APP_URL && SHEETS_WEB_APP_URL.trim()) return SHEETS_WEB_APP_URL.trim();
  if (typeof window !== 'undefined') {
    const runtimeUrl = window.__SHEETS_WEB_APP_URL__ || localStorage.getItem('youth-montreal-sheets-url');
    if (runtimeUrl && runtimeUrl.trim()) return runtimeUrl.trim();
  }
  return '';
}

const hasRemote = () => Boolean(getRemoteUrl());

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
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Remote GET failed: ${resource}`);
  const data = await response.json();
  if (data?.error) throw new Error(`Remote GET error: ${data.error}`);
  return data;
}

async function remotePost(resource, payload) {
  const response = await fetch(getRemoteUrl(), {
    method: 'POST',
    // Use a simple request body to avoid CORS preflight issues with Apps Script web apps.
    body: JSON.stringify({ resource, payload })
  });
  if (!response.ok) throw new Error(`Remote POST failed: ${resource}`);
  const data = await response.json();
  if (data?.error) throw new Error(`Remote POST error: ${data.error}`);
  return data;
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
  if (hasRemote()) {
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
  if (hasRemote()) {
    try {
      await remotePost(resource, list);
      clearPending(resource);
    } catch (error) {
      markPending(resource, list, error instanceof Error ? error.message : String(error));
    }
  }
}

export async function loadChurches() {
  if (hasRemote()) {
    try {
      const data = await remoteGet('churches');
      if (Array.isArray(data?.churches)) {
        saveLocalChurches(data.churches);
        return data.churches;
      }
    } catch {
      // fallback to local cache
    }
  }
  return loadLocalChurches();
}

export async function saveChurches(churches) {
  saveLocalChurches(churches);
  if (hasRemote()) {
    try {
      await remotePost('churches', churches);
      clearPending('churches');
    } catch (error) {
      markPending('churches', churches, error instanceof Error ? error.message : String(error));
    }
  }
}

export async function retryPendingSync() {
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

export async function loadSuggestions() {
  return loadList('suggestions', SUGGESTIONS_KEY);
}

export async function loadHostRequests() {
  return loadList('hostRequests', HOST_REQUESTS_KEY);
}

export async function submitSuggestion(suggestion) {
  const list = await loadSuggestions();
  list.push(normalizeEntry(suggestion));
  await saveList('suggestions', SUGGESTIONS_KEY, list);
}

export async function submitHostRequest(request) {
  const list = await loadHostRequests();
  list.push(normalizeEntry(request));
  await saveList('hostRequests', HOST_REQUESTS_KEY, list);
}

export async function updateSuggestionStatus(id, status) {
  const list = await loadSuggestions();
  const next = list.map((item) => (item.id === id ? { ...item, status, reviewedAt: new Date().toISOString() } : item));
  await saveList('suggestions', SUGGESTIONS_KEY, next);
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
