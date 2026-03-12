const STORAGE_KEY = 'youth-montreal-churches';
const LANGUAGE_KEY = 'youth-montreal-language';

const TRANSLATIONS = {
  en: {
    language: 'Language',
    admMode: 'ADM Mode',
    closeAdm: 'Close ADM',
    heroTitle: 'Connecting young people to local churches across Montreal.',
    heroBody: 'Our vision is to help every youth and young adult quickly find a nearby Bible study, prayer meeting, church service, or fellowship this week.',
    instagramLink: 'Follow the movement on Instagram',
    findChurch: 'Find a church near you',
    addressSearch: 'Your address',
    radius: 'Radius',
    findWithinRadius: 'Find within radius',
    openMap: 'Open map',
    churchDetails: 'Church details',
    emptyState: 'Click a marker on the map to view details.',
    addUpdateChurch: 'Add / update church',
    editingChurch: 'Editing church',
    churchName: 'Church name',
    address: 'Address',
    latitude: 'Latitude',
    longitude: 'Longitude',
    mapClickHint: 'When editing, click the map to capture coordinates and address automatically.',
    startMapCapture: 'Enable map capture',
    stopMapCapture: 'Disable map capture',
    languagesSpoken: 'Languages spoken',
    website: 'Website',
    instagram: 'Instagram',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    gatherings: 'Gatherings (next 7 days)',
    addGathering: '+ Add gathering',
    saveChurch: 'Save church',
    cancelEdit: 'Cancel edit',
    openMaps: 'Open pin in maps app',
    noGatherings: 'No gatherings listed in next 7 days.',
    languagesLabel: 'Languages:',
    editPin: 'Edit pin',
    locateLoading: 'Looking up address…',
    searchLoading: 'Searching nearby churches…',
    searchNoResults: 'No churches found in that radius yet.',
    searchResultCount: 'churches found near your address.'
  },
  'fr-CA': {
    language: 'Langue',
    admMode: 'Mode ADM',
    closeAdm: 'Fermer ADM',
    heroTitle: 'Connecter les jeunes aux églises locales partout à Montréal.',
    heroBody: 'Notre vision est d’aider chaque jeune à trouver rapidement une étude biblique, une réunion de prière, un culte ou un temps de fraternité cette semaine.',
    instagramLink: 'Suivre le mouvement sur Instagram',
    findChurch: 'Trouver une église près de vous',
    addressSearch: 'Votre adresse',
    radius: 'Rayon',
    findWithinRadius: 'Rechercher dans le rayon',
    openMap: 'Ouvrir la carte',
    churchDetails: "Détails de l'église",
    emptyState: 'Cliquez sur un marqueur pour voir les détails.',
    addUpdateChurch: 'Ajouter / modifier une église',
    editingChurch: 'Modification de l’église',
    churchName: "Nom de l'église",
    address: 'Adresse',
    latitude: 'Latitude',
    longitude: 'Longitude',
    mapClickHint: 'En mode édition, cliquez sur la carte pour récupérer automatiquement les coordonnées et l’adresse.',
    startMapCapture: 'Activer capture carte',
    stopMapCapture: 'Désactiver capture carte',
    languagesSpoken: 'Langues parlées',
    website: 'Site web',
    instagram: 'Instagram',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    gatherings: 'Rencontres (7 prochains jours)',
    addGathering: '+ Ajouter rencontre',
    saveChurch: "Enregistrer l'église",
    cancelEdit: 'Annuler',
    openMaps: 'Ouvrir le point dans une app cartes',
    noGatherings: 'Aucune rencontre indiquée dans les 7 prochains jours.',
    languagesLabel: 'Langues :',
    editPin: 'Modifier le point',
    locateLoading: 'Recherche de l’adresse…',
    searchLoading: 'Recherche des églises proches…',
    searchNoResults: 'Aucune église trouvée dans ce rayon.',
    searchResultCount: 'églises trouvées près de votre adresse.'
  }
};

const rtlLanguages = new Set(['he']);

const now = new Date();
const inDays = (count) => {
  const d = new Date();
  d.setDate(now.getDate() + count);
  return d.toISOString().slice(0, 10);
};

