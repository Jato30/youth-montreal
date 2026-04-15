import { LANGUAGE_KEY, STORAGE_KEY } from './config.js';
import { appendAuditLog, getConfiguredSyncUrl, getSyncState, loadAuditLog, loadHosts, loadHostRequests, loadReports, retryPendingSync, saveHosts, setConfiguredSyncUrl, subscribeSyncState, submitHostRequest, submitReport } from './services/repository.js';
import { createMap, renderMarkers, resetMapView } from './ui/mapView.js';
import { renderHostDetails } from './ui/detailsView.js';
import { attachAdminController } from './controllers/adminController.js';
import { attachFinderController } from './controllers/finderController.js';
import { renderCalendarList } from './ui/calendarView.js';
import { applyLanguage, TRANSLATIONS, t } from './i18n.js';
import { dedupeHosts } from './utils/hostDedup.js';

const elements = {
  details: document.querySelector('#details'),
  emptyState: document.querySelector('#empty-state'),
  finderStatus: document.querySelector('#finder-status'),
  adminPanel: document.querySelector('#admin-panel'),
  adminTitle: document.querySelector('#admin-title'),
  adminStatus: document.querySelector('#admin-status'),
  reportsQueue: document.querySelector('#reports-queue'),
  hostRequestsQueue: document.querySelector('#host-requests-queue'),
  toggleAdmin: document.querySelector('#toggle-admin'),
  toggleHost: document.querySelector('#toggle-host'),
  addHostButton: document.querySelector('#add-host'),
  workspaceAddEventButton: document.querySelector('#workspace-add-event'),
  hostForm: document.querySelector('#host-form'),
  eventsList: document.querySelector('#events-list'),
  eventTemplate: document.querySelector('#event-template'),
  addEventButton: document.querySelector('#add-event'),
  cancelEditButton: document.querySelector('#cancel-edit'),
  languageSelect: document.querySelector('#language-select'),
  finderForm: document.querySelector('#finder-form'),
  finderAddress: document.querySelector('#finder-address'),
  mapFilterLanguage: document.querySelector('#map-filter-language'),
  mapFilterType: document.querySelector('#map-filter-type'),
  mapFilterAge: document.querySelector('#map-filter-age'),
  mapApply: document.querySelector('#map-apply'),
  mapClear: document.querySelector('#map-clear'),
  calendarKeyword: document.querySelector('#calendar-keyword'),
  calendarType: document.querySelector('#calendar-type'),
  calendarLanguage: document.querySelector('#calendar-language'),
  calendarAge: document.querySelector('#calendar-age'),
  calendarFrom: document.querySelector('#calendar-from'),
  calendarTo: document.querySelector('#calendar-to'),
  calendarApply: document.querySelector('#calendar-apply'),
  calendarList: document.querySelector('#calendar-list'),
  calendarCount: document.querySelector('#calendar-count'),
  calendarToggleFilters: document.querySelector('#calendar-toggle-filters'),
  calendarModeButtons: Array.from(document.querySelectorAll('[data-calendar-mode]')),
  contactForm: document.querySelector('#contact-form'),
  contactFormPanel: document.querySelector('#contact-form-panel'),
  contactStatus: document.querySelector('#contact-status'),
  titleRequestForm: document.querySelector('#title-request-form'),
  titleRequestStatus: document.querySelector('#title-request-status'),
  titleRequestPanel: document.querySelector('#title-request-panel'),
  titleRequestCancel: document.querySelector('#title-request-cancel'),
  toggleTitleRequest: document.querySelector('#toggle-title-request'),
  hostManagerSearch: document.querySelector('#host-manager-search'),
  hostSearchWrap: document.querySelector('#host-search-wrap'),
  toggleHostSearch: document.querySelector('#toggle-host-search'),
  hostManagerList: document.querySelector('#host-manager-list'),
  eventManagerSearch: document.querySelector('#event-manager-search'),
  eventManagerList: document.querySelector('#event-manager-list'),
  workspaceEventModeButtons: Array.from(document.querySelectorAll('[data-workspace-event-mode]')),
  workspaceEventsPrev: document.querySelector('#workspace-events-prev'),
  workspaceEventsNext: document.querySelector('#workspace-events-next'),
  workspaceEventsPage: document.querySelector('#workspace-events-page'),
  workspaceModeration: document.querySelector('#workspace-moderation'),
  moderationTabs: document.querySelector('#moderation-tabs'),
  moderationTabButtons: Array.from(document.querySelectorAll('[data-moderation-view]')),
  workspaceViewButtons: Array.from(document.querySelectorAll('[data-workspace-view]')),
  workspacePlacesView: document.querySelector('#workspace-places-view'),
  workspaceEventsView: document.querySelector('#workspace-events-view'),
  myHostSection: document.querySelector('#my-host'),
  workspaceStatus: document.querySelector('#workspace-status'),
  auditLogList: document.querySelector('#audit-log-list'),
  exportDataButton: document.querySelector('#export-data'),
  importDataInput: document.querySelector('#import-data'),
  hardeningPanel: document.querySelector('#hardening-panel'),
  legalButtons: Array.from(document.querySelectorAll('.footer-link')),
  staticPages: Array.from(document.querySelectorAll('.static-page')),
  mapViewPanel: document.querySelector('#map-view-panel'),
  calendarViewPanel: document.querySelector('#calendar-view-panel'),
  findViewButtons: Array.from(document.querySelectorAll('[data-find-view]')),
  calendarModeToggle: document.querySelector('#calendar-mode-toggle'),
  publicMapSlot: document.querySelector('#public-map-slot'),
  editorMapSlot: document.querySelector('#editor-map-slot'),
  editorContext: document.querySelector('#editor-context'),
  saveEditButton: document.querySelector('#save-edit'),
  deleteEditingItemButton: document.querySelector('#delete-editing-item'),
  menuToggle: document.querySelector('#menu-toggle'),
  siteHeader: document.querySelector('.site-header'),
  radiusInput: document.querySelector('#finder-radius'),
  calendarDayNav: document.querySelector('#calendar-day-nav'),
  calPrevDay: document.querySelector('#cal-prev-day'),
  calToday: document.querySelector('#cal-today'),
  calNextDay: document.querySelector('#cal-next-day'),
  syncStatus: document.querySelector('#sync-status'),
  loadingOverlay: document.querySelector('#app-loading-overlay')
};

