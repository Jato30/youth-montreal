import { reverseGeocode } from '../services/geocoding.js';
import { saveChurches, updateHostRequestStatus, updateSuggestionStatus } from '../services/repository.js';
import { t } from '../i18n.js';
import { ADM_PASSCODE } from '../config.js';

const todayDate = () => new Date().toISOString().slice(0, 10);
const hostCode = () => `H-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function addEventRow(eventsList, eventTemplate, event = { date: todayDate(), time: '19:00', type: '', ageGroup: 'all', recurrence: 'none', until: '' }) {
  const node = eventTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[name="date"]').value = event.date;
  node.querySelector('[name="time"]').value = event.time;
  node.querySelector('[name="type"]').value = event.type;
  node.querySelector('[name="ageGroup"]').value = event.ageGroup || 'all';
  node.querySelector('[name="recurrence"]').value = event.recurrence || 'none';
  node.querySelector('[name="until"]').value = event.until || '';
  node.querySelector('.remove-event').addEventListener('click', () => node.remove());
  eventsList.appendChild(node);
}

function canEditChurch(state, churchId) {
  if (state.isAdminMode) return true;
  if (!state.isHostMode) return false;
  return state.hostChurchId === churchId;
}

export function attachAdminController({ state, map, elements, renderMarkers, renderChurchDetails }) {
  const renderModerationQueues = () => {
    if (!elements.suggestionsQueue || !elements.hostQueue) return;

    const pendingSuggestions = state.suggestions.filter((item) => item.status === 'pending');
    const pendingHosts = state.hostRequests.filter((item) => item.status === 'pending');

    elements.suggestionsQueue.innerHTML = pendingSuggestions.length
      ? pendingSuggestions
          .map(
            (item) => `
        <article class="queue-item">
          <p><strong>${item.type || 'suggestion'}</strong> — ${item.name || 'Anonymous'}</p>
          <p>${item.message || ''}</p>
          <div class="queue-actions" data-id="${item.id}" data-resource="suggestion">
            <button type="button" data-action="approve">${t(state, 'approve')}</button>
            <button type="button" class="secondary" data-action="deny">${t(state, 'deny')}</button>
          </div>
        </article>
      `
          )
          .join('')
      : `<p class="help-text">${t(state, 'noPendingSuggestions')}</p>`;

    elements.hostQueue.innerHTML = pendingHosts.length
      ? pendingHosts
          .map(
            (item) => `
        <article class="queue-item">
          <p><strong>${item.organization || 'Organization'}</strong></p>
          <p>${item.contact || ''} · ${item.email || ''}</p>
          <p>${item.details || ''}</p>
          <div class="queue-actions" data-id="${item.id}" data-resource="hostRequest">
            <button type="button" data-action="approve">${t(state, 'approve')}</button>
            <button type="button" class="secondary" data-action="deny">${t(state, 'deny')}</button>
          </div>
        </article>
      `
          )
          .join('')
      : `<p class="help-text">${t(state, 'noPendingHostRequests')}</p>`;
  };

  const renderChurchManager = () => {
    if (!elements.churchManagerList) return;

    const q = elements.churchManagerSearch?.value.trim().toLowerCase() || '';
    const rows = state.churches.filter((church) => {
      const text = `${church.name} ${church.address || ''} ${(church.languages || []).join(' ')}`.toLowerCase();
      return !q || text.includes(q);
    });

    elements.churchManagerList.innerHTML = rows.length
      ? rows
          .map(
            (church) => `
      <article class="manager-item">
        <p><strong>${church.name}</strong></p>
        <p>${church.address || ''}</p>
        <div class="queue-actions" data-id="${church.id}" data-resource="church">
          <button type="button" data-action="edit">${t(state, 'editPin')}</button>
          <button type="button" class="secondary" data-action="delete">${t(state, 'delete')}</button>
        </div>
      </article>
    `
          )
          .join('')
      : `<p class="help-text">${t(state, 'noChurchesFound')}</p>`;
  };

  const resetForm = () => {
    elements.churchForm.reset();
    elements.adminStatus.textContent = '';
    elements.churchForm.elements.churchId.value = '';
    elements.eventsList.innerHTML = '';
    addEventRow(elements.eventsList, elements.eventTemplate);
    state.selectedChurchId = null;
    state.mapCaptureEnabled = false;
    elements.toggleMapCapture.textContent = t(state, 'startMapCapture');
    elements.adminTitle.textContent = t(state, state.isHostMode ? 'editMyChurch' : 'addUpdateChurch');
  };

  const startEditChurch = (churchId) => {
    if (!canEditChurch(state, churchId)) return;
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

  const setHostMode = (church) => {
    state.isHostMode = true;
    state.hostChurchId = church.id;
    state.isAdminMode = false;
    elements.adminPanel.classList.remove('hidden');
    elements.adminModeration.classList.add('hidden');
    elements.churchManager.classList.add('hidden');
    elements.toggleAdmin.textContent = t(state, 'admMode');
    elements.toggleHost.textContent = t(state, 'leaveHostMode');
    startEditChurch(church.id);
  };

  const clearHostMode = () => {
    state.isHostMode = false;
    state.hostChurchId = null;
    elements.toggleHost.textContent = t(state, 'hostMode');
    elements.hostStatus.textContent = '';
    if (!state.isAdminMode) elements.adminPanel.classList.add('hidden');
    resetForm();
  };

  elements.toggleHost.addEventListener('click', () => {
    if (state.isHostMode) {
      clearHostMode();
      return;
    }

    const code = prompt(t(state, 'enterHostCode'));
    if (!code) return;
    const church = state.churches.find((item) => item.hostPasscode === code.trim());
    if (!church) {
      elements.hostStatus.textContent = t(state, 'hostCodeNotFound');
      return;
    }

    elements.hostStatus.textContent = `${t(state, 'hostCodeAccepted')} ${church.name}`;
    setHostMode(church);
  });

  elements.toggleAdmin.addEventListener('click', () => {
    if (state.isHostMode) clearHostMode();

    if (!state.isAdminMode) {
      const code = prompt(t(state, 'enterAdmCode'));
      if (code !== ADM_PASSCODE) return;
    }
    state.isAdminMode = !state.isAdminMode;

    elements.adminPanel.classList.toggle('hidden', !state.isAdminMode);
    elements.adminModeration.classList.toggle('hidden', !state.isAdminMode);
    elements.churchManager.classList.toggle('hidden', !state.isAdminMode);
    elements.toggleAdmin.textContent = state.isAdminMode ? t(state, 'closeAdm') : t(state, 'admMode');

    if (state.isAdminMode) {
      renderModerationQueues();
      renderChurchManager();
    }
    if (!state.isAdminMode) resetForm();

    if (state.selectedChurchId) {
      const selected = state.churches.find((item) => item.id === state.selectedChurchId);
      if (selected) renderChurchDetails(selected, startEditChurch);
    }
  });

  elements.churchManagerSearch?.addEventListener('input', renderChurchManager);

  elements.churchManagerList?.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const wrapper = button.closest('.queue-actions');
    const churchId = wrapper?.dataset.id;
    const action = button.dataset.action;
    if (!churchId) return;

    if (action === 'edit') {
      startEditChurch(churchId);
      return;
    }

    if (action === 'delete') {
      const church = state.churches.find((item) => item.id === churchId);
      if (!church) return;
      if (!confirm(`${t(state, 'deleteChurchConfirm')} ${church.name}?`)) return;

      state.churches = state.churches.filter((item) => item.id !== churchId);
      await saveChurches(state.churches);
      state.filteredIds = null;
      state.mapFilteredIds = null;
      state.selectedChurchId = null;
      renderMarkers();
      renderChurchManager();
      resetForm();
      elements.details.classList.add('hidden');
      elements.emptyState.classList.remove('hidden');
      elements.adminStatus.textContent = t(state, 'churchDeleted');
    }
  });

  elements.adminModeration.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const wrapper = button.closest('.queue-actions');
    const id = wrapper?.dataset.id;
    const resource = wrapper?.dataset.resource;
    const status = button.dataset.action === 'approve' ? 'approved' : 'denied';
    if (!id || !resource) return;

    if (resource === 'suggestion') state.suggestions = await updateSuggestionStatus(id, status);
    if (resource === 'hostRequest') state.hostRequests = await updateHostRequestStatus(id, status);
    renderModerationQueues();
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
        ageGroup: node.querySelector('[name="ageGroup"]').value || 'all',
        recurrence: node.querySelector('[name="recurrence"]').value || 'none',
        until: node.querySelector('[name="until"]').value || ''
      }))
      .filter((row) => row.date && row.time && row.type);

    const churchId = formData.get('churchId') || crypto.randomUUID();

    if (state.isHostMode && churchId !== state.hostChurchId) return;

    const existing = state.churches.find((item) => item.id === churchId);

    const church = {
      id: churchId,
      hostPasscode: existing?.hostPasscode || hostCode(),
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
    renderChurchManager();
    state.selectedChurchId = church.id;
    renderChurchDetails(church, startEditChurch);

    elements.adminStatus.textContent = state.isAdminMode
      ? `${t(state, 'churchSaved')} ${t(state, 'hostPasscode')}: ${church.hostPasscode}`
      : t(state, 'churchSaved');

    if (state.isHostMode) {
      startEditChurch(church.id);
      return;
    }

    resetForm();
  });

  addEventRow(elements.eventsList, elements.eventTemplate);

  return { startEditChurch, renderModerationQueues, renderChurchManager };
}