const defaultChurches = [
  {
    id: crypto.randomUUID(),
    name: 'Eglise Nouvelle Vie',
    address: '10330 Boulevard Gouin O, Montreal, QC',
    lat: 45.4948,
    lng: -73.7206,
    languages: ['Français', 'English'],
    website: 'https://www.nouvellevie.com/',
    instagram: 'https://www.instagram.com/nouvelleviechurch/',
    facebook: 'https://www.facebook.com/nouvelleviechurch/',
    whatsapp: '',
    events: [
      { date: inDays(1), time: '19:00', type: 'Young Adults Prayer Night' },
      { date: inDays(3), time: '18:30', type: 'Bible Study Group' }
    ]
  },
  {
    id: crypto.randomUUID(),
    name: 'La Chapelle Montréal',
    address: '177 Rue Saint-Jacques, Montreal, QC',
    lat: 45.5077,
    lng: -73.554,
    languages: ['Français', 'English', 'Español'],
    website: 'https://lachapelle.me/',
    instagram: 'https://www.instagram.com/lachapelle.me/',
    facebook: 'https://www.facebook.com/lachapelleme/',
    whatsapp: '',
    events: [{ date: inDays(2), time: '19:30', type: 'Youth Fellowship' }]
  }
];

const state = {
  churches: parseChurches(),
  markers: new Map(),
  filteredIds: null,
  language: localStorage.getItem(LANGUAGE_KEY) || 'en',
  selectedChurchId: null,
  mapCaptureEnabled: false,
  isAdminMode: false
};

function t(key) {
  return TRANSLATIONS[state.language]?.[key] || TRANSLATIONS.en[key] || key;
}

function parseChurches() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultChurches;
  try {
    return JSON.parse(saved).map((church) => ({ ...church, languages: church.languages || [], events: church.events || [] }));
  } catch {
    return defaultChurches;
  }
}

const map = L.map('map', {
  dragging: true,
  touchZoom: true,
  doubleClickZoom: true,
  scrollWheelZoom: true,
  boxZoom: true,
  keyboard: true,
  tap: true
}).setView([45.5017, -73.5673], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const details = document.querySelector('#details');
const emptyState = document.querySelector('#empty-state');
const finderStatus = document.querySelector('#finder-status');
const adminPanel = document.querySelector('#admin-panel');
const adminTitle = document.querySelector('#admin-title');
const toggleAdmin = document.querySelector('#toggle-admin');
const churchForm = document.querySelector('#church-form');
const eventsList = document.querySelector('#events-list');
const eventTemplate = document.querySelector('#event-template');
const addEventButton = document.querySelector('#add-event');
const cancelEditButton = document.querySelector('#cancel-edit');
const toggleMapCapture = document.querySelector('#toggle-map-capture');
const languageSelect = document.querySelector('#language-select');
const finderForm = document.querySelector('#finder-form');
const openMapButton = document.querySelector('#open-map');

function saveChurches() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.churches));
}

function mapLink(church) {
  return `https://www.google.com/maps/search/?api=1&query=${church.lat},${church.lng}`;
}

function setLanguage(language) {
  state.language = TRANSLATIONS[language] ? language : 'en';
  localStorage.setItem(LANGUAGE_KEY, state.language);
  document.documentElement.lang = state.language;
  document.documentElement.dir = rtlLanguages.has(state.language) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  toggleAdmin.textContent = state.isAdminMode ? t('closeAdm') : t('admMode');
  toggleMapCapture.textContent = state.mapCaptureEnabled ? t('stopMapCapture') : t('startMapCapture');
  adminTitle.textContent = state.selectedChurchId ? t('editingChurch') : t('addUpdateChurch');
  if (state.selectedChurchId) {
    const church = state.churches.find((c) => c.id === state.selectedChurchId);
    if (church) renderChurchDetails(church);
  }
}

