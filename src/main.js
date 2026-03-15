import { LANGUAGE_KEY } from './config.js';
import { loadChurches, submitSuggestion, submitHostRequest } from './services/repository.js';
import { createMap, renderMarkers, resetMapView } from './ui/mapView.js';
import { renderChurchDetails } from './ui/detailsView.js';
import { attachAdminController } from './controllers/adminController.js';
import { attachFinderController } from './controllers/finderController.js';
import { renderCalendarList } from './ui/calendarView.js';
import { applyLanguage, TRANSLATIONS } from './i18n.js';

const elements = {
  details: document.querySelector('#details'),
  emptyState: document.querySelector('#empty-state'),
  finderStatus: document.querySelector('#finder-status'),
  adminPanel: document.querySelector('#admin-panel'),
  adminTitle: document.querySelector('#admin-title'),
  toggleAdmin: document.querySelector('#toggle-admin'),
  churchForm: document.querySelector('#church-form'),
  eventsList: document.querySelector('#events-list'),
  eventTemplate: document.querySelector('#event-template'),
  addEventButton: document.querySelector('#add-event'),
  cancelEditButton: document.querySelector('#cancel-edit'),
  toggleMapCapture: document.querySelector('#toggle-map-capture'),
  languageSelect: document.querySelector('#language-select'),
  finderForm: document.querySelector('#finder-form'),
  openMapButton: document.querySelector('#open-map'),
  tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
  sections: Array.from(document.querySelectorAll('.view-section')),
  calendarKeyword: document.querySelector('#calendar-keyword'),
  calendarType: document.querySelector('#calendar-type'),
  calendarLanguage: document.querySelector('#calendar-language'),
  calendarFrom: document.querySelector('#calendar-from'),
  calendarTo: document.querySelector('#calendar-to'),
  calendarApply: document.querySelector('#calendar-apply'),
  calendarList: document.querySelector('#calendar-list'),
  calendarCount: document.querySelector('#calendar-count'),
  suggestionForm: document.querySelector('#suggestion-form'),
  suggestionStatus: document.querySelector('#suggestion-status'),
  hostRequestForm: document.querySelector('#host-request-form'),
  hostRequestStatus: document.querySelector('#host-request-status')
};

const state = {
  churches: [],
  markers: new Map(),
  filteredIds: null,
  language: localStorage.getItem(LANGUAGE_KEY) || 'en',
  selectedChurchId: null,
  mapCaptureEnabled: false,
  isAdminMode: false
};

const map = createMap();

const renderDetails = (church, onEdit) => {
  renderChurchDetails({
    state,
    church,
    detailsElement: elements.details,
    emptyStateElement: elements.emptyState,
    onEdit
  });
};

let startEditChurch = () => {};

const rerenderMarkers = () =>
  renderMarkers({
    map,
    state,
    onSelectChurch: (church) => {
      state.selectedChurchId = church.id;
      renderDetails(church, startEditChurch);
    }
  });

function setupTabs() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      elements.tabButtons.forEach((b) => b.classList.toggle('active', b === button));
      elements.sections.forEach((section) => section.classList.toggle('hidden', section.id !== target));
      if (target === 'map-section') map.invalidateSize();
      if (target === 'calendar-section') renderCalendarList({ state, elements });
    });
  });
}

function setupCalendar() {
  const today = new Date();
  const in30 = new Date();
  in30.setDate(today.getDate() + 30);
  elements.calendarFrom.value = today.toISOString().slice(0, 10);
  elements.calendarTo.value = in30.toISOString().slice(0, 10);
  elements.calendarApply.addEventListener('click', () => renderCalendarList({ state, elements }));
}

function setupPublicForms() {
  elements.suggestionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.suggestionForm).entries());
    await submitSuggestion({ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() });
    elements.suggestionForm.reset();
    elements.suggestionStatus.textContent = 'Suggestion submitted. Thank you!';
  });

  elements.hostRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(elements.hostRequestForm).entries());
    await submitHostRequest({ id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() });
    elements.hostRequestForm.reset();
    elements.hostRequestStatus.textContent = 'Host request submitted. We will review it.';
  });
}

async function init() {
  state.churches = await loadChurches();

  const adminController = attachAdminController({
    state,
    map,
    elements,
    renderMarkers: rerenderMarkers,
    renderChurchDetails: (church, onEdit) => renderDetails(church, onEdit)
  });
  startEditChurch = adminController.startEditChurch;

  attachFinderController({
    state,
    map,
    elements,
    renderMarkers: rerenderMarkers,
    renderChurchDetails: (church) => renderDetails(church, startEditChurch)
  });

  elements.openMapButton.addEventListener('click', () => {
    state.filteredIds = null;
    rerenderMarkers();
    resetMapView(map);
    document.querySelector('#map-section').scrollIntoView({ behavior: 'smooth' });
  });

  elements.languageSelect.value = TRANSLATIONS[state.language] ? state.language : 'en';
  elements.languageSelect.addEventListener('change', () => {
    state.language = elements.languageSelect.value;
    applyLanguage(state, elements, () => {
      const church = state.churches.find((item) => item.id === state.selectedChurchId);
      if (church) renderDetails(church, startEditChurch);
    });
  });

  setupTabs();
  setupCalendar();
  setupPublicForms();

  rerenderMarkers();
  renderCalendarList({ state, elements });
  applyLanguage(state, elements, () => {
    const church = state.churches.find((item) => item.id === state.selectedChurchId);
    if (church) renderDetails(church, startEditChurch);
  });
}

init();
