/**
 * Youth Montreal Host Finder - Backend Workspace
 * Canonical resources: account, host, hostMembership, hostRequest, liveEvent, liveEventParticipant, report
 */

const RESOURCE_CONFIG = {
  accounts: {
    sheetName: 'accounts',
    resourceAliases: ['account'],
    sheetAliases: ['account']
  },
  hosts: {
    sheetName: 'hosts',
    resourceAliases: ['host', 'church', 'churches'],
    sheetAliases: ['churches']
  },
  reports: {
    sheetName: 'reports',
    resourceAliases: ['report', 'suggestion', 'suggestions'],
    sheetAliases: ['suggestions']
  },
  hostMemberships: {
    sheetName: 'hostMemberships',
    resourceAliases: ['hostmembership', 'hostmemberships', 'host membership', 'host memberships'],
    sheetAliases: ['hostmembership', 'hostmemberships', 'host membership', 'host memberships']
  },
  hostRequests: {
    sheetName: 'hostRequests',
    resourceAliases: ['hostrequest', 'hostrequests', 'title request', 'title requests', 'titlerequest', 'titlerequests'],
    sheetAliases: ['hostrequest', 'hostrequests', 'title request', 'title requests', 'titlerequest', 'titlerequests']
  },
  liveEvents: {
    sheetName: 'liveEvents',
    resourceAliases: ['liveevent', 'liveevents', 'live event', 'live events'],
    sheetAliases: ['liveevent', 'liveevents', 'live event', 'live events']
  },
  liveEventParticipants: {
    sheetName: 'liveEventParticipants',
    resourceAliases: ['liveeventparticipant', 'liveeventparticipants', 'live event participant', 'live event participants'],
    sheetAliases: ['liveeventparticipant', 'liveeventparticipants', 'live event participant', 'live event participants']
  }
};

function canonicalizeResource(resource) {
  const resourceName = String(resource || '').trim().toLowerCase();
  if (!resourceName) return '';
  const directMatch = Object.keys(RESOURCE_CONFIG).find((key) => key.toLowerCase() === resourceName);
  if (directMatch) return directMatch;
  const match = Object.keys(RESOURCE_CONFIG).find((key) =>
    RESOURCE_CONFIG[key].resourceAliases.some((alias) => alias.toLowerCase() === resourceName)
  );
  return match || '';
}

function parseSheetPayload(sheet) {
  const raw = String(sheet.getRange(2, 1).getValue() || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function ensureJsonSheet(sheet) {
  if (!sheet) return;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['data_json']);
    return;
  }
  const header = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (!header) sheet.getRange(1, 1).setValue('data_json');
}

function resolveSheet(resource, spreadsheet) {
  const canonicalResource = canonicalizeResource(resource);
  if (!canonicalResource) return null;

  const config = RESOURCE_CONFIG[canonicalResource];
  const preferredSheet = spreadsheet.getSheetByName(config.sheetName);
  let sheet = preferredSheet;

  if (!sheet) {
    sheet = [config.sheetName, ...config.sheetAliases]
      .flatMap((name) => [name, name.toLowerCase(), name.toUpperCase(), toCamelCase(name)])
      .map((name) => spreadsheet.getSheetByName(name))
      .find(Boolean) || null;
  }

  if (!sheet) {
    sheet = spreadsheet.insertSheet(config.sheetName);
  } else if (sheet.getName() !== config.sheetName && !preferredSheet) {
    sheet.setName(config.sheetName);
  }

  ensureJsonSheet(sheet);
  return { resource: canonicalResource, sheet };
}