function renderChurchDetails(church) {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() + 7);

  const upcoming = church.events
    .filter((event) => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      return eventDate >= today && eventDate <= cutoff;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  details.innerHTML = `
    <article class="detail-card">
      <h3>${church.name}</h3>
      ${church.address ? `<p>${church.address}</p>` : ''}
      <p><a href="${mapLink(church)}" target="_blank" rel="noreferrer">${t('openMaps')}</a></p>
      ${church.languages?.length ? `<p><strong>${t('languagesLabel')}</strong> ${church.languages.join(', ')}</p>` : ''}
      <ul>${upcoming.length ? upcoming.map((e) => `<li>${e.date} ${e.time} — ${e.type}</li>`).join('') : `<li>${t('noGatherings')}</li>`}</ul>
      <p>
        ${church.website ? `<a href="${church.website}" target="_blank" rel="noreferrer">${t('website')}</a>` : ''}
        ${church.instagram ? ` · <a href="${church.instagram}" target="_blank" rel="noreferrer">${t('instagram')}</a>` : ''}
        ${church.facebook ? ` · <a href="${church.facebook}" target="_blank" rel="noreferrer">${t('facebook')}</a>` : ''}
        ${church.whatsapp ? ` · <a href="${church.whatsapp}" target="_blank" rel="noreferrer">${t('whatsapp')}</a>` : ''}
      </p>
      ${state.isAdminMode ? `<button type="button" class="edit-pin-btn" data-id="${church.id}">${t('editPin')}</button>` : ''}
    </article>
  `;
  details.querySelector('.edit-pin-btn')?.addEventListener('click', () => startEditChurch(church.id));
  details.classList.remove('hidden');
  emptyState.classList.add('hidden');
}

function addMarker(church) {
  if (state.filteredIds && !state.filteredIds.has(church.id)) return;
  const marker = L.marker([Number(church.lat), Number(church.lng)]).addTo(map);
  marker.bindPopup(`<strong>${church.name}</strong>`);
  marker.on('click', () => {
    state.selectedChurchId = church.id;
    renderChurchDetails(church);
  });
  state.markers.set(church.id, marker);
}

function renderMarkers() {
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();
  state.churches.forEach(addMarker);
}

function addEventRow(event = { date: inDays(0), time: '19:00', type: '' }) {
  const node = eventTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[name="date"]').value = event.date;
  node.querySelector('[name="time"]').value = event.time;
  node.querySelector('[name="type"]').value = event.type;
  node.querySelector('.remove-event').addEventListener('click', () => node.remove());
  eventsList.appendChild(node);
}

function resetForm() {
  churchForm.reset();
  churchForm.elements.churchId.value = '';
  eventsList.innerHTML = '';
  addEventRow();
  state.selectedChurchId = null;
  state.mapCaptureEnabled = false;
  toggleMapCapture.textContent = t('startMapCapture');
  adminTitle.textContent = t('addUpdateChurch');
}

function startEditChurch(churchId) {
  if (!state.isAdminMode) return;
  const church = state.churches.find((item) => item.id === churchId);
  if (!church) return;
  adminPanel.classList.remove('hidden');
  toggleAdmin.textContent = t('closeAdm');

  churchForm.elements.churchId.value = church.id;
  churchForm.elements.name.value = church.name;
  churchForm.elements.address.value = church.address || '';
  churchForm.elements.lat.value = church.lat;
  churchForm.elements.lng.value = church.lng;
  churchForm.elements.languages.value = (church.languages || []).join(', ');
  churchForm.elements.website.value = church.website || '';
  churchForm.elements.instagram.value = church.instagram || '';
  churchForm.elements.facebook.value = church.facebook || '';
  churchForm.elements.whatsapp.value = church.whatsapp || '';

  eventsList.innerHTML = '';
  (church.events || []).forEach((event) => addEventRow(event));
  if (!church.events?.length) addEventRow();

  state.selectedChurchId = church.id;
  adminTitle.textContent = t('editingChurch');
}

