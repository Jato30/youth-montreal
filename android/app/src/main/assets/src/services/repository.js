import { SHEETS_WEB_APP_URL } from '../config.js';
import { loadChurches as loadLocalChurches, saveChurches as saveLocalChurches } from './storage.js';

const SUGGESTIONS_KEY = 'youth-montreal-suggestions';
const HOST_REQUESTS_KEY = 'youth-montreal-host-requests';
const AUDIT_LOG_KEY = 'youth-montreal-audit-log';

const hasRemote = () => Boolean(SHEETS_WEB_APP_URL && SHEETS_WEB_APP_URL.trim());

async function remoteGet(resource) {
  const url = `${SHEETS_WEB_APP_URL}?resource=${encodeURIComponent(resource)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Remote GET failed: ${resource}`);
  return response.json();
}

async function remotePost(resource, payload) {
  const response = await fetch(SHEETS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, payload })
  });
  if (!response.ok) throw new Error(`Remote POST failed: ${resource}`);
  return response.json();
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
    } catch {
      // keep local even if remote fails
    }
  }
}

export async function loadChurches() {
  if (hasRemote()) {
    try {
      const data = await remoteGet('hosts');
      if (Array.isArray(data?.hosts)) {
        saveLocalChurches(data.hosts);
        return data.hosts;
      }
    } catch {
      // fallback to local cache
    }
  }
  return loadLocalChurches();
}

export async function saveChurches(hosts) {
  saveLocalChurches(hosts);
  if (hasRemote()) {
    try {
      await remotePost('hosts', hosts);
    } catch {
      // keep local even if remote fails
    }
  }
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