/**
 * Run this once in Apps Script editor to initialize sheets.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(RESOURCE_CONFIG).forEach((resource) => {
    const resolved = resolveSheet(resource, ss);
    if (resolved) ensureJsonSheet(resolved.sheet);
  });
}

function doGet(e) {
  const resolved = resolveSheet(e.parameter.resource, SpreadsheetApp.getActiveSpreadsheet());
  if (!resolved) return createResponse({ error: 'Resource not found' });

  const data = parseSheetPayload(resolved.sheet);

  const result = {};
  result[resolved.resource] = data;
  return createResponse(result);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'verifySession') return createResponse(handleVerifySession(body));
    if (body.action === 'exchangeHostAccessCode') return createResponse(handleExchangeHostAccessCode(body));
    if (body.action === 'createLiveEvent') return createResponse(handleCreateLiveEvent(body));
    if (body.action === 'joinLiveEvent') return createResponse(handleJoinLiveEvent(body));
    if (body.action === 'publishLiveEventParticipantLocation') return createResponse(handlePublishLiveEventParticipantLocation(body));
    const resolved = resolveSheet(body.resource, SpreadsheetApp.getActiveSpreadsheet());
    if (!resolved) return createResponse({ error: 'Resource not found' });
    resolved.sheet.getRange(2, 1).setValue(JSON.stringify(body.payload));
    return createResponse({ success: true, resource: resolved.resource });
  } catch (err) {
    return createResponse({ error: err.toString() });
  }
}

function handleVerifySession(body) {
  if (body.role === 'adm') {
    const accounts = readResourceList('accounts');
    const account = accounts.find((item) => item.admAccessCode === body.accessCode);
    return { valid: Boolean(account), isAdm: Boolean(account && ADM_ALLOWLIST.includes(String(account.email || '').toLowerCase())), accountId: account ? account.id : null };
  }
  if (body.role === 'host') {
    const memberships = readResourceList('hostMemberships');
    const session = memberships.find((item) => item.sessionToken === body.token && item.status !== 'revoked');
    return { valid: Boolean(session), accountId: session ? session.accountId : null, hostMembership: session || null };
  }
  return { valid: false };
}

function handleExchangeHostAccessCode(body) {
  const memberships = readResourceList('hostMemberships');
  const membership = memberships.find((item) => item.hostAccessCode === body.accessCode && item.status !== 'revoked');
  if (!membership) return { valid: false };
  const token = Utilities.getUuid();
  membership.sessionToken = token;
  membership.sessionIssuedAt = new Date().toISOString();
  writeResourceList('hostMemberships', memberships);
  return { valid: true, token, accountId: membership.accountId, hostMembership: membership };
}


function normalizeLiveEvent(entry) {
  const now = new Date().toISOString();
  const titleBase = String(entry && (entry.titleBase || entry.title) || '').trim() || 'Live Event';
  return {
    id: entry && entry.id || Utilities.getUuid(),
    title: String(entry && entry.title || titleBase).trim(),
    titleBase: titleBase,
    description: String(entry && entry.description || ''),
    status: entry && entry.status || 'active',
    joinCode: String(entry && entry.joinCode || '').trim(),
    createdByAccountId: String(entry && entry.createdByAccountId || ''),
    createdByHostId: String(entry && entry.createdByHostId || ''),
    startedAt: entry && entry.startedAt || now,
    endedAt: entry && entry.endedAt || '',
    filters: entry && entry.filters && typeof entry.filters === 'object' ? entry.filters : {}
  };
}

function normalizeLiveEventParticipant(entry) {
  return {
    liveEventId: String(entry && entry.liveEventId || ''),
    hostId: String(entry && entry.hostId || ''),
    accountId: String(entry && entry.accountId || ''),
    isLead: Boolean(entry && entry.isLead),
    joinedAt: entry && entry.joinedAt || new Date().toISOString(),
    capturedAt: entry && (entry.capturedAt || entry.lastLocationAt) || '',
    lastLocationAt: entry && (entry.lastLocationAt || entry.capturedAt) || '',
    lat: Number(entry && (entry.lat || entry.latitude)) || null,
    lng: Number(entry && (entry.lng || entry.longitude)) || null,
    latitude: Number(entry && (entry.latitude || entry.lat)) || null,
    longitude: Number(entry && (entry.longitude || entry.lng)) || null,
    accuracyMeters: Number(entry && entry.accuracyMeters) || 0,
    speedKmh: Number(entry && entry.speedKmh) || 0,
    isSharingEnabled: !(entry && entry.isSharingEnabled === false)
  };
}

function resolveUniqueLiveEventTitle(titleBase, liveEvents, currentId) {
  const normalizedBase = String(titleBase || '').trim() || 'Live Event';
  const activeTitles = (liveEvents || [])
    .filter(function(event) { return event.status === 'active' && event.id !== currentId; })
    .map(function(event) { return String(event.title || '').trim().toLowerCase(); });
  let candidate = normalizedBase;
  let suffix = 2;
  while (activeTitles.indexOf(candidate.toLowerCase()) >= 0) {
    candidate = normalizedBase + ' (' + suffix + ')';
    suffix += 1;
  }
  return candidate;
}

function isAdmAccount(accountId) {
  const accounts = readResourceList('accounts');
  const account = accounts.find(function(item) { return item.id === accountId; });
  return Boolean(account && ADM_ALLOWLIST.indexOf(String(account.email || '').toLowerCase()) >= 0);
}

function isActiveHostMember(accountId, hostId) {
  const memberships = readResourceList('hostMemberships');
  return memberships.some(function(item) {
    return item.accountId === accountId && item.hostId === hostId && item.status !== 'revoked';
  });
}

function handleCreateLiveEvent(body) {
  const liveEvents = readResourceList('liveEvents').map(normalizeLiveEvent);
  const liveEvent = normalizeLiveEvent(body.liveEvent || {});
  liveEvent.titleBase = liveEvent.titleBase || liveEvent.title;
  liveEvent.title = resolveUniqueLiveEventTitle(liveEvent.titleBase, liveEvents, liveEvent.id);
  liveEvents.push(liveEvent);
  writeResourceList('liveEvents', liveEvents);
  return { success: true, liveEvent: liveEvent };
}

function handleJoinLiveEvent(body) {
  const liveEvents = readResourceList('liveEvents').map(normalizeLiveEvent);
  const liveEvent = liveEvents.find(function(event) { return event.id === body.liveEventId && event.status === 'active'; });
  if (!liveEvent) return { error: 'Live event not found' };
  const adm = Boolean(body.isAdm) || isAdmAccount(String(body.accountId || ''));
  if (!adm && liveEvent.joinCode !== String(body.joinCode || '').trim()) return { error: 'Invalid join code' };
  if (!adm && !isActiveHostMember(String(body.accountId || ''), String(body.hostId || ''))) return { error: 'Only host members can join for this host' };
  const participants = readResourceList('liveEventParticipants').map(normalizeLiveEventParticipant);
  const participant = normalizeLiveEventParticipant({ liveEventId: liveEvent.id, hostId: body.hostId, accountId: body.accountId, isLead: body.isLead });
  const next = participants.filter(function(item) {
    return !(item.liveEventId === participant.liveEventId && item.hostId === participant.hostId && item.accountId === participant.accountId);
  });
  next.push(participant);
  writeResourceList('liveEventParticipants', next);
  return { success: true, participant: participant };
}

function handlePublishLiveEventParticipantLocation(body) {
  const accountId = String(body.accountId || '');
  const hostId = String(body.hostId || '');
  const adm = Boolean(body.isAdm) || isAdmAccount(accountId);
  if (!adm && !isActiveHostMember(accountId, hostId)) return { error: 'Only host members can publish this host location' };
  const liveEvents = readResourceList('liveEvents').map(normalizeLiveEvent);
  if (!liveEvents.some(function(event) { return event.id === body.liveEventId && event.status === 'active'; })) return { error: 'Live event not found' };
  const participants = readResourceList('liveEventParticipants').map(normalizeLiveEventParticipant);
  const index = participants.findIndex(function(item) { return item.liveEventId === body.liveEventId && item.hostId === hostId && item.accountId === accountId; });
  const existing = index >= 0 ? participants[index] : null;
  const capturedAt = body.capturedAt || new Date().toISOString();
  const capturedTime = new Date(capturedAt).getTime();
  const existingTime = new Date(existing && (existing.capturedAt || existing.lastLocationAt) || 0).getTime();
  if (existing && !isNaN(existingTime) && !isNaN(capturedTime) && capturedTime <= existingTime) return { error: 'Stale or out-of-order live event location' };
  const participant = normalizeLiveEventParticipant(existing || { liveEventId: body.liveEventId, hostId: hostId, accountId: accountId });
  participant.capturedAt = capturedAt;
  participant.lastLocationAt = capturedAt;
  participant.lat = Number(body.lat || body.latitude);
  participant.lng = Number(body.lng || body.longitude);
  participant.latitude = participant.lat;
  participant.longitude = participant.lng;
  participant.accuracyMeters = Number(body.accuracyMeters) || 0;
  participant.speedKmh = Number(body.speedKmh) || 0;
  participant.isSharingEnabled = body.isSharingEnabled !== false;
  if (index >= 0) participants[index] = participant; else participants.push(participant);
  writeResourceList('liveEventParticipants', participants);
  return { success: true, participant: participant };
}

function toCamelCase(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.replace(/[-_\s]+(.)/g, (_, group) => group.toUpperCase());
}

function readResourceList(resource) {
  const resolved = resolveSheet(resource, SpreadsheetApp.getActiveSpreadsheet());
  if (!resolved) return [];
  return parseSheetPayload(resolved.sheet);
}

function writeResourceList(resource, list) {
  const resolved = resolveSheet(resource, SpreadsheetApp.getActiveSpreadsheet());
  if (!resolved) return;
  resolved.sheet.getRange(2, 1).setValue(JSON.stringify(Array.isArray(list) ? list : []));
}

function createResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

const ADM_ALLOWLIST = [
  'dmarkprogrammer@gmail.com',
  'davincicarnevale@gmail.com',
  'jato30.jato30@gmail.com',
  'danielm.b.barbosa@hotmail.com',
  'youthmontrealmvnmt@gmail.com'
];
