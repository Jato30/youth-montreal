import { LANGUAGE_KEY, STORAGE_KEY } from './config.js';
import { appendAuditLog, loadAuditLog, loadChurches, loadHostRequests, loadSuggestions, submitSuggestion, submitHostRequest } from './services/repository.js';
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
  adminModeration: document.querySelector('#admin-moderation'),
  suggestionsQueue: document.querySelector('#suggestions-queue'),
  hostQueue: document.querySelector('#host-queue'),
  toggleAdmin: document.querySelector('#toggle-admin'),
  toggleHost: document.querySelector('#toggle-host'),
  hostStatus: document.querySelector('#host-status'),
  churchForm: document.querySelector('#church-form'),
  eventsList: document.querySelector('#events-list'),
  eventTemplate: document.querySelector('#event-template'),
  addEventButton: document.querySelector('#add-event'),
  cancelEditButton: document.querySelector('#cancel-edit'),
  toggleMapCapture: document.querySelector('#toggle-map-capture'),
  languageSelect: document.querySelector('#language-select'),
  finderForm: document.querySelector('#finder-form'),
  openMapButton: document.querySelector('#open-map'),
  mapFilterLanguage: document.querySelector('#map-filter-language'),
  mapFilterType: document.querySelector('#map-filter-type'),
  mapFilterAge: document.querySelector('#map-filter-age'),
  mapApply: document.querySelector('#map-apply'),
  mapClear: document.querySelector('#map-clear'),
  mapFilterStatus: document.querySelector('#map-filter-status'),
  tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
  sections: Array.from(document.querySelectorAll('.view-section')),
  calendarKeyword: document.querySelector('#calendar-keyword'),
  calendarType: document.querySelector('#calendar-type'),
  calendarLanguage: document.querySelector('#calendar-language'),
  calendarAge: document.querySelector('#calendar-age'),
  calendarWeekday: document.querySelector('#calendar-weekday'),
  calendarFrom: document.querySelector('#calendar-from'),
  calendarTo: document.querySelector('#calendar-to'),
  calendarApply: document.querySelector('#calendar-apply'),
  calendarList: document.querySelector('#calendar-list'),
  calendarCount: document.querySelector('#calendar-count'),
  suggestionForm: document.querySelector('#suggestion-form'),
  suggestionStatus: document.querySelector('#suggestion-status'),
  hostRequestForm: document.querySelector('#host-request-form'),
  hostRequestStatus: document.querySelector('#host-request-status'),
  churchManager: document.querySelector('#church-manager'),
  churchManagerSearch: document.querySelector('#church-manager-search'),
  churchManagerList: document.querySelector('#church-manager-list'),
  contactType: document.querySelector('#suggestion-form select[name="type"]'),
  contactMessage: document.querySelector('#suggestion-form textarea[name="message"]'),
  auditLogList: document.querySelector('#audit-log-list'),
  exportDataButton: document.querySelector('#export-data'),
  importDataInput: document.querySelector('#import-data'),
  hardeningPanel: document.querySelector('#hardening-panel'),
  legalButtons: Array.from(document.querySelectorAll('.footer-link'))
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
  mapCaptureEnabled: false,
  isAdminMode: false,
  isHostMode: false,
  hostChurchId: null
};

function switchSection(target) {
  elements.tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.target === target));
  elements.sections.forEach((section) => section.classList.toggle('hidden', section.id !== target));
  if (target === 'map-section') map.invalidateSize();
  if (target === 'calendar-section') renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion });
}

const map = createMap();

function openPlaceSuggestion(church) {
  switchSection('contact-section');
  if (elements.contactType) elements.contactType.value = 'place';
  if (elements.contactMessage) {
    elements.contactMessage.value = `Place update for ${church.name}\nAddress: ${church.address || ''}\nWhat should be changed?`;
    elements.contactMessage.focus();
  }
}

function openEventSuggestion(church, eventData) {
  switchSection('contact-section');
  if (elements.contactType) elements.contactType.value = 'event';
  if (elements.contactMessage) {
    elements.contactMessage.value = `Event update for ${church.name}\nEvent: ${eventData.type}\nDate: ${eventData.date} ${eventData.time || ''}\nWhat should be changed?`;
    elements.contactMessage.focus();
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
let renderModerationQueues = () => {};
let renderChurchManager = () => {};

const rerenderMarkers = () =>
  renderMarkers({
    map,
    state,
    onSelectChurch: (church) => {
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

function setupTabs() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener('click', () => switchSection(button.dataset.target));
  });
}

function setupCalendar() {
  const today = new Date();
  const in30 = new Date();
  in30.setDate(today.getDate() + 30);
  elements.calendarFrom.value = today.toISOString().slice(0, 10);
  elements.calendarTo.value = in30.toISOString().slice(0, 10);
  elements.calendarApply.addEventListener('click', () => renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion }));
}

