import { LANGUAGE_KEY, STORAGE_KEY } from './config.js';
import { appendAuditLog, loadAuditLog, loadChurches, loadHostRequests, loadSuggestions, saveChurches, submitHostRequest, submitSuggestion } from './services/repository.js';
import { createMap, renderMarkers, resetMapView } from './ui/mapView.js';
import { renderChurchDetails } from './ui/detailsView.js';
import { attachAdminController } from './controllers/adminController.js';
import { attachFinderController } from './controllers/finderController.js';
import { renderCalendarList } from './ui/calendarView.js';
import { applyLanguage, TRANSLATIONS, t } from './i18n.js';

const elements = {
  details: document.querySelector('#details'),
  emptyState: document.querySelector('#empty-state'),
  finderStatus: document.querySelector('#finder-status'),
  adminPanel: document.querySelector('#admin-panel'),
  adminTitle: document.querySelector('#admin-title'),
  adminStatus: document.querySelector('#admin-status'),
  suggestionsQueue: document.querySelector('#suggestions-queue'),
  hostQueue: document.querySelector('#host-queue'),
  toggleAdmin: document.querySelector('#toggle-admin'),
  toggleHost: document.querySelector('#toggle-host'),
  addChurchButton: document.querySelector('#add-church'),
  workspaceAddEventButton: document.querySelector('#workspace-add-event'),
  churchForm: document.querySelector('#church-form'),
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
  hostRequestForm: document.querySelector('#host-request-form'),
  hostRequestStatus: document.querySelector('#host-request-status'),
  hostRequestPanel: document.querySelector('#host-request-panel'),
  hostRequestCancel: document.querySelector('#host-request-cancel'),
  toggleHostRequest: document.querySelector('#toggle-host-request'),
  churchManagerSearch: document.querySelector('#church-manager-search'),
  churchManagerList: document.querySelector('#church-manager-list'),
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
  myChurchSection: document.querySelector('#my-church'),
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
  deleteEditingItemButton: document.querySelector('#delete-editing-item')
};

const state = {
  churches: [],
  suggestions: [],
  hostRequests: [],
  auditLog: [],
  markers: new Map(),
  filteredIds: null,
  mapFilteredIds: null,
  language: localStorage.getItem(LANGUAGE_KEY) || 'en',
  selectedChurchId: null,
  editorMode: 'church',
  editingEventIndex: null,
  lastFinderPoint: null,
  onMapChurchSelect: null,
  isAdminMode: false,
  isHostMode: false,
  hostChurchId: null
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
    renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion, onEditEvent: editCalendarEvent, onDeleteEvent: deleteCalendarEvent });
  }
}

function showStaticPage(targetId) {
  elements.staticPages.forEach((page) => page.classList.toggle('hidden', page.id !== targetId));
  scrollToSection(targetId);
}

function openPlaceSuggestion(church) {
  scrollToSection('contact-us');
  if (elements.hostRequestPanel) elements.hostRequestPanel.classList.add('hidden');
  if (elements.contactForm) {
    elements.contactForm.elements.subject.value = `${t(state, 'suggestPlaceUpdate')}: ${church.name}`;
    elements.contactForm.elements.message.value = '';
    elements.contactForm.elements.message.placeholder = t(state, 'contactMessagePrompt');
    elements.contactForm.elements.message.focus();
  }
}

function openEventSuggestion(church, eventData) {
  scrollToSection('contact-us');
  if (elements.hostRequestPanel) elements.hostRequestPanel.classList.add('hidden');
  if (elements.contactForm) {
    elements.contactForm.elements.subject.value = `${t(state, 'suggestEventUpdate')}: ${church.name} — ${eventData.type}`;
    elements.contactForm.elements.message.value = '';
    elements.contactForm.elements.message.placeholder = t(state, 'contactMessagePrompt');
    elements.contactForm.elements.message.focus();
  }
}

