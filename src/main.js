import { LANGUAGE_KEY } from './config.js';
import { loadChurches } from './services/storage.js';
import { createMap, renderMarkers, resetMapView } from './ui/mapView.js';
import { renderChurchDetails } from './ui/detailsView.js';
import { attachAdminController } from './controllers/adminController.js';
import { attachFinderController } from './controllers/finderController.js';
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
  openMapButton: document.querySelector('#open-map')
};

const state = {
  churches: loadChurches(),
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

rerenderMarkers();
applyLanguage(state, elements, () => {
  const church = state.churches.find((item) => item.id === state.selectedChurchId);
  if (church) renderDetails(church, startEditChurch);
});
