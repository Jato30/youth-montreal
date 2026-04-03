import { geocodeAddress, reverseGeocode, searchMontrealAddresses } from '../services/geocoding.js';
import { appendAuditLog, saveChurches, updateHostRequestStatus, updateSuggestionStatus } from '../services/repository.js';
import { t } from '../i18n.js';
import { ADM_PASSCODE } from '../config.js';
import { normalizeAddress, shortenAddress } from '../utils/address.js';

const todayDate = () => new Date().toISOString().slice(0, 10);
const hostCode = () => `H-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const defaultEvent = () => ({ title: '', date: todayDate(), time: '', type: '', ageGroup: 'all', recurrence: 'none' });

function setCheckedValues(container, name, values) {
  const selected = new Set(values);
  container.querySelectorAll(`[name="${name}"]`).forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function getCheckedValues(container, name) {
  return Array.from(container.querySelectorAll(`[name="${name}"]:checked`)).map((input) => input.value);
}

function updateCheckboxSummary(node, state) {
  const summary = node.querySelector('.checkbox-summary');
  if (!summary) return;
  const selected = getCheckedValues(node, 'type');
  summary.textContent = selected.length ? `${t(state, 'selectedTypes')}: ${selected.join(', ')}` : t(state, 'selectEventType');
}

function addEventRow(eventsList, eventTemplate, state, event = defaultEvent()) {
  const node = eventTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[name="title"]').value = event.title || '';
  node.querySelector('[name="date"]').value = event.date || todayDate();
  node.querySelector('[name="time"]').value = event.time || '';
  setCheckedValues(node, 'type', String(event.type || '').split(',').map((item) => item.trim()).filter(Boolean));
  node.querySelector('[name="ageGroup"]').value = event.ageGroup || 'all';
  node.querySelector('[name="recurrence"]').value = event.recurrence || 'none';
  node.querySelectorAll('[name="type"]').forEach((checkbox) => checkbox.addEventListener('change', () => updateCheckboxSummary(node, state)));
  node.querySelector('.remove-event').addEventListener('click', () => {
    if (!confirm(t(state, 'deleteEventDraftConfirm'))) return;
    node.remove();
  });
  updateCheckboxSummary(node, state);
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
  const churchOptions = document.querySelector('#saved-churches');
  const hostSummary = document.querySelector('#event-host-summary');

  const updateChurchOptions = () => {
    if (!churchOptions) return;
    churchOptions.innerHTML = state.churches
      .filter((church) => church.hostPasscode || state.isAdminMode)
      .map((church) => `<option value="${church.name}"></option>`)
      .join('');
  };

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

  const selectHostChurch = (church) => {
    if (!church) return;
    elements.churchForm.elements.churchId.value = church.id;
    state.selectedChurchId = church.id;
    elements.churchForm.elements.hostChurchName.value = church.name;
    hostSummary.textContent = shortenAddress(church.address) || t(state, 'churchSelected');
    elements.editorContext.textContent = `${church.name} — ${shortenAddress(church.address)}`;
    elements.editorContext.classList.remove('hidden');
    updateDraftMarker(church.lat, church.lng);
  };

  const clearHostSelection = () => {
    elements.churchForm.elements.churchId.value = '';
    elements.churchForm.elements.hostChurchName.value = '';
    hostSummary.textContent = t(state, 'selectChurchPrompt');
    elements.editorContext.textContent = '';
    elements.editorContext.classList.add('hidden');
    clearDraftMarker();
  };

  const syncFormRequirements = (mode) => {
    const isChurchMode = mode === 'church';
    ['name', 'address', 'lat', 'lng'].forEach((field) => {
      const input = elements.churchForm.elements[field];
      if (input) input.required = isChurchMode;
    });
  };

  const setEditingMode = (editing, mode = 'church') => {
    state.isEditingChurch = editing;
    state.editorMode = mode;
    syncFormRequirements(mode);
    state.onMapChurchSelect = editing && mode === 'new-event' ? (church) => selectHostChurch(church) : null;
    document.body.classList.toggle('editing-mode', editing);
    document.body.classList.toggle('church-form-event-mode', editing && mode === 'event');
    document.body.classList.toggle('church-form-new-event-mode', editing && mode === 'new-event');
    elements.adminPanel.classList.toggle('hidden', !editing);
    elements.addEventButton.classList.toggle('hidden', mode !== 'church');
    if (editing && mode === 'new-event') {
      state.filteredIds = null;
      state.mapFilteredIds = null;
    }
    if (editing && (mode === 'church' || mode === 'new-event')) moveMapTo(elements.editorMapSlot);
    else moveMapTo(elements.publicMapSlot);
    renderMarkers();
  };

  const populateAddressSuggestions = async (query) => {
    const list = document.querySelector('#montreal-addresses');
    if (!list) return;
    const matches = await searchMontrealAddresses(query, 6);
    if (!matches.length) return;
    list.innerHTML = matches.map((item) => `<option value="${item.shortAddress || item.fullAddress}"></option>`).join('');
  };

  const applyAddressMatch = (match) => {
    if (!match) return;
    const compactAddress = match.shortAddress || normalizeAddress(match.fullAddress);
    elements.churchForm.elements.address.value = compactAddress;
    elements.churchForm.elements.lat.value = Number(match.lat).toFixed(6);
    elements.churchForm.elements.lng.value = Number(match.lng).toFixed(6);
    elements.churchForm.elements.googleMapsUrl.value = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(compactAddress)}`;
    updateDraftMarker(match.lat, match.lng);
  };

  const autofillChurchAddress = async () => {
    if (state.editorMode !== 'church') return;
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

  const readEventRows = () => Array.from(elements.eventsList.querySelectorAll('.event-row'))
    .map((node) => ({
      title: node.querySelector('[name="title"]').value.trim(),
      date: node.querySelector('[name="date"]').value,
      time: node.querySelector('[name="time"]').value,
      type: getCheckedValues(node, 'type').join(', '),
      ageGroup: node.querySelector('[name="ageGroup"]').value || 'all',
      recurrence: node.querySelector('[name="recurrence"]').value || 'none'
    }))
    .filter((row) => row.title && row.date && row.time && row.type);

  const resetForm = () => {
    elements.churchForm.reset();
    elements.churchForm.elements.churchId.value = '';
    elements.churchForm.elements.eventIndex.value = '';
    elements.eventsList.innerHTML = '';
    setCheckedValues(elements.churchForm, 'languages', []);
    elements.adminStatus.textContent = '';
    elements.deleteEditingItemButton.classList.add('hidden');
    elements.saveEditButton.textContent = t(state, 'saveChurch');
    state.selectedChurchId = null;
    state.editingEventIndex = null;
    elements.adminTitle.textContent = t(state, state.isHostMode ? 'editMyChurch' : 'addUpdateChurch');
    clearHostSelection();
    addEventRow(elements.eventsList, elements.eventTemplate, state);
    setEditingMode(false);
  };

  const renderChurchManager = () => {
    updateChurchOptions();
    const query = elements.churchManagerSearch?.value.trim().toLowerCase() || '';
    const visibleChurches = state.isHostMode ? state.churches.filter((church) => church.id === state.hostChurchId) : state.churches;
    const rows = visibleChurches.filter((church) => `${church.name} ${church.address || ''}`.toLowerCase().includes(query));

    elements.churchManagerList.innerHTML = rows.length
      ? rows.map((church) => `
          <article class="manager-item">
            <p><strong>${church.name}</strong></p>
            <p>${shortenAddress(church.address) || ''}</p>
            <div class="queue-actions" data-id="${church.id}">
              <button type="button" class="icon-mobile-btn edit-icon-btn" data-action="edit" aria-label="${t(state, 'editPin')}"><span class="icon-label">${t(state, 'editPin')}</span></button>
              ${state.isAdminMode ? `<button type="button" class="secondary icon-mobile-btn delete-icon-btn" data-action="delete" aria-label="${t(state, 'delete')}"><span class="icon-label">${t(state, 'delete')}</span></button>` : ''}
            </div>
          </article>
        `).join('')
      : `<p class="help-text">${t(state, 'noChurchesFound')}</p>`;
  };

  const renderEventManager = () => {
    const query = elements.eventManagerSearch?.value.trim().toLowerCase() || '';
    const churches = state.isHostMode ? state.churches.filter((church) => church.id === state.hostChurchId) : state.churches;
    const today = new Date().toISOString().slice(0, 10);

    const rows = churches
      .flatMap((church) => (church.events || []).map((event, eventIndex) => ({ church, event, eventIndex })))
      .filter(({ church, event }) => {
        return event.date >= today && `${church.name} ${event.title || ''} ${event.type}`.toLowerCase().includes(query);
      })
      .sort((a, b) => `${a.event.date}${a.event.time}`.localeCompare(`${b.event.date}${b.event.time}`));

    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.workspaceEventsPage = Math.min(state.workspaceEventsPage || 1, totalPages);
    const start = ((state.workspaceEventsPage || 1) - 1) * pageSize;
    const visibleRows = rows.slice(start, start + pageSize);

    elements.workspaceEventsPage.textContent = `${state.workspaceEventsPage || 1} / ${totalPages}`;
    elements.workspaceEventsPrev.disabled = (state.workspaceEventsPage || 1) <= 1;
    elements.workspaceEventsNext.disabled = (state.workspaceEventsPage || 1) >= totalPages;

    elements.eventManagerList.innerHTML = visibleRows.length
      ? visibleRows.map(({ church, event, eventIndex }) => `
          <article class="manager-item">
            <p><strong>${event.title || event.type}</strong></p>
            <p>${event.type}</p>
            <p>${church.name} — ${event.date} ${event.time}</p>
            <div class="queue-actions" data-id="${church.id}" data-event-index="${eventIndex}">
              <button type="button" class="icon-mobile-btn edit-icon-btn" data-action="edit-event" aria-label="${t(state, 'editPin')}"><span class="icon-label">${t(state, 'editPin')}</span></button>
              <button type="button" class="secondary icon-mobile-btn delete-icon-btn" data-action="delete-event" aria-label="${t(state, 'delete')}"><span class="icon-label">${t(state, 'delete')}</span></button>
            </div>
          </article>
        `).join('')
      : `<p class="help-text">${t(state, 'noEventsForFilters')}</p>`;
  };

  const renderModeration = () => {
    const moderationMode = elements.workspaceModeration.dataset.mode || 'suggestions';
    const moderationTitle = elements.workspaceModeration.querySelector('h3');
    if (moderationTitle) moderationTitle.textContent = t(state, moderationMode === 'hostRequests' ? 'reviewHostRequestsTitle' : 'reviewSuggestionsTitle');
    const suggestions = getRelevantSuggestions(state);
    const hostRequests = state.isAdminMode ? state.hostRequests : [];

    elements.suggestionsQueue.innerHTML = suggestions.length
      ? suggestions.map((item) => `
          <article class="queue-item">
            <p><strong>${item.subject || item.type || 'Suggestion'}</strong></p>
            <p>${item.message || ''}</p>
            <div class="queue-actions" data-id="${item.id}" data-resource="suggestion">
              <button type="button" data-status="pending">${t(state, 'statusPending')}</button>
              <button type="button" data-status="approved">${t(state, 'approve')}</button>
              <button type="button" class="secondary" data-status="denied">${t(state, 'deny')}</button>
            </div>
          </article>
        `).join('')
      : `<p class="help-text">${t(state, 'noPendingSuggestions')}</p>`;

    elements.hostQueue.innerHTML = hostRequests.length
      ? hostRequests.map((item) => `
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
        `).join('')
      : `<p class="help-text">${t(state, 'noPendingHostRequests')}</p>`;

    elements.suggestionsQueue.classList.toggle('hidden', moderationMode !== 'suggestions');
    elements.hostQueue.classList.toggle('hidden', moderationMode !== 'hostRequests' || !state.isAdminMode);
  };

  const setChurchFields = (church) => {
    elements.churchForm.elements.name.value = church?.name || '';
    elements.churchForm.elements.address.value = church?.address || '';
    elements.churchForm.elements.googleMapsUrl.value = church?.googleMapsUrl || '';
    elements.churchForm.elements.googlePlaceId.value = church?.googlePlaceId || '';
    elements.churchForm.elements.lat.value = church?.lat ?? '';
    elements.churchForm.elements.lng.value = church?.lng ?? '';
    setCheckedValues(elements.churchForm, 'languages', church?.languages || []);
    elements.churchForm.elements.website.value = church?.website || '';
    elements.churchForm.elements.instagram.value = church?.instagram || '';
    elements.churchForm.elements.facebook.value = church?.facebook || '';
    elements.churchForm.elements.whatsapp.value = church?.whatsapp || '';
  };

  const startEditChurch = (churchId = null, options = {}) => {
    if (options.mode === 'new-event') {
      if (!state.isAdminMode && !state.isHostMode) return;
      elements.churchForm.reset();
      elements.eventsList.innerHTML = '';
      elements.churchForm.elements.eventIndex.value = '';
      addEventRow(elements.eventsList, elements.eventTemplate, state, defaultEvent());
      elements.adminTitle.textContent = t(state, 'addEvent');
      elements.saveEditButton.textContent = t(state, 'saveEvent');
      elements.deleteEditingItemButton.classList.add('hidden');
      elements.adminStatus.textContent = '';
      clearHostSelection();
      setEditingMode(true, 'new-event');
      if (churchId) {
        const church = state.churches.find((item) => item.id === churchId);
        if (church) selectHostChurch(church);
      }
      return;
    }

    if (churchId && !canEditChurch(state, churchId)) return;
    const church = churchId ? state.churches.find((item) => item.id === churchId) : null;
    const eventIndex = Number.isInteger(options.eventIndex) ? options.eventIndex : null;
    const editingEvent = church && eventIndex !== null ? church.events?.[eventIndex] : null;

    elements.churchForm.reset();
    elements.eventsList.innerHTML = '';
    elements.churchForm.elements.churchId.value = church?.id || '';
    elements.churchForm.elements.eventIndex.value = eventIndex ?? '';
    state.selectedChurchId = church?.id || null;
    state.editingEventIndex = eventIndex;
    elements.adminStatus.textContent = '';
    clearHostSelection();

    if (church) {
      setChurchFields(church);
      updateDraftMarker(church.lat, church.lng);
    } else {
      setCheckedValues(elements.churchForm, 'languages', []);
      clearDraftMarker();
    }

    if (editingEvent) {
      addEventRow(elements.eventsList, elements.eventTemplate, state, editingEvent);
      elements.adminTitle.textContent = t(state, 'editingEvent');
      elements.editorContext.textContent = `${church.name} — ${shortenAddress(church.address)}`;
      elements.editorContext.classList.remove('hidden');
      elements.saveEditButton.textContent = t(state, 'saveEvent');
      elements.deleteEditingItemButton.classList.remove('hidden');
      setEditingMode(true, 'event');
    } else {
      const events = church?.events?.length ? church.events : [defaultEvent()];
      events.forEach((event) => addEventRow(elements.eventsList, elements.eventTemplate, state, event));
      elements.adminTitle.textContent = church ? t(state, 'editingChurch') : t(state, state.isHostMode ? 'editMyChurch' : 'addUpdateChurch');
      elements.saveEditButton.textContent = t(state, 'saveChurch');
      elements.deleteEditingItemButton.classList.toggle('hidden', !church);
      setEditingMode(true, 'church');
    }
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

  const persistChurch = async (church) => {
    const index = state.churches.findIndex((item) => item.id === church.id);
    if (index >= 0) state.churches[index] = church;
    else state.churches.push(church);
    await saveChurches(state.churches);
    state.auditLog = await appendAuditLog({ action: index >= 0 ? 'church_updated' : 'church_created', label: church.name });
  };

  const saveChurchesWithFeedback = async () => {
    await saveChurches(state.churches);
    return true;
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
  elements.eventManagerSearch.addEventListener('input', () => {
    state.workspaceEventsPage = 1;
    renderEventManager();
  });

  elements.workspaceEventsPrev.addEventListener('click', () => {
    state.workspaceEventsPage = Math.max(1, (state.workspaceEventsPage || 1) - 1);
    renderEventManager();
  });

  elements.workspaceEventsNext.addEventListener('click', () => {
    state.workspaceEventsPage = (state.workspaceEventsPage || 1) + 1;
    renderEventManager();
  });

  elements.churchForm.elements.address.addEventListener('input', async (event) => populateAddressSuggestions(event.target.value));
  elements.churchForm.elements.address.addEventListener('change', autofillChurchAddress);
  elements.churchForm.elements.address.addEventListener('blur', autofillChurchAddress);
  elements.churchForm.elements.hostChurchName?.addEventListener('input', () => {
    const match = state.churches.find((church) => church.name.toLowerCase() === elements.churchForm.elements.hostChurchName.value.trim().toLowerCase());
    if (match) selectHostChurch(match);
  });
  elements.churchForm.elements.hostChurchName?.addEventListener('change', () => {
    const match = state.churches.find((church) => church.name.toLowerCase() === elements.churchForm.elements.hostChurchName.value.trim().toLowerCase());
    if (match) selectHostChurch(match);
  });

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
      if (!confirm(`${t(state, 'deleteChurchConfirm')} ${churchId}?`)) return;
      state.churches = state.churches.filter((item) => item.id !== churchId);
      if (!await saveChurchesWithFeedback()) return;
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
      startEditChurch(churchId, { eventIndex });
      return;
    }

    if (button.dataset.action === 'delete-event') {
      if (!confirm(t(state, 'deleteEventConfirm'))) return;
      church.events.splice(eventIndex, 1);
      if (!await saveChurchesWithFeedback()) return;
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
        if (!await saveChurchesWithFeedback()) return;
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

  elements.addEventButton.addEventListener('click', () => addEventRow(elements.eventsList, elements.eventTemplate, state));
  elements.workspaceAddEventButton.addEventListener('click', () => {
    const preferredChurchId = state.hostChurchId || state.selectedChurchId || null;
    startEditChurch(preferredChurchId, { mode: 'new-event' });
  });
  elements.cancelEditButton.addEventListener('click', resetForm);

  elements.deleteEditingItemButton.addEventListener('click', async () => {
    const churchId = elements.churchForm.elements.churchId.value;
    const church = state.churches.find((item) => item.id === churchId);
    if (!church) return;

    if (state.editorMode === 'event') {
      const eventIndex = Number(elements.churchForm.elements.eventIndex.value);
      if (Number.isInteger(eventIndex) && eventIndex >= 0 && eventIndex < church.events.length) {
        if (!confirm(t(state, 'deleteEventConfirm'))) return;
        church.events.splice(eventIndex, 1);
        if (!await saveChurchesWithFeedback()) return;
        state.auditLog = await appendAuditLog({ action: 'event_deleted', label: church.name });
        renderEventManager();
        renderMarkers();
        renderChurchDetails(church, startEditChurch);
        elements.workspaceStatus.textContent = t(state, 'eventDeleted');
        resetForm();
      }
      return;
    }

    if (!confirm(`${t(state, 'deleteChurchConfirm')} ${church.name}?`)) return;
    state.churches = state.churches.filter((item) => item.id !== churchId);
    if (!await saveChurchesWithFeedback()) return;
    state.auditLog = await appendAuditLog({ action: 'church_deleted', label: church.name });
    renderMarkers();
    renderChurchManager();
    renderEventManager();
    elements.workspaceStatus.textContent = t(state, 'churchDeleted');
    resetForm();
  });

  map.on('click', async (event) => {
    if (elements.adminPanel.classList.contains('hidden') || state.editorMode !== 'church') return;
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
    const existing = state.churches.find((item) => item.id === formData.get('churchId'));
    const eventRows = readEventRows();

    if (state.editorMode === 'new-event') {
      const churchId = formData.get('churchId');
      const church = state.churches.find((item) => item.id === churchId);
      const nextEvent = eventRows[0];
      if (!church || !nextEvent) {
        elements.adminStatus.textContent = t(state, 'selectChurchPrompt');
        return;
      }
      church.events.push(nextEvent);
      if (!await saveChurchesWithFeedback()) return;
      state.auditLog = await appendAuditLog({ action: 'event_created', label: `${church.name}:${nextEvent.title}` });
      renderMarkers();
      renderChurchManager();
      renderEventManager();
      renderChurchDetails(church, startEditChurch);
      elements.workspaceStatus.textContent = t(state, 'eventSaved');
      resetForm();
      return;
    }

    const churchId = formData.get('churchId') || crypto.randomUUID();
    if (state.isHostMode && churchId !== state.hostChurchId && formData.get('churchId')) return;
    const existingEvents = existing?.events || [];
    const church = {
      id: churchId,
      hostPasscode: existing?.hostPasscode || hostCode(),
      name: state.editorMode === 'event' ? existing?.name || '' : formData.get('name').trim(),
      address: state.editorMode === 'event' ? existing?.address || '' : normalizeAddress(formData.get('address').trim()),
      googleMapsUrl: state.editorMode === 'event' ? existing?.googleMapsUrl || '' : formData.get('googleMapsUrl').trim(),
      googlePlaceId: state.editorMode === 'event' ? existing?.googlePlaceId || '' : formData.get('googlePlaceId').trim(),
      lat: state.editorMode === 'event' ? Number(existing?.lat) : Number(formData.get('lat')),
      lng: state.editorMode === 'event' ? Number(existing?.lng) : Number(formData.get('lng')),
      languages: state.editorMode === 'event' ? existing?.languages || [] : getCheckedValues(elements.churchForm, 'languages'),
      website: state.editorMode === 'event' ? existing?.website || '' : formData.get('website').trim(),
      instagram: state.editorMode === 'event' ? existing?.instagram || '' : formData.get('instagram').trim(),
      facebook: state.editorMode === 'event' ? existing?.facebook || '' : formData.get('facebook').trim(),
      whatsapp: state.editorMode === 'event' ? existing?.whatsapp || '' : formData.get('whatsapp').trim(),
      events: existingEvents.slice()
    };

    if (state.editorMode === 'event') {
      const eventIndex = Number(formData.get('eventIndex'));
      const nextEvent = eventRows[0];
      if (!nextEvent) return;
      if (Number.isInteger(eventIndex) && eventIndex >= 0 && eventIndex < church.events.length) church.events[eventIndex] = nextEvent;
      else church.events.push(nextEvent);
      const churchIndex = state.churches.findIndex((item) => item.id === church.id);
      if (churchIndex >= 0) state.churches[churchIndex] = church;
      if (!await saveChurchesWithFeedback()) return;
      state.auditLog = await appendAuditLog({ action: churchIndex >= 0 && eventIndex < existingEvents.length ? 'event_updated' : 'event_created', label: `${church.name}:${nextEvent.title}` });
      renderMarkers();
      renderChurchManager();
      renderEventManager();
      renderChurchDetails(church, startEditChurch);
      elements.workspaceStatus.textContent = t(state, 'eventSaved');
      resetForm();
      return;
    }

    church.events = eventRows;
    await persistChurch(church);
    renderMarkers();
    renderChurchManager();
    renderEventManager();
    state.selectedChurchId = church.id;
    renderChurchDetails(church, startEditChurch);
    elements.workspaceStatus.textContent = `${t(state, 'churchSaved')} ${t(state, 'hostPasscode')}: ${church.hostPasscode}`;
    resetForm();
  });

  addEventRow(elements.eventsList, elements.eventTemplate, state);
  updateChurchOptions();
  state.workspaceEventsPage = 1;
  setWorkspaceVisibility();
  renderChurchManager();
  renderEventManager();
  renderModeration();

  return { startEditChurch, renderChurchManager, renderModeration };
}
