import { LANGUAGE_KEY, STORAGE_KEY } from './config.js';
import { appendAuditLog, loadAuditLog, loadChurches, loadHostRequests, loadSuggestions, submitHostRequest, submitSuggestion } from './services/repository.js';
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
  churchForm: document.querySelector('#church-form'),
  eventsList: document.querySelector('#events-list'),
  eventTemplate: document.querySelector('#event-template'),
  addEventButton: document.querySelector('#add-event'),
  cancelEditButton: document.querySelector('#cancel-edit'),
  toggleMapCapture: document.querySelector('#toggle-map-capture'),
  languageSelect: document.querySelector('#language-select'),
  finderForm: document.querySelector('#finder-form'),
  finderAddress: document.querySelector('#finder-address'),
  mapFilterLanguage: document.querySelector('#map-filter-language'),
  mapFilterType: document.querySelector('#map-filter-type'),
  mapFilterAge: document.querySelector('#map-filter-age'),
  mapApply: document.querySelector('#map-apply'),
  mapClear: document.querySelector('#map-clear'),
  mapFilterStatus: document.querySelector('#map-filter-status'),
  calendarKeyword: document.querySelector('#calendar-keyword'),
  calendarType: document.querySelector('#calendar-type'),
  calendarLanguage: document.querySelector('#calendar-language'),
  calendarAge: document.querySelector('#calendar-age'),
  calendarFrom: document.querySelector('#calendar-from'),
  calendarTo: document.querySelector('#calendar-to'),
  calendarApply: document.querySelector('#calendar-apply'),
  calendarList: document.querySelector('#calendar-list'),
  calendarCount: document.querySelector('#calendar-count'),
  calendarModeButtons: Array.from(document.querySelectorAll('[data-calendar-mode]')),
  contactForm: document.querySelector('#contact-form'),
  contactStatus: document.querySelector('#contact-status'),
  hostRequestForm: document.querySelector('#host-request-form'),
  hostRequestStatus: document.querySelector('#host-request-status'),
  hostRequestPanel: document.querySelector('#host-request-panel'),
  toggleHostRequest: document.querySelector('#toggle-host-request'),
  churchManagerSearch: document.querySelector('#church-manager-search'),
  churchManagerList: document.querySelector('#church-manager-list'),
  eventManagerSearch: document.querySelector('#event-manager-search'),
  eventManagerList: document.querySelector('#event-manager-list'),
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
  editorMapSlot: document.querySelector('#editor-map-slot')
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

const map = createMap();

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
    renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion });
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

function setupCalendar() {
  const today = new Date();
  const in30 = new Date();
  in30.setDate(today.getDate() + 30);
  elements.calendarFrom.value = today.toISOString().slice(0, 10);
  elements.calendarTo.value = in30.toISOString().slice(0, 10);
  elements.calendarApply.addEventListener('click', () => renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion }));
  elements.calendarModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      elements.calendarModeButtons.forEach((item) => item.classList.toggle('active', item === button));
      elements.calendarMode = { value: button.dataset.calendarMode };
      renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion });
    });
  });
  elements.calendarMode = { value: 'daily' };
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
    elements.hostRequestPanel.classList.toggle('hidden');
    if (!elements.hostRequestPanel.classList.contains('hidden')) {
      elements.hostRequestForm.elements.fullName.focus();
    }
  });

  elements.hostRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.hostRequestForm).entries());
    await submitHostRequest({ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() });
    state.hostRequests = await loadHostRequests();
    state.auditLog = await appendAuditLog({ action: 'host_request_submitted', label: data.churchName || 'host request' });
    elements.hostRequestForm.reset();
    elements.hostRequestStatus.textContent = t(state, 'hostRequestSubmitted');
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

  attachFinderController({
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
  setupCalendar();
  setupMapFilters();
  setupPublicForms();
  setupHardeningTools();
  showFindView('map');
  rerenderMarkers();
  renderCalendarList({ state, elements, onSuggestEventUpdate: openEventSuggestion });
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
