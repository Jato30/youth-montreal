import { reverseGeocode } from '../services/geocoding.js';
import { saveChurches } from '../services/repository.js';
import { t } from '../i18n.js';
import { ADM_PASSCODE } from '../config.js';

const todayDate = () => new Date().toISOString().slice(0, 10);

function addEventRow(eventsList, eventTemplate, event = { date: todayDate(), time: '19:00', type: '', recurrence: 'none', until: '' }) {
  const node = eventTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[name="date"]').value = event.date;
  node.querySelector('[name="time"]').value = event.time;
  node.querySelector('[name="type"]').value = event.type;
  node.querySelector('[name="recurrence"]').value = event.recurrence || 'none';
  node.querySelector('[name="until"]').value = event.until || '';
  node.querySelector('.remove-event').addEventListener('click', () => node.remove());
  eventsList.appendChild(node);
}

export function attachAdminController({ state, map, elements, renderMarkers, renderChurchDetails }) {
  const resetForm = () => {
    elements.churchForm.reset();
    elements.churchForm.elements.churchId.value = '';
    elements.eventsList.innerHTML = '';
    addEventRow(elements.eventsList, elements.eventTemplate);
    state.selectedChurchId = null;
    state.mapCaptureEnabled = false;
    elements.toggleMapCapture.textContent = t(state, 'startMapCapture');
    elements.adminTitle.textContent = t(state, 'addUpdateChurch');
  };

  const startEditChurch = (churchId) => {
    if (!state.isAdminMode) return;
    const church = state.churches.find((item) => item.id === churchId);
    if (!church) return;

    elements.adminPanel.classList.remove('hidden');
    elements.churchForm.elements.churchId.value = church.id;
    elements.churchForm.elements.name.value = church.name;
    elements.churchForm.elements.address.value = church.address || '';
    elements.churchForm.elements.googleMapsUrl.value = church.googleMapsUrl || '';
    elements.churchForm.elements.googlePlaceId.value = church.googlePlaceId || '';
    elements.churchForm.elements.lat.value = church.lat;
    elements.churchForm.elements.lng.value = church.lng;
    elements.churchForm.elements.languages.value = (church.languages || []).join(', ');
    elements.churchForm.elements.website.value = church.website || '';
    elements.churchForm.elements.instagram.value = church.instagram || '';
    elements.churchForm.elements.facebook.value = church.facebook || '';
    elements.churchForm.elements.whatsapp.value = church.whatsapp || '';

    elements.eventsList.innerHTML = '';
    (church.events || []).forEach((event) => addEventRow(elements.eventsList, elements.eventTemplate, event));
    if (!church.events?.length) addEventRow(elements.eventsList, elements.eventTemplate);

    state.selectedChurchId = church.id;
    elements.adminTitle.textContent = t(state, 'editingChurch');
  };

  elements.toggleAdmin.addEventListener('click', () => {
    if (!state.isAdminMode) {
      const code = prompt('Enter ADM passcode:');
      if (code !== ADM_PASSCODE) return;
    }
    state.isAdminMode = !state.isAdminMode;
    elements.adminPanel.classList.toggle('hidden', !state.isAdminMode);
    elements.toggleAdmin.textContent = state.isAdminMode ? t(state, 'closeAdm') : t(state, 'admMode');
    if (!state.isAdminMode) resetForm();
    if (state.selectedChurchId) {
      const selected = state.churches.find((item) => item.id === state.selectedChurchId);
      if (selected) renderChurchDetails(selected, startEditChurch);
    }
  });

  elements.addEventButton.addEventListener('click', () => addEventRow(elements.eventsList, elements.eventTemplate));
  elements.cancelEditButton.addEventListener('click', () => resetForm());

  elements.toggleMapCapture.addEventListener('click', () => {
    state.mapCaptureEnabled = !state.mapCaptureEnabled;
    elements.toggleMapCapture.textContent = state.mapCaptureEnabled ? t(state, 'stopMapCapture') : t(state, 'startMapCapture');
  });

  map.on('click', async (event) => {
    if (!state.mapCaptureEnabled || elements.adminPanel.classList.contains('hidden')) return;
    elements.churchForm.elements.lat.value = event.latlng.lat.toFixed(6);
    elements.churchForm.elements.lng.value = event.latlng.lng.toFixed(6);
    elements.churchForm.elements.address.value = t(state, 'locateLoading');
    elements.churchForm.elements.address.value = await reverseGeocode(event.latlng.lat, event.latlng.lng);
  });

  elements.churchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.churchForm);
    const rowNodes = Array.from(elements.eventsList.querySelectorAll('.event-row'));

    const events = rowNodes
      .map((node) => ({
        date: node.querySelector('[name="date"]').value,
        time: node.querySelector('[name="time"]').value,
        type: node.querySelector('[name="type"]').value.trim(),
        recurrence: node.querySelector('[name="recurrence"]').value || 'none',
        until: node.querySelector('[name="until"]').value || ''
      }))
      .filter((row) => row.date && row.time && row.type);

    const church = {
      id: formData.get('churchId') || crypto.randomUUID(),
      name: formData.get('name').trim(),
      address: formData.get('address').trim(),
      googleMapsUrl: formData.get('googleMapsUrl').trim(),
      googlePlaceId: formData.get('googlePlaceId').trim(),
      lat: Number(formData.get('lat')),
      lng: Number(formData.get('lng')),
      languages: formData.get('languages').split(',').map((item) => item.trim()).filter(Boolean),
      website: formData.get('website').trim(),
      instagram: formData.get('instagram').trim(),
      facebook: formData.get('facebook').trim(),
      whatsapp: formData.get('whatsapp').trim(),
      events
    };

    const index = state.churches.findIndex((item) => item.id === church.id);
    if (index >= 0) state.churches[index] = church;
    else state.churches.push(church);

    await saveChurches(state.churches);
    state.filteredIds = null;
    renderMarkers();
    state.selectedChurchId = church.id;
    renderChurchDetails(church, startEditChurch);
    resetForm();
  });

  addEventRow(elements.eventsList, elements.eventTemplate);

  return { startEditChurch };
}