const state = {
  hosts: [],
  reports: [],
  hostRequests: [],
  auditLog: [],
  markers: new Map(),
  filteredIds: null,
  mapFilteredIds: null,
  language: localStorage.getItem(LANGUAGE_KEY) || 'en',
  selectedHostId: null,
  editorMode: 'host',
  editingEventIndex: null,
  lastFinderPoint: null,
  onMapHostSelect: null,
  isAdminMode: false,
  isHostMode: false,
  activeHostId: null,
  calendarAnchorDate: new Date()
};

const map = createMap();

function setupMapResizeSupport() {
  const refreshMapSize = () => {
    requestAnimationFrame(() => map.invalidateSize());
  };

  [elements.publicMapSlot, elements.editorMapSlot].forEach((slot) => {
    if (!slot) return;
    slot.addEventListener('mouseup', refreshMapSize);
    slot.addEventListener('touchend', refreshMapSize, { passive: true });
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(refreshMapSize);
    if (elements.publicMapSlot) observer.observe(elements.publicMapSlot);
    if (elements.editorMapSlot) observer.observe(elements.editorMapSlot);
  }

  window.addEventListener('resize', refreshMapSize);
}

function scrollToSection(targetId) {
  document.querySelector(`#${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCalendarList() {
  renderCalendarList({
    state,
    elements,
    onSuggestEventUpdate: openEventSuggestion,
    onEditEvent: editCalendarEvent,
    onDeleteEvent: deleteCalendarEvent,
    onOpenDay: (day) => {
      state.calendarAnchorDate = new Date(day);
      elements.calendarMode = { value: 'daily' };
      elements.calendarModeButtons.forEach((item) => item.classList.toggle('active', item.dataset.calendarMode === 'daily'));
      updateCalendarList();
    }
  });
}

function showFindView(mode) {
  const showMap = mode === 'map';
  elements.findViewButtons.forEach((button) => button.classList.toggle('active', button.dataset.findView === mode));
  elements.mapViewPanel.classList.toggle('hidden', !showMap);
  elements.calendarViewPanel.classList.toggle('hidden', showMap);
  elements.calendarModeToggle.classList.toggle('hidden', showMap);
  elements.staticPages.forEach((page) => page.classList.add('hidden'));

  if (showMap) {
    map.invalidateSize();
  } else {
    updateCalendarList();
  }
}

function showStaticPage(targetId) {
  elements.staticPages.forEach((page) => page.classList.toggle('hidden', page.id !== targetId));
  scrollToSection(targetId);
}

function openPlaceSuggestion(host) {
  scrollToSection('contact-us');
  if (elements.titleRequestPanel) elements.titleRequestPanel.classList.add('hidden');
  if (elements.contactForm) {
    elements.contactForm.elements.subject.value = `${t(state, 'suggestPlaceUpdate')}: ${host.name}`;
    elements.contactForm.elements.message.value = '';
    elements.contactForm.elements.message.placeholder = t(state, 'contactMessagePrompt');
    elements.contactForm.elements.message.focus();
  }
}

function openEventSuggestion(host, eventData) {
  scrollToSection('contact-us');
  if (elements.titleRequestPanel) elements.titleRequestPanel.classList.add('hidden');
  if (elements.contactForm) {
    elements.contactForm.elements.subject.value = `${t(state, 'suggestEventUpdate')}: ${host.name} — ${eventData.type}`;
    elements.contactForm.elements.message.value = '';
    elements.contactForm.elements.message.placeholder = t(state, 'contactMessagePrompt');
    elements.contactForm.elements.message.focus();
  }
}

const renderDetails = (host, onEdit) => {
  renderHostDetails({
    state,
    host,
    detailsElement: elements.details,
    emptyStateElement: elements.emptyState,
    onEdit,
    onSuggestPlaceUpdate: openPlaceSuggestion,
    onSuggestEventUpdate: openEventSuggestion
  });
};

let startEditHost = () => {};
let renderModeration = () => {};
let renderHostManager = () => {};

async function deleteCalendarEvent(row) {
  if (!confirm(t(state, 'deleteEventConfirm'))) return;
  const host = state.hosts.find((item) => item.id === row.hostId);
  if (!host) return;
  const index = Number.isInteger(row.eventIndex) ? row.eventIndex : (host.events || []).findIndex((event) => event.date === row.date && event.time === row.time && event.type === row.type);
  if (index < 0) return;
  host.events.splice(index, 1);
  try {
    await saveHosts(state.hosts);
  } catch {
    elements.workspaceStatus.textContent = t(state, 'remoteSaveFailed');
    return;
  }
  state.auditLog = await appendAuditLog({ action: 'event_deleted', label: `${host.name}:${row.type}` });
  rerenderMarkers();
  renderAuditLog();
  updateCalendarList();
}

function editCalendarEvent(row) {
  startEditHost(row.hostId, { eventIndex: row.eventIndex });
  scrollToSection('my-host');
}

const rerenderMarkers = () =>
  renderMarkers({
    map,
    state,
    onSelectHost: (host) => {
      if (typeof state.onMapHostSelect === 'function') {
        state.onMapHostSelect(host);
        return;
      }
      state.selectedHostId = (state.selectedHostId === host.id) ? null : host.id;
      if (state.selectedHostId) {
        renderDetails(host, startEditHost);
      } else {
        elements.details.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
      }
      rerenderMarkers(); // Update pin colors
    }
  });

function renderAuditLog() {
  if (!elements.auditLogList) return;
  elements.auditLogList.innerHTML = state.auditLog.length
    ? state.auditLog
        .map(
          (item) => `<li><strong>${item.action}</strong> — ${item.label || ''} <span class="help-text">${new Date(item.createdAt).toLocaleString('en-CA')}</span></li>`
        )
        .join('')
    : `<li class="help-text">${t(state, 'noAuditLog')}</li>`;
}

function setupCalendar() {
  const today = new Date();
  state.calendarAnchorDate = new Date(today);

  elements.calendarFrom.value = '';
  elements.calendarTo.value = '';

  elements.calendarApply.addEventListener('click', () => {
    state.calendarAnchorDate = elements.calendarFrom.value ? new Date(elements.calendarFrom.value) : new Date();
    updateCalendarNavLabel();
    updateCalendarList();
  });

  elements.calendarToggleFilters.addEventListener('click', () => {
    elements.calendarList.closest('.calendar-layout').classList.toggle('show-calendar-filters');
  });

  elements.calendarModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      elements.calendarModeButtons.forEach((item) => item.classList.toggle('active', item === button));
      elements.calendarMode = { value: button.dataset.calendarMode };

      const isDaily = button.dataset.calendarMode === 'daily';
      elements.calendarDayNav.classList.remove('hidden');
      updateCalendarNavLabel();

      updateCalendarList();
    });
  });

  const getMode = () => elements.calendarMode?.value || 'daily';
  const stepAnchor = (direction) => {
    const mode = getMode();
    if (mode === 'daily') state.calendarAnchorDate.setDate(state.calendarAnchorDate.getDate() + direction);
    if (mode === 'weekly') state.calendarAnchorDate.setDate(state.calendarAnchorDate.getDate() + (7 * direction));
    if (mode === 'monthly') state.calendarAnchorDate.setMonth(state.calendarAnchorDate.getMonth() + direction);
    updateCalendarNavLabel();
  };

  function updateCalendarNavLabel() {
    const labelNode = document.querySelector('#cal-current-label');
    if (!labelNode) return;
    const mode = getMode();
    if (mode === 'daily') labelNode.textContent = state.calendarAnchorDate.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
    if (mode === 'weekly') labelNode.textContent = state.calendarAnchorDate.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
    if (mode === 'monthly') labelNode.textContent = state.calendarAnchorDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  }

  elements.calPrevDay.addEventListener('click', () => {
    stepAnchor(-1);
    updateCalendarList();
  });
  elements.calNextDay.addEventListener('click', () => {
    stepAnchor(1);
    updateCalendarList();
  });
  elements.calToday.addEventListener('click', () => {
    state.calendarAnchorDate = new Date();
    updateCalendarNavLabel();
    updateCalendarList();
  });

  elements.calendarMode = { value: 'daily' };
  elements.calendarDayNav.classList.remove('hidden');
  updateCalendarNavLabel();
}

function setupSyncStatus() {
  if (!elements.syncStatus) return;

  const updateSyncStatus = (syncState = getSyncState()) => {
    const { hasRemote, pendingCount } = syncState;
    const activeUrl = getConfiguredSyncUrl();
    elements.syncStatus.classList.remove('sync-local', 'sync-pending', 'sync-ok');
    if (!hasRemote) {
      elements.syncStatus.classList.add('sync-local');
      elements.syncStatus.textContent = t(state, 'syncLocalOnly');
      elements.syncStatus.title = t(state, 'syncLocalOnlyHint');
      return;
    }
    if (pendingCount > 0) {
      elements.syncStatus.classList.add('sync-pending');
      elements.syncStatus.textContent = `${t(state, 'syncPending')} (${pendingCount})`;
      elements.syncStatus.title = `${t(state, 'syncPendingHint')}${activeUrl ? `\n${t(state, 'syncEndpoint')}: ${activeUrl}` : ''}`;
      return;
    }
    elements.syncStatus.classList.add('sync-ok');
    elements.syncStatus.textContent = t(state, 'syncUpToDate');
    elements.syncStatus.title = `${t(state, 'syncUpToDateHint')}${activeUrl ? `\n${t(state, 'syncEndpoint')}: ${activeUrl}` : ''}`;
  };

  elements.syncStatus.addEventListener('click', async () => {
    const syncState = getSyncState();
    if (!syncState.hasRemote) {
      const url = prompt(t(state, 'enterSyncUrlPrompt'), getConfiguredSyncUrl() || '');
      if (url === null) return;
      setConfiguredSyncUrl(url);
      if (!String(url || '').trim()) return;
    }
    await retryPendingSync();
  });
  elements.syncStatus.addEventListener('sync-refresh', () => updateSyncStatus());
  subscribeSyncState(updateSyncStatus);
  window.addEventListener('online', () => retryPendingSync());
}

function setupMapFilters(finderController) {
  const syncRadiusLabel = () => {
    const radiusKm = Number(elements.finderForm.elements.radiusKm.value);
    const label = radiusKm < 1 ? `${Math.round(radiusKm * 1000)} m` : `${radiusKm.toFixed(radiusKm < 10 ? 1 : 0)} km`;
    document.querySelector('#finder-radius-value').textContent = label;
  };

  const matchesMapFilters = (host) => {
    const language = elements.mapFilterLanguage.value.trim().toLowerCase();
    const eventType = elements.mapFilterType.value.trim().toLowerCase();
    const ageGroup = elements.mapFilterAge.value;

    const byLanguage = !language || (host.languages || []).join(' ').toLowerCase().includes(language);
    const byEventType = !eventType || (host.events || []).some((event) => (event.type || '').toLowerCase().includes(eventType));
    const byAge = !ageGroup || (host.events || []).some((event) => (event.ageGroup || 'all') === ageGroup);

    return byLanguage && byEventType && byAge;
  };

  const applyMapFilters = async () => {
    const matches = state.hosts.filter(matchesMapFilters);
    state.mapFilteredIds = new Set(matches.map((host) => host.id));
    const address = elements.finderAddress.value.trim();
    if (address) {
      await finderController.applyLocationFilter({ shouldGeocode: !state.lastFinderPoint || state.lastFinderPoint.query !== address });
    } else {
      state.filteredIds = null;
      rerenderMarkers();
    }
    elements.finderStatus.textContent = `${matches.length} ${t(state, 'hostsMatchingFilters')}`;
  };

  elements.mapApply.addEventListener('click', applyMapFilters);
  elements.mapClear.addEventListener('click', () => {
    elements.finderForm.reset();
    elements.mapFilterLanguage.value = '';
    elements.mapFilterType.value = '';
    elements.mapFilterAge.value = '';
    state.mapFilteredIds = null;
    finderController.clearLocationFilter();
    syncRadiusLabel();
    resetMapView(map);
    state.selectedHostId = null;
    elements.details.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    rerenderMarkers();
  });

  elements.radiusInput.addEventListener('change', applyMapFilters);
  elements.finderForm.elements.radiusKm.addEventListener('input', syncRadiusLabel);
  syncRadiusLabel();
}

function setupPublicForms() {
  const toggleTitleRequestMode = (showTitleRequest) => {
    elements.contactFormPanel.classList.toggle('hidden', showTitleRequest);
    elements.titleRequestPanel.classList.toggle('hidden', !showTitleRequest);
  };

  elements.contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.contactForm).entries());
    await submitReport({ id: crypto.randomUUID(), type: 'contact', ...data, createdAt: new Date().toISOString() });
    state.reports = await loadReports();
    state.auditLog = await appendAuditLog({ action: 'report_submitted', label: data.subject || 'contact' });
    elements.contactForm.reset();
    elements.contactStatus.textContent = t(state, 'reportSubmitted');
    renderAuditLog();
    if (state.isAdminMode || state.isHostMode) renderModeration();
  });

  elements.toggleTitleRequest?.addEventListener('click', () => {
    toggleTitleRequestMode(true);
    if (!elements.titleRequestPanel.classList.contains('hidden')) {
      elements.titleRequestForm.elements.fullName.focus();
    }
  });

  elements.titleRequestCancel?.addEventListener('click', () => {
    toggleTitleRequestMode(false);
    elements.titleRequestStatus.textContent = '';
  });

  elements.titleRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.titleRequestForm).entries());
    await submitHostRequest({ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() });
    state.hostRequests = await loadHostRequests();
    state.auditLog = await appendAuditLog({ action: 'title_request_submitted', label: data.hostName || 'host request' });
    elements.titleRequestForm.reset();
    elements.titleRequestStatus.textContent = t(state, 'hostRequestSubmitted');
    toggleTitleRequestMode(false);
    renderAuditLog();
    if (state.isAdminMode) renderModeration();
  });
}

function setupHardeningTools() {
  elements.exportDataButton?.addEventListener('click', async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      hosts: state.hosts,
      reports: state.reports,
      hostRequests: state.hostRequests,
      auditLog: state.auditLog
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'youth-montreal-backup.json';
    link.click();
    URL.revokeObjectURL(url);
    state.auditLog = await appendAuditLog({ action: 'backup_exported', label: 'JSON export' });
    renderAuditLog();
  });

  elements.importDataInput?.addEventListener('change', async () => {
    const file = elements.importDataInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data.hosts)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.hosts));
      state.auditLog = await appendAuditLog({ action: 'backup_imported', label: file.name });
      location.reload();
    }
  });
}

function setupNavigation() {
  elements.findViewButtons.forEach((button) => {
    button.addEventListener('click', () => showFindView(button.dataset.findView));
  });

  elements.legalButtons.forEach((button) => {
    button.addEventListener('click', () => showStaticPage(button.dataset.target));
  });
}

function setupMobileMenu() {
  elements.menuToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = elements.siteHeader.classList.toggle('menu-open');
    elements.menuToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (elements.siteHeader.classList.contains('menu-open') && !elements.siteHeader.contains(e.target)) {
      elements.siteHeader.classList.remove('menu-open');
      elements.menuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close menu when clicking links
  elements.siteHeader.querySelectorAll('.header-nav a').forEach(link => {
    link.addEventListener('click', () => {
      elements.siteHeader.classList.remove('menu-open');
      elements.menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu when clicking buttons (like host/adm mode)
  elements.siteHeader.querySelectorAll('.header-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.siteHeader.classList.remove('menu-open');
      elements.menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function setupScrollHeader() {
  let lastScroll = 0;
  const header = elements.siteHeader;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll <= 0) {
      header.classList.remove('header-hidden');
      return;
    }

    if (currentScroll > lastScroll && !header.classList.contains('header-hidden')) {
      // scroll down
      header.classList.add('header-hidden');
    } else if (currentScroll < lastScroll && header.classList.contains('header-hidden')) {
      // scroll up
      header.classList.remove('header-hidden');
    }
    lastScroll = currentScroll;
  });
}

/**
 * Polling logic for live sync
 */
function setupAutoSync() {
  setInterval(async () => {
    // Only auto-sync if we are NOT in the middle of editing something
    if (document.body.classList.contains('editing-mode')) return;

    const remoteHosts = await loadHosts();
    const dedupedRemote = dedupeHosts(remoteHosts).deduped;

    // Check if anything actually changed
    if (JSON.stringify(dedupedRemote) !== JSON.stringify(state.hosts)) {
      state.hosts = dedupedRemote;
      rerenderMarkers();
      updateCalendarList();
      renderHostManager();
      console.log('Live sync: Data updated from remote.');
    }
  }, 60000); // Check every 60 seconds
}

async function init() {
  elements.loadingOverlay?.classList.remove('hidden');
  try {
    await Promise.race([
      retryPendingSync(),
      new Promise((resolve) => setTimeout(resolve, 9000))
    ]);
    const [hosts, reports, hostRequests, auditLog] = await Promise.all([
      loadHosts(),
      loadReports(),
      loadHostRequests(),
      loadAuditLog()
    ]);
    const dedupedHostsResult = dedupeHosts(hosts);
    state.hosts = dedupedHostsResult.deduped;
    state.reports = reports;
    state.hostRequests = hostRequests;
    state.auditLog = auditLog;

    if (dedupedHostsResult.removed.length) {
      await saveHosts(state.hosts);
      state.auditLog = await appendAuditLog({
        action: 'hosts_deduplicated',
        label: `${dedupedHostsResult.removed.length} duplicate host entries removed`
      });
    }

    const adminController = attachAdminController({
      state,
      map,
      elements,
      renderMarkers: () => rerenderMarkers(),
      renderHostDetails: (host, onEdit) => renderDetails(host, onEdit)
    });
    startEditHost = adminController.startEditHost;
    renderModeration = adminController.renderModeration;
    renderHostManager = adminController.renderHostManager;

    const finderController = attachFinderController({
      state,
      map,
      elements,
      renderMarkers: () => rerenderMarkers(),
      renderHostDetails: (host) => renderDetails(host, startEditHost)
    });

    elements.languageSelect.value = TRANSLATIONS[state.language] ? state.language : 'en';
    elements.languageSelect.addEventListener('change', () => {
      state.language = elements.languageSelect.value;
      applyLanguage(state, elements, () => {
        const host = state.hosts.find((item) => item.id === state.selectedHostId);
        if (host) renderDetails(host, startEditHost);
        renderModeration();
        renderHostManager();
        renderAuditLog();
      });
      elements.syncStatus?.dispatchEvent(new Event('sync-refresh'));
    });

    setupNavigation();
    setupMapResizeSupport();
    setupCalendar();
    setupSyncStatus();
    setupMapFilters(finderController);
    setupPublicForms();
    setupHardeningTools();
    setupMobileMenu();
    setupScrollHeader();
    setupAutoSync(); // Start polling

    elements.toggleHostSearch?.addEventListener('click', () => {
      elements.hostSearchWrap?.classList.toggle('hidden');
      if (!elements.hostSearchWrap?.classList.contains('hidden')) elements.hostManagerSearch?.focus();
    });
    showFindView('map');
    rerenderMarkers();
    updateCalendarList();
    renderAuditLog();
    applyLanguage(state, elements, () => {
      const host = state.hosts.find((item) => item.id === state.selectedHostId);
      if (host) renderDetails(host, startEditHost);
      renderModeration();
      renderHostManager();
      renderAuditLog();
    });
    resetMapView(map);
  } catch (error) {
    console.error('Initialization fallback triggered:', error);
  } finally {
    elements.loadingOverlay?.classList.add('hidden');
  }
}

init();