function setupMapFilters() {
  const matchesMapFilters = (church) => {
    const language = elements.mapFilterLanguage.value.trim().toLowerCase();
    const eventType = elements.mapFilterType.value.trim().toLowerCase();
    const ageGroup = elements.mapFilterAge.value;

    const byLanguage = !language || (church.languages || []).join(' ').toLowerCase().includes(language);
    const byEventType = !eventType || (church.events || []).some((event) => (event.type || '').toLowerCase().includes(eventType));
    const byAge = !ageGroup || (church.events || []).some((event) => (event.ageGroup || 'all') === ageGroup);

    return byLanguage && byEventType && byAge;
  };

  const applyMapFilters = () => {
    const matches = state.churches.filter(matchesMapFilters);
    state.mapFilteredIds = new Set(matches.map((church) => church.id));
    rerenderMarkers();
    elements.mapFilterStatus.textContent = `${matches.length} ${t(state, 'churchesMatchingFilters')}`;
  };

  elements.mapApply.addEventListener('click', applyMapFilters);
  elements.mapClear.addEventListener('click', () => {
    elements.mapFilterLanguage.value = '';
    elements.mapFilterType.value = '';
    elements.mapFilterAge.value = '';
    state.mapFilteredIds = null;
    elements.mapFilterStatus.textContent = '';
    rerenderMarkers();
  });
}

function setupPublicForms() {
  elements.suggestionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.suggestionForm).entries());
    await submitSuggestion({ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() });
    state.suggestions = await loadSuggestions();
    state.auditLog = await appendAuditLog({ action: 'suggestion_submitted', label: data.type || 'suggestion' });
    elements.suggestionForm.reset();
    elements.suggestionStatus.textContent = t(state, 'suggestionSubmitted');
    renderAuditLog();
    if (state.isAdminMode) renderModerationQueues();
  });

  elements.hostRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.hostRequestForm).entries());
    await submitHostRequest({ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() });
    state.hostRequests = await loadHostRequests();
    state.auditLog = await appendAuditLog({ action: 'host_request_submitted', label: data.organization || 'host request' });
    elements.hostRequestForm.reset();
    elements.hostRequestStatus.textContent = t(state, 'hostRequestSubmitted');
    renderAuditLog();
    if (state.isAdminMode) renderModerationQueues();
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
  renderModerationQueues = adminController.renderModerationQueues;
  renderChurchManager = adminController.renderChurchManager;

  attachFinderController({
    state,
    map,
    elements,
    renderMarkers: rerenderMarkers,
    renderChurchDetails: (church) => renderDetails(church, startEditChurch)
  });

  elements.openMapButton.addEventListener('click', () => {
    state.filteredIds = null;
    state.mapFilteredIds = null;
    rerenderMarkers();
    resetMapView(map);
    switchSection('map-section');
    document.querySelector('#map-section').scrollIntoView({ behavior: 'smooth' });
  });


  elements.legalButtons?.forEach((button) => {
    button.addEventListener('click', () => switchSection(button.dataset.target));
  });

  elements.languageSelect.value = TRANSLATIONS[state.language] ? state.language : 'en';
  elements.languageSelect.addEventListener('change', () => {
    state.language = elements.languageSelect.value;
    applyLanguage(state, elements, () => {
      const church = state.churches.find((item) => item.id === state.selectedChurchId);
      if (church) renderDetails(church, startEditChurch);
      renderModerationQueues();
      renderChurchManager();
      renderAuditLog();
    });
  });

  setupTabs();
  setupCalendar();
  setupMapFilters();
  setupPublicForms();
  setupHardeningTools();
  switchSection('landing-section');
  rerenderMarkers();
  renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion });
  applyLanguage(state, elements, () => {
    const church = state.churches.find((item) => item.id === state.selectedChurchId);
    if (church) renderDetails(church, startEditChurch);
    renderModerationQueues();
    renderChurchManager();
    renderAuditLog();
  });
}

init();