const renderDetails = (church, onEdit) => {
  renderChurchDetails({
    state,
    church,
    detailsElement: elements.details,
    emptyStateElement: elements.emptyState,
    onEdit,
    onSuggestPlaceUpdate: openPlaceSuggestion,
    onSuggestEventUpdate: openEventSuggestion
  });
};

let startEditChurch = () => {};
let renderModeration = () => {};
let renderChurchManager = () => {};

async function deleteCalendarEvent(row) {
  const church = state.churches.find((item) => item.id === row.churchId);
  if (!church) return;
  const index = Number.isInteger(row.eventIndex) ? row.eventIndex : (church.events || []).findIndex((event) => event.date === row.date && event.time === row.time && event.type === row.type);
  if (index < 0) return;
  church.events.splice(index, 1);
  await saveChurches(state.churches);
  state.auditLog = await appendAuditLog({ action: 'event_deleted', label: `${church.name}:${row.type}` });
  rerenderMarkers();
  renderAuditLog();
  renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion, onEditEvent: editCalendarEvent, onDeleteEvent: deleteCalendarEvent });
}

function editCalendarEvent(row) {
  startEditChurch(row.churchId, { eventIndex: row.eventIndex });
  scrollToSection('my-church');
}

const rerenderMarkers = () =>
  renderMarkers({
    map,
    state,
    onSelectChurch: (church) => {
      if (typeof state.onMapChurchSelect === 'function') {
        state.onMapChurchSelect(church);
        return;
      }
      state.selectedChurchId = church.id;
      renderDetails(church, startEditChurch);
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
  const in30 = new Date();
  in30.setDate(today.getDate() + 30);
  elements.calendarFrom.value = today.toISOString().slice(0, 10);
  elements.calendarTo.value = in30.toISOString().slice(0, 10);
  elements.calendarApply.addEventListener('click', () => renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion, onEditEvent: editCalendarEvent, onDeleteEvent: deleteCalendarEvent }));
  elements.calendarToggleFilters.addEventListener('click', () => {
    elements.calendarList.closest('.calendar-layout').classList.toggle('show-calendar-filters');
  });
  elements.calendarModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      elements.calendarModeButtons.forEach((item) => item.classList.toggle('active', item === button));
      elements.calendarMode = { value: button.dataset.calendarMode };
      renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion, onEditEvent: editCalendarEvent, onDeleteEvent: deleteCalendarEvent });
    });
  });
  elements.calendarMode = { value: 'daily' };
}

function setupMapFilters(finderController) {
  const syncRadiusLabel = () => {
    const radiusKm = Number(elements.finderForm.elements.radiusKm.value);
    const label = radiusKm < 1 ? `${Math.round(radiusKm * 1000)} m` : `${radiusKm.toFixed(radiusKm < 10 ? 1 : 0)} km`;
    document.querySelector('#finder-radius-value').textContent = label;
  };

  const matchesMapFilters = (church) => {
    const language = elements.mapFilterLanguage.value.trim().toLowerCase();
    const eventType = elements.mapFilterType.value.trim().toLowerCase();
    const ageGroup = elements.mapFilterAge.value;

    const byLanguage = !language || (church.languages || []).join(' ').toLowerCase().includes(language);
    const byEventType = !eventType || (church.events || []).some((event) => (event.type || '').toLowerCase().includes(eventType));
    const byAge = !ageGroup || (church.events || []).some((event) => (event.ageGroup || 'all') === ageGroup);

    return byLanguage && byEventType && byAge;
  };

  const applyMapFilters = async () => {
    const matches = state.churches.filter(matchesMapFilters);
    state.mapFilteredIds = new Set(matches.map((church) => church.id));
    const address = elements.finderAddress.value.trim();
    if (address) {
      await finderController.applyLocationFilter({ shouldGeocode: !state.lastFinderPoint || state.lastFinderPoint.query !== address });
      return;
    }
    state.filteredIds = null;
    rerenderMarkers();
    elements.finderStatus.textContent = `${matches.length} ${t(state, 'churchesMatchingFilters')}`;
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
    const selectedChurch = state.churches.find((item) => item.id === state.selectedChurchId) || state.churches[0];
    if (selectedChurch) renderDetails(selectedChurch, startEditChurch);
  });

  elements.finderForm.elements.radiusKm.addEventListener('input', syncRadiusLabel);
  syncRadiusLabel();
}

