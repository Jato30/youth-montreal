import { geocodeAddress, reverseGeocode, searchMontrealAddresses } from '../services/geocoding.js';
import { appendAuditLog, saveChurches, updateHostRequestStatus, updateSuggestionStatus } from '../services/repository.js';
import { t } from '../i18n.js';
import { ADM_PASSCODE } from '../config.js';
import { shortenAddress } from '../utils/address.js';

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
  return state.isAdminMode || (state.isHostMode && state.hostChurchId === churchId);
}

function getRelevantSuggestions(state) {
  if (state.isAdminMode) return state.suggestions;
  if (state.isHostMode) return state.suggestions.filter((item) => item.churchId === state.hostChurchId || !item.churchId);
  return [];
}

export function attachAdminController({ state, map, elements, renderMarkers, renderChurchDetails }) {
  let draftMarker = null;

  const updateDraftMarker = (lat, lng) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
    if (!draftMarker) draftMarker = L.marker([Number(lat), Number(lng)]).addTo(map);
    else draftMarker.setLatLng([Number(lat), Number(lng)]);
    map.setView([Number(lat), Number(lng)], 14);
  };

  const clearDraftMarker = () => {
    if (!draftMarker) return;
    draftMarker.remove();
    draftMarker = null;
  };

  const moveMapTo = (target) => {
    const mapNode = document.querySelector('#map');
    if (mapNode && target && mapNode.parentElement !== target) target.appendChild(mapNode);
    map.invalidateSize();
  };

  const setEditingMode = (editing) => {
    state.isEditingChurch = editing;
    document.body.classList.toggle('editing-mode', editing);
    elements.adminPanel.classList.toggle('hidden', !editing);
    if (editing) moveMapTo(elements.editorMapSlot);
    else moveMapTo(elements.publicMapSlot);
  };

  const applyAddressMatch = (match) => {
    if (!match) return;
    elements.churchForm.elements.address.value = match.fullAddress;
    elements.churchForm.elements.lat.value = Number(match.lat).toFixed(6);
    elements.churchForm.elements.lng.value = Number(match.lng).toFixed(6);
    elements.churchForm.elements.googleMapsUrl.value = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.fullAddress)}`;
    updateDraftMarker(match.lat, match.lng);
  };

  const populateAddressSuggestions = async (query) => {
    const list = document.querySelector('#montreal-addresses');
    if (!list) return;
    const matches = await searchMontrealAddresses(query, 6);
    if (!matches.length) return;
    list.innerHTML = matches.map((item) => `<option value="${item.fullAddress}"></option>`).join('');
  };

  const autofillChurchAddress = async () => {
    const value = elements.churchForm.elements.address.value.trim();
    if (!value) return;
    elements.adminStatus.textContent = t(state, 'addressLookupLoading');
    const match = await geocodeAddress(value);
    if (!match) {
      elements.adminStatus.textContent = t(state, 'addressLookupFailed');
      return;
    }
    applyAddressMatch(match);
    elements.adminStatus.textContent = t(state, 'addressAutofilled');
  };

  const resetForm = () => {
    elements.churchForm.reset();
    elements.churchForm.elements.churchId.value = '';
    elements.eventsList.innerHTML = '';
    elements.adminStatus.textContent = '';
    state.selectedChurchId = null;
    state.mapCaptureEnabled = false;
    elements.adminTitle.textContent = t(state, state.isHostMode ? 'editMyChurch' : 'addUpdateChurch');
    addEventRow(elements.eventsList, elements.eventTemplate);
    clearDraftMarker();
    setEditingMode(false);
  };

  const renderChurchManager = () => {
    const query = elements.churchManagerSearch?.value.trim().toLowerCase() || '';
    const visibleChurches = state.isHostMode ? state.churches.filter((church) => church.id === state.hostChurchId) : state.churches;

    const rows = visibleChurches.filter((church) => {
      const text = `${church.name} ${church.address || ''}`.toLowerCase();
      return !query || text.includes(query);
    });

    elements.churchManagerList.innerHTML = rows.length
      ? rows
          .map(
            (church) => `
          <article class="manager-item">
            <p><strong>${church.name}</strong></p>
            <p>${shortenAddress(church.address) || ''}</p>
            <div class="queue-actions" data-id="${church.id}">
              <button type="button" data-action="edit">${t(state, 'editPin')}</button>
              ${state.isAdminMode ? `<button type="button" class="secondary" data-action="delete">${t(state, 'delete')}</button>` : ''}
            </div>
          </article>
        `
          )
          .join('')
      : `<p class="help-text">${t(state, 'noChurchesFound')}</p>`;
  };

  const renderEventManager = () => {
    const query = elements.eventManagerSearch?.value.trim().toLowerCase() || '';
    const churches = state.isHostMode ? state.churches.filter((church) => church.id === state.hostChurchId) : state.churches;
    const rows = churches
      .flatMap((church) => (church.events || []).map((event, eventIndex) => ({ church, event, eventIndex })))
      .filter(({ church, event }) => `${church.name} ${event.type}`.toLowerCase().includes(query));

    elements.eventManagerList.innerHTML = rows.length
      ? rows
          .map(
            ({ church, event, eventIndex }) => `
            <article class="manager-item">
              <p><strong>${event.type}</strong></p>
              <p>${church.name} — ${event.date} ${event.time}</p>
              <div class="queue-actions" data-id="${church.id}" data-event-index="${eventIndex}">
                <button type="button" data-action="edit-event">${t(state, 'editPin')}</button>
                <button type="button" class="secondary" data-action="delete-event">${t(state, 'delete')}</button>
              </div>
            </article>
          `
          )
          .join('')
      : `<p class="help-text">${t(state, 'noEventsForFilters')}</p>`;
  };

  const renderModeration = () => {
    const moderationMode = elements.workspaceModeration.dataset.mode || 'suggestions';
    const suggestions = getRelevantSuggestions(state);
    const hostRequests = state.isAdminMode ? state.hostRequests : [];

    elements.suggestionsQueue.innerHTML = suggestions.length
      ? suggestions
          .map(
            (item) => `
          <article class="queue-item">
            <p><strong>${item.subject || item.type || 'Suggestion'}</strong></p>
            <p>${item.message || ''}</p>
            <div class="queue-actions" data-id="${item.id}" data-resource="suggestion">
              <button type="button" data-status="pending">${t(state, 'statusPending')}</button>
              <button type="button" data-status="approved">${t(state, 'approve')}</button>
              <button type="button" class="secondary" data-status="denied">${t(state, 'deny')}</button>
            </div>
          </article>
        `
          )
          .join('')
      : `<p class="help-text">${t(state, 'noPendingSuggestions')}</p>`;

    elements.hostQueue.innerHTML = hostRequests.length
      ? hostRequests
          .map(
            (item) => `
          <article class="queue-item">
            <p><strong>${item.churchName || item.organization || item.fullName}</strong></p>
            <p>${item.position || ''} · ${item.phone || ''}</p>
            <p>${item.message || item.details || ''}</p>
            <div class="queue-actions" data-id="${item.id}" data-resource="hostRequest">
              <button type="button" data-status="pending">${t(state, 'statusPending')}</button>
              <button type="button" data-status="contacting">${t(state, 'statusContacting')}</button>
              <button type="button" data-status="approved">${t(state, 'approve')}</button>
              <button type="button" class="secondary" data-status="denied">${t(state, 'deny')}</button>
            </div>
            ${item.generatedHostCode ? `<p class="help-text"><strong>${t(state, 'hostPasscode')}:</strong> ${item.generatedHostCode}</p>` : ''}
          </article>
        `
          )
          .join('')
      : `<p class="help-text">${t(state, 'noPendingHostRequests')}</p>`;

    elements.suggestionsQueue.classList.toggle('hidden', moderationMode !== 'suggestions');
    elements.hostQueue.classList.toggle('hidden', moderationMode !== 'hostRequests' || !state.isAdminMode);
  };

  const startEditChurch = (churchId = null) => {
    if (churchId && !canEditChurch(state, churchId)) return;
    const church = churchId ? state.churches.find((item) => item.id === churchId) : null;

    elements.churchForm.reset();
    elements.eventsList.innerHTML = '';

    if (church) {
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
      (church.events || []).forEach((event) => addEventRow(elements.eventsList, elements.eventTemplate, event));
      if (!church.events?.length) addEventRow(elements.eventsList, elements.eventTemplate);
      state.selectedChurchId = church.id;
      elements.adminTitle.textContent = t(state, 'editingChurch');
      updateDraftMarker(church.lat, church.lng);
    } else {
      elements.churchForm.elements.churchId.value = '';
      addEventRow(elements.eventsList, elements.eventTemplate);
      elements.adminTitle.textContent = t(state, 'addUpdateChurch');
      clearDraftMarker();
    }

    elements.adminStatus.textContent = '';
    setEditingMode(true);
  };

  const setWorkspaceVisibility = () => {
    const visible = state.isAdminMode || state.isHostMode;
    elements.myChurchSection.classList.toggle('hidden', !visible);
    elements.workspaceStatus.textContent = state.isAdminMode
      ? t(state, 'adminWorkspaceActive')
      : state.isHostMode
        ? t(state, 'hostWorkspaceActive')
        : '';
    elements.hardeningPanel.classList.toggle('hidden', !state.isAdminMode);
    elements.moderationTabs.classList.toggle('hidden', !state.isAdminMode);
    elements.workspaceModeration.classList.toggle('hidden', !visible || state.isEditingChurch);
    elements.addChurchButton.classList.toggle('hidden', !state.isAdminMode);
    document.querySelectorAll('.admin-only').forEach((node) => node.classList.toggle('hidden', !state.isAdminMode));
    if (!visible) resetForm();
  };

  elements.addChurchButton.addEventListener('click', () => startEditChurch());

  elements.toggleHost.addEventListener('click', () => {
    if (state.isHostMode) {
      state.isHostMode = false;
      state.hostChurchId = null;
      setWorkspaceVisibility();
      renderChurchManager();
      renderEventManager();
      renderModeration();
      return;
    }

    const code = prompt(t(state, 'enterHostCode'));
    if (!code) return;
    const church = state.churches.find((item) => item.hostPasscode === code.trim());
    if (!church) {
      elements.workspaceStatus.textContent = t(state, 'hostCodeNotFound');
      return;
    }

    state.isHostMode = true;
    state.hostChurchId = church.id;
    state.isAdminMode = false;
    setWorkspaceVisibility();
    renderChurchManager();
    renderEventManager();
    renderModeration();
  });

  elements.toggleAdmin.addEventListener('click', () => {
    if (!state.isAdminMode) {
      const code = prompt(t(state, 'enterAdmCode'));
      if (code !== ADM_PASSCODE) {
        elements.workspaceStatus.textContent = t(state, 'admCodeNotFound');
        return;
      }
    }

    state.isAdminMode = !state.isAdminMode;
    if (state.isAdminMode) {
      state.isHostMode = false;
      state.hostChurchId = null;
      elements.workspaceStatus.textContent = t(state, 'adminWorkspaceActive');
    }

    setWorkspaceVisibility();
    renderChurchManager();
    renderEventManager();
    renderModeration();
  });

  elements.workspaceViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (state.isEditingChurch) return;
      elements.workspaceViewButtons.forEach((item) => item.classList.toggle('active', item === button));
      const mode = button.dataset.workspaceView;
      elements.workspacePlacesView.classList.toggle('hidden', mode !== 'places');
      elements.workspaceEventsView.classList.toggle('hidden', mode !== 'events');
    });
  });

  elements.moderationTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      elements.moderationTabButtons.forEach((item) => item.classList.toggle('active', item === button));
      elements.workspaceModeration.dataset.mode = button.dataset.moderationView;
      renderModeration();
    });
  });

  elements.churchManagerSearch.addEventListener('input', renderChurchManager);
  elements.eventManagerSearch.addEventListener('input', renderEventManager);
  elements.churchForm.elements.address.addEventListener('input', async (event) => populateAddressSuggestions(event.target.value));
  elements.churchForm.elements.address.addEventListener('change', autofillChurchAddress);
  elements.churchForm.elements.address.addEventListener('blur', autofillChurchAddress);

  elements.churchManagerList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const churchId = button.closest('.queue-actions')?.dataset.id;
    if (!churchId) return;

    if (button.dataset.action === 'edit') {
      startEditChurch(churchId);
      return;
    }

    if (button.dataset.action === 'delete' && state.isAdminMode) {
      state.churches = state.churches.filter((item) => item.id !== churchId);
      await saveChurches(state.churches);
      state.auditLog = await appendAuditLog({ action: 'church_deleted', label: churchId });
      renderMarkers();
      renderChurchManager();
      renderEventManager();
      elements.adminStatus.textContent = t(state, 'churchDeleted');
    }
  });

  elements.eventManagerList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const wrapper = button.closest('.queue-actions');
    const churchId = wrapper?.dataset.id;
    const eventIndex = Number(wrapper?.dataset.eventIndex);
    const church = state.churches.find((item) => item.id === churchId);
    if (!church) return;

    if (button.dataset.action === 'edit-event') {
      startEditChurch(churchId);
      return;
    }

    if (button.dataset.action === 'delete-event') {
      church.events.splice(eventIndex, 1);
      await saveChurches(state.churches);
      state.auditLog = await appendAuditLog({ action: 'event_deleted', label: church.name });
      renderEventManager();
      renderMarkers();
      if (state.selectedChurchId === churchId) renderChurchDetails(church, startEditChurch);
      elements.workspaceStatus.textContent = t(state, 'eventDeleted');
    }
  });

  elements.workspaceModeration.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-status]');
    if (!button) return;
    const wrapper = button.closest('.queue-actions');
    const id = wrapper?.dataset.id;
    const resource = wrapper?.dataset.resource;
    const status = button.dataset.status;
    if (!id || !resource) return;

    if (resource === 'suggestion') {
      state.suggestions = await updateSuggestionStatus(id, status);
      state.auditLog = await appendAuditLog({ action: `suggestion_${status}`, label: id });
      elements.workspaceStatus.textContent = t(state, 'moderationUpdated');
    }

    if (resource === 'hostRequest') {
      let generatedHostCode = '';
      if (status === 'approved') {
        generatedHostCode = hostCode();
        state.churches.push({
          id: crypto.randomUUID(),
          hostPasscode: generatedHostCode,
          name: state.hostRequests.find((item) => item.id === id)?.churchName || t(state, 'newHostChurchName'),
          address: '',
          googleMapsUrl: '',
          googlePlaceId: '',
          lat: 45.5017,
          lng: -73.5673,
          languages: [],
          website: '',
          instagram: '',
          facebook: '',
          whatsapp: '',
          events: []
        });
        await saveChurches(state.churches);
      }
      state.hostRequests = await updateHostRequestStatus(id, status === 'approved' ? 'approved' : status);
      if (generatedHostCode) {
        const request = state.hostRequests.find((item) => item.id === id);
        if (request) request.generatedHostCode = generatedHostCode;
      }
      state.auditLog = await appendAuditLog({ action: `host_request_${status}`, label: id });
      renderChurchManager();
      elements.workspaceStatus.textContent = t(state, 'moderationUpdated');
    }

    renderModeration();
  });

  elements.addEventButton.addEventListener('click', () => addEventRow(elements.eventsList, elements.eventTemplate));
  elements.cancelEditButton.addEventListener('click', resetForm);

  elements.toggleMapCapture.addEventListener('click', () => {
    state.mapCaptureEnabled = !state.mapCaptureEnabled;
    elements.toggleMapCapture.textContent = state.mapCaptureEnabled ? t(state, 'stopMapCapture') : t(state, 'startMapCapture');
    elements.adminStatus.textContent = state.mapCaptureEnabled ? t(state, 'mapCaptureEnabledMsg') : '';
  });

  map.on('click', async (event) => {
    if (!state.mapCaptureEnabled || elements.adminPanel.classList.contains('hidden')) return;
    elements.churchForm.elements.lat.value = event.latlng.lat.toFixed(6);
    elements.churchForm.elements.lng.value = event.latlng.lng.toFixed(6);
    updateDraftMarker(event.latlng.lat, event.latlng.lng);
    elements.churchForm.elements.address.value = t(state, 'locateLoading');
    const location = await reverseGeocode(event.latlng.lat, event.latlng.lng);
    if (!location) {
      elements.adminStatus.textContent = t(state, 'addressLookupFailed');
      return;
    }
    applyAddressMatch(location);
    elements.adminStatus.textContent = t(state, 'addressAutofilled');
  });

  elements.churchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.churchForm);
    const events = Array.from(elements.eventsList.querySelectorAll('.event-row'))
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
    if (state.isHostMode && churchId !== state.hostChurchId && formData.get('churchId')) return;

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
    state.auditLog = await appendAuditLog({ action: index >= 0 ? 'church_updated' : 'church_created', label: church.name });
    renderMarkers();
    renderChurchManager();
    renderEventManager();
    state.selectedChurchId = church.id;
    renderChurchDetails(church, startEditChurch);
    elements.workspaceStatus.textContent = `${t(state, 'churchSaved')} ${t(state, 'hostPasscode')}: ${church.hostPasscode}`;
    resetForm();
  });

  addEventRow(elements.eventsList, elements.eventTemplate);
  setWorkspaceVisibility();
  renderChurchManager();
  renderEventManager();
  renderModeration();

  return { startEditChurch, renderChurchManager, renderModeration };
}