async function reverseGeocode(lat, lng) {
  try {
    const result = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    if (!result.ok) return '';
    const data = await result.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

async function geocodeAddress(address) {
  const query = encodeURIComponent(address);
  const result = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
  if (!result.ok) return null;
  const data = await result.json();
  if (!data.length) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

toggleAdmin.addEventListener('click', () => {
  state.isAdminMode = !state.isAdminMode;
  adminPanel.classList.toggle('hidden', !state.isAdminMode);
  toggleAdmin.textContent = state.isAdminMode ? t('closeAdm') : t('admMode');
  if (!state.isAdminMode) resetForm();
  if (state.selectedChurchId) {
    const selected = state.churches.find((item) => item.id === state.selectedChurchId);
    if (selected) renderChurchDetails(selected);
  }
});

addEventButton.addEventListener('click', () => addEventRow());
cancelEditButton.addEventListener('click', () => resetForm());

toggleMapCapture.addEventListener('click', () => {
  state.mapCaptureEnabled = !state.mapCaptureEnabled;
  toggleMapCapture.textContent = state.mapCaptureEnabled ? t('stopMapCapture') : t('startMapCapture');
});

map.on('click', async (event) => {
  if (!state.mapCaptureEnabled || adminPanel.classList.contains('hidden')) return;
  churchForm.elements.lat.value = event.latlng.lat.toFixed(6);
  churchForm.elements.lng.value = event.latlng.lng.toFixed(6);
  churchForm.elements.address.value = t('locateLoading');
  churchForm.elements.address.value = await reverseGeocode(event.latlng.lat, event.latlng.lng);
});

finderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const address = finderForm.elements.address.value.trim();
  const radiusKm = Number(finderForm.elements.radiusKm.value);
  if (!address) return;

  finderStatus.textContent = t('searchLoading');
  const point = await geocodeAddress(address);
  if (!point) {
    finderStatus.textContent = t('searchNoResults');
    return;
  }

  const matches = state.churches.filter((church) => haversineKm(point.lat, point.lng, Number(church.lat), Number(church.lng)) <= radiusKm);
  state.filteredIds = new Set(matches.map((church) => church.id));
  renderMarkers();

  if (!matches.length) {
    finderStatus.textContent = t('searchNoResults');
    map.setView([point.lat, point.lng], 12);
  } else {
    finderStatus.textContent = `${matches.length} ${t('searchResultCount')}`;
    const bounds = L.latLngBounds(matches.map((church) => [Number(church.lat), Number(church.lng)]));
    map.fitBounds(bounds.pad(0.25));
    state.selectedChurchId = matches[0].id;
    renderChurchDetails(matches[0]);
  }

  document.querySelector('#map-section').scrollIntoView({ behavior: 'smooth' });
});

openMapButton.addEventListener('click', () => {
  state.filteredIds = null;
  renderMarkers();
  map.setView([45.5017, -73.5673], 10);
  document.querySelector('#map-section').scrollIntoView({ behavior: 'smooth' });
});

churchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(churchForm);
  const rowNodes = Array.from(eventsList.querySelectorAll('.event-row'));

  const events = rowNodes
    .map((node) => ({
      date: node.querySelector('[name="date"]').value,
      time: node.querySelector('[name="time"]').value,
      type: node.querySelector('[name="type"]').value.trim()
    }))
    .filter((row) => row.date && row.time && row.type);

  const church = {
    id: formData.get('churchId') || crypto.randomUUID(),
    name: formData.get('name').trim(),
    address: formData.get('address').trim(),
    lat: Number(formData.get('lat')),
    lng: Number(formData.get('lng')),
    languages: formData
      .get('languages')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    website: formData.get('website').trim(),
    instagram: formData.get('instagram').trim(),
    facebook: formData.get('facebook').trim(),
    whatsapp: formData.get('whatsapp').trim(),
    events
  };

  const existingIndex = state.churches.findIndex((item) => item.id === church.id);
  if (existingIndex >= 0) state.churches[existingIndex] = church;
  else state.churches.push(church);

  saveChurches();
  state.filteredIds = null;
  renderMarkers();
  state.selectedChurchId = church.id;
  renderChurchDetails(church);
  resetForm();
});

languageSelect.value = state.language;
languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));

renderMarkers();
addEventRow();
setLanguage(state.language);