function setupPublicForms() {
  const toggleHostRequestMode = (showHostRequest) => {
    elements.contactFormPanel.classList.toggle('hidden', showHostRequest);
    elements.hostRequestPanel.classList.toggle('hidden', !showHostRequest);
  };

  elements.contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.contactForm).entries());
    await submitSuggestion({ id: crypto.randomUUID(), type: 'contact', ...data, createdAt: new Date().toISOString() });
    state.suggestions = await loadSuggestions();
    state.auditLog = await appendAuditLog({ action: 'suggestion_submitted', label: data.subject || 'contact' });
    elements.contactForm.reset();
    elements.contactStatus.textContent = t(state, 'suggestionSubmitted');
    renderAuditLog();
    if (state.isAdminMode || state.isHostMode) renderModeration();
  });

  elements.toggleHostRequest?.addEventListener('click', () => {
    toggleHostRequestMode(true);
    if (!elements.hostRequestPanel.classList.contains('hidden')) {
      elements.hostRequestForm.elements.fullName.focus();
    }
  });

  elements.hostRequestCancel?.addEventListener('click', () => {
    toggleHostRequestMode(false);
    elements.hostRequestStatus.textContent = '';
  });

  elements.hostRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.hostRequestForm).entries());
    await submitHostRequest({ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() });
    state.hostRequests = await loadHostRequests();
    state.auditLog = await appendAuditLog({ action: 'host_request_submitted', label: data.churchName || 'host request' });
    elements.hostRequestForm.reset();
    elements.hostRequestStatus.textContent = t(state, 'hostRequestSubmitted');
    toggleHostRequestMode(false);
    renderAuditLog();
    if (state.isAdminMode) renderModeration();
  });
}

function setupHardeningTools() {
  elements.exportDataButton?.addEventListener('click', async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      churches: state.churches,
      suggestions: state.suggestions,
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
    if (Array.isArray(data.churches)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.churches));
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

async function init() {
  state.churches = await loadChurches();
  state.suggestions = await loadSuggestions();
  state.hostRequests = await loadHostRequests();
  state.auditLog = await loadAuditLog();

  const adminController = attachAdminController({
    state,
    map,
    elements,
    renderMarkers: rerenderMarkers,
    renderChurchDetails: (church, onEdit) => renderDetails(church, onEdit)
  });
  startEditChurch = adminController.startEditChurch;
  renderModeration = adminController.renderModeration;
  renderChurchManager = adminController.renderChurchManager;

  const finderController = attachFinderController({
    state,
    map,
    elements,
    renderMarkers: rerenderMarkers,
    renderChurchDetails: (church) => renderDetails(church, startEditChurch)
  });

  elements.languageSelect.value = TRANSLATIONS[state.language] ? state.language : 'en';
  elements.languageSelect.addEventListener('change', () => {
    state.language = elements.languageSelect.value;
    applyLanguage(state, elements, () => {
      const church = state.churches.find((item) => item.id === state.selectedChurchId);
      if (church) renderDetails(church, startEditChurch);
      renderModeration();
      renderChurchManager();
      renderAuditLog();
    });
  });

  setupNavigation();
  setupMapResizeSupport();
  setupCalendar();
  setupMapFilters(finderController);
  setupPublicForms();
  setupHardeningTools();
  showFindView('map');
  rerenderMarkers();
  renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion, onEditEvent: editCalendarEvent, onDeleteEvent: deleteCalendarEvent });
  renderAuditLog();
  applyLanguage(state, elements, () => {
    const church = state.churches.find((item) => item.id === state.selectedChurchId);
    if (church) renderDetails(church, startEditChurch);
    renderModeration();
    renderChurchManager();
    renderAuditLog();
  });
  resetMapView(map);
}

init();
