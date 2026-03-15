import { SHEETS_WEB_APP_URL } from '../config.js';
import { loadChurches as loadLocalChurches, saveChurches as saveLocalChurches } from './storage.js';

const SUGGESTIONS_KEY = 'youth-montreal-suggestions';
const HOST_REQUESTS_KEY = 'youth-montreal-host-requests';

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
    } catch {
      // keep local even if remote fails
    }
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

export async function submitSuggestion(suggestion) {
  const list = readLocalList(SUGGESTIONS_KEY);
  list.push(suggestion);
  writeLocalList(SUGGESTIONS_KEY, list);

  if (hasRemote()) {
    try {
      await remotePost('suggestions', suggestion);
    } catch {
      // fallback local only
    }
  }
}

export async function submitHostRequest(request) {
  const list = readLocalList(HOST_REQUESTS_KEY);
  list.push(request);
  writeLocalList(HOST_REQUESTS_KEY, list);

  if (hasRemote()) {
    try {
      await remotePost('hostRequests', request);
    } catch {
      // fallback local only
    }
  }
}
