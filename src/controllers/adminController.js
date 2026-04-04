import { geocodeAddress, reverseGeocode, searchMontrealAddresses } from '../services/geocoding.js';
import { appendAuditLog, saveHosts, updateHostRequestStatus, updateReportStatus } from '../services/repository.js';
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

function canEditHost(state, hostId) {
  return state.isAdminMode || (state.isHostMode && state.hostHostId === hostId);
}

function getRelevantSuggestions(state) {
  if (state.isAdminMode) return state.suggestions;
  if (state.isHostMode) return state.suggestions.filter((item) => item.churchId === state.hostChurchId || !item.churchId);
  return [];
}

export function attachAdminController({ state, map, elements, renderMarkers, renderHostDetails }) {
  let draftMarker = null;
  const churchOptions = document.querySelector('#saved-churches');
  const hostSummary = document.querySelector('#event-host-summary');

  const updateChurchOptions = () => {
    if (!churchOptions) return;
    churchOptions.innerHTML = state.hosts
      .filter((host) => host.hostPasscode || state.isAdminMode)
      .map((host) => `<option value="${host.name}"></option>`)
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

  const selectHostHost = (host) => {
    if (!host) return;
    elements.hostForm.elements.hostId.value = host.id;
    state.selectedHostId = host.id;
    elements.hostForm.elements.hostName.value = host.name;
    hostSummary.textContent = shortenAddress(host.address) || t(state, 'hostSelected');
    elements.editorContext.textContent = `${host.name} — ${shortenAddress(host.address)}`;
    elements.editorContext.classList.remove('hidden');
    updateDraftMarker(host.lat, host.lng);
  };

  const clearHostSelection = () => {
    elements.hostForm.elements.hostId.value = '';
    elements.hostForm.elements.hostName.value = '';
    hostSummary.textContent = t(state, 'selectHostPrompt');
    elements.editorContext.textContent = '';
    elements.editorContext.classList.add('hidden');
    clearDraftMarker();
  };

  const syncFormRequirements = (mode) => {
    const isHostMode = mode === 'host';
    ['name', 'address', 'lat', 'lng'].forEach((field) => {
      const input = elements.hostForm.elements[field];
      if (input) input.required = isHostMode;
    });
  };

  const setEditingMode = (editing, mode = 'host') => {
    state.isEditingHost = editing;
    state.editorMode = mode;
    syncFormRequirements(mode);
    state.onMapHostSelect = editing && mode === 'new-event' ? (host) => selectHostHost(host) : null;
    document.body.classList.toggle('editing-mode', editing);
    document.body.classList.toggle('host-form-event-mode', editing && mode === 'event');
    document.body.classList.toggle('host-form-new-event-mode', editing && mode === 'new-event');
    elements.adminPanel.classList.toggle('hidden', !editing);
    elements.addEventButton.classList.toggle('hidden', mode !== 'host');
    if (editing && mode === 'new-event') {
      state.filteredIds = null;
      state.mapFilteredIds = null;
    }
    if (editing && (mode === 'host' || mode === 'new-event')) moveMapTo(elements.editorMapSlot);
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
    elements.hostForm.elements.address.value = compactAddress;
    elements.hostForm.elements.lat.value = Number(match.lat).toFixed(6);
    elements.hostForm.elements.lng.value = Number(match.lng).toFixed(6);
    elements.hostForm.elements.googleMapsUrl.value = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(compactAddress)}`;
    updateDraftMarker(match.lat, match.lng);
  };

  const autofillHostAddress = async () => {
    if (state.editorMode !== 'host') return;
    const value = elements.hostForm.elements.address.value.trim();
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
    elements.hostForm.reset();
    elements.hostForm.elements.hostId.value = '';
    elements.hostForm.elements.eventIndex.value = '';
    elements.eventsList.innerHTML = '';
    setCheckedValues(elements.hostForm, 'languages', []);
    elements.adminStatus.textContent = '';
    elements.deleteEditingItemButton.classList.add('hidden');
    elements.saveEditButton.textContent = t(state, 'saveHost');
    state.selectedHostId = null;
    state.editingEventIndex = null;
    elements.adminTitle.textContent = t(state, state.isHostMode ? 'editMyHost' : 'addUpdateHost');
    clearHostSelection();
    addEventRow(elements.eventsList, elements.eventTemplate, state);
    setEditingMode(false);
  };

  const renderHostManager = () => {
    updateChurchOptions();
    const query = elements.hostManagerSearch?.value.trim().toLowerCase() || '';
    const visibleHosts = state.isHostMode ? state.hosts.filter((host) => host.id === state.hostHostId) : state.hosts;
    const rows = visibleHosts.filter((host) => `${host.name} ${host.address || ''}`.toLowerCase().includes(query));

    elements.hostManagerList.innerHTML = rows.length
      ? rows.map((host) => `
          <article class="manager-item">
            <p><strong>${host.name}</strong></p>
            <p>${shortenAddress(host.address) || ''}</p>
            <div class="queue-actions" data-id="${host.id}">
              <button type="button" class="icon-mobile-btn edit-icon-btn" data-action="edit" aria-label="${t(state, 'editPin')}"><span class="icon-label">${t(state, 'editPin')}</span></button>
              ${state.isAdminMode ? `<button type="button" class="secondary icon-mobile-btn delete-icon-btn" data-action="delete" aria-label="${t(state, 'delete')}"><span class="icon-label">${t(state, 'delete')}</span></button>` : ''}
            </div>
          </article>
        `).join('')
      : `<p class="help-text">${t(state, 'noHostsFound')}</p>`;
  };

  const renderEventManager = () => {
    const query = elements.eventManagerSearch?.value.trim().toLowerCase() || '';
    const hosts = state.isHostMode ? state.hosts.filter((host) => host.id === state.hostHostId) : state.hosts;
    const today = new Date().toISOString().slice(0, 10);

    const rows = hosts
      .flatMap((host) => (host.events || []).map((event, eventIndex) => ({ host, event, eventIndex })))
      .filter(({ host, event }) => {
        return event.date >= today && `${host.name} ${event.title || ''} ${event.type}`.toLowerCase().includes(query);
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
      ? visibleRows.map(({ host, event, eventIndex }) => `
          <article class="manager-item">
            <p><strong>${event.title || event.type}</strong></p>
            <p>${event.type}</p>
            <p>${host.name} — ${event.date} ${event.time}</p>
            <div class="queue-actions" data-id="${host.id}" data-event-index="${eventIndex}">
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

  const setHostFields = (host) => {
    elements.hostForm.elements.name.value = host?.name || '';
    elements.hostForm.elements.address.value = host?.address || '';
    elements.hostForm.elements.googleMapsUrl.value = host?.googleMapsUrl || '';
    elements.hostForm.elements.googlePlaceId.value = host?.googlePlaceId || '';
    elements.hostForm.elements.lat.value = host?.lat ?? '';
    elements.hostForm.elements.lng.value = host?.lng ?? '';
    setCheckedValues(elements.hostForm, 'languages', host?.languages || []);
    elements.hostForm.elements.website.value = host?.website || '';
    elements.hostForm.elements.instagram.value = host?.instagram || '';
    elements.hostForm.elements.facebook.value = host?.facebook || '';
    elements.hostForm.elements.whatsapp.value = host?.whatsapp || '';
  };

  const startEditHost = (hostId = null, options = {}) => {
    if (options.mode === 'new-event') {
      if (!state.isAdminMode && !state.isHostMode) return;
      elements.hostForm.reset();
      elements.eventsList.innerHTML = '';
      elements.hostForm.elements.eventIndex.value = '';
      addEventRow(elements.eventsList, elements.eventTemplate, state, defaultEvent());
      elements.adminTitle.textContent = t(state, 'addEvent');
      elements.saveEditButton.textContent = t(state, 'saveEvent');
      elements.deleteEditingItemButton.classList.add('hidden');
      elements.adminStatus.textContent = '';
      clearHostSelection();
      setEditingMode(true, 'new-event');
      if (hostId) {
        const host = state.hosts.find((item) => item.id === hostId);
        if (host) selectHostHost(host);
      }
      return;
    }

    if (hostId && !canEditHost(state, hostId)) return;
    const host = hostId ? state.hosts.find((item) => item.id === hostId) : null;
    const eventIndex = Number.isInteger(options.eventIndex) ? options.eventIndex : null;
    const editingEvent = host && eventIndex !== null ? host.events?.[eventIndex] : null;

    elements.hostForm.reset();
    elements.eventsList.innerHTML = '';
    elements.hostForm.elements.hostId.value = host?.id || '';
    elements.hostForm.elements.eventIndex.value = eventIndex ?? '';
    state.selectedHostId = host?.id || null;
    state.editingEventIndex = eventIndex;
    elements.adminStatus.textContent = '';
    clearHostSelection();

    if (host) {
      setHostFields(host);
      updateDraftMarker(host.lat, host.lng);
    } else {
      setCheckedValues(elements.hostForm, 'languages', []);
      clearDraftMarker();
    }

    if (editingEvent) {
      addEventRow(elements.eventsList, elements.eventTemplate, state, editingEvent);
      elements.adminTitle.textContent = t(state, 'editingEvent');
      elements.editorContext.textContent = `${host.name} — ${shortenAddress(host.address)}`;
      elements.editorContext.classList.remove('hidden');
      elements.saveEditButton.textContent = t(state, 'saveEvent');
      elements.deleteEditingItemButton.classList.remove('hidden');
      setEditingMode(true, 'event');
    } else {
      const events = host?.events?.length ? host.events : [defaultEvent()];
      events.forEach((event) => addEventRow(elements.eventsList, elements.eventTemplate, state, event));
      elements.adminTitle.textContent = host ? t(state, 'editingHost') : t(state, state.isHostMode ? 'editMyHost' : 'addUpdateHost');
      elements.saveEditButton.textContent = t(state, 'saveHost');
      elements.deleteEditingItemButton.classList.toggle('hidden', !host);
      setEditingMode(true, 'host');
    }
  };

  const setWorkspaceVisibility = () => {
    const visible = state.isAdminMode || state.isHostMode;
    elements.myHostSection.classList.toggle('hidden', !visible);
    elements.workspaceStatus.textContent = state.isAdminMode
      ? t(state, 'adminWorkspaceActive')
      : state.isHostMode
        ? t(state, 'hostWorkspaceActive')
        : '';
    elements.hardeningPanel.classList.toggle('hidden', !state.isAdminMode);
    elements.moderationTabs.classList.toggle('hidden', !state.isAdminMode);
    elements.workspaceModeration.classList.toggle('hidden', !visible || state.isEditingHost);
    elements.addHostButton.classList.toggle('hidden', !state.isAdminMode);
    document.querySelectorAll('.admin-only').forEach((node) => node.classList.toggle('hidden', !state.isAdminMode));
    if (!visible) resetForm();
  };

  const persistHost = async (host) => {
    const index = state.hosts.findIndex((item) => item.id === host.id);
    if (index >= 0) state.hosts[index] = host;
    else state.hosts.push(host);
    await saveHosts(state.hosts);
    state.auditLog = await appendAuditLog({ action: index >= 0 ? 'host_updated' : 'host_created', label: host.name });
  };

  const saveHostsWithFeedback = async () => {
    await saveHosts(state.hosts);
    return true;
  };

  elements.addHostButton.addEventListener('click', () => startEditHost());

  elements.toggleHost.addEventListener('click', () => {
    if (state.isHostMode) {
      state.isHostMode = false;
      state.hostHostId = null;
      setWorkspaceVisibility();
      renderHostManager();
      renderEventManager();
      renderModeration();
      return;
    }

    const code = prompt(t(state, 'enterHostCode'));
    if (!code) return;
    const host = state.hosts.find((item) => item.hostPasscode === code.trim());
    if (!host) {
      elements.workspaceStatus.textContent = t(state, 'hostCodeNotFound');
      return;
    }

    state.isHostMode = true;
    state.hostHostId = host.id;
    state.isAdminMode = false;
    setWorkspaceVisibility();
    renderHostManager();
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
      state.hostHostId = null;
      elements.workspaceStatus.textContent = t(state, 'adminWorkspaceActive');
    }

    setWorkspaceVisibility();
    renderHostManager();
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

  elements.hostManagerSearch.addEventListener('input', renderHostManager);
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

  elements.hostForm.elements.address.addEventListener('input', async (event) => populateAddressSuggestions(event.target.value));
  elements.hostForm.elements.address.addEventListener('change', autofillHostAddress);
  elements.hostForm.elements.address.addEventListener('blur', autofillHostAddress);
  elements.hostForm.elements.hostName?.addEventListener('input', () => {
    const match = state.churches.find((church) => church.name.toLowerCase() === elements.hostForm.elements.hostName.value.trim().toLowerCase());
    if (match) selectHostChurch(match);
  });
  elements.hostForm.elements.hostName?.addEventListener('change', () => {
    const match = state.churches.find((church) => church.name.toLowerCase() === elements.hostForm.elements.hostName.value.trim().toLowerCase());
    if (match) selectHostChurch(match);
  });

  elements.hostManagerList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const churchId = button.closest('.queue-actions')?.dataset.id;
    if (!churchId) return;

    if (button.dataset.action === 'edit') {
      startEditHost(churchId);
      return;
    }

    if (button.dataset.action === 'delete' && state.isAdminMode) {
      if (!confirm(`${t(state, 'deleteChurchConfirm')} ${churchId}?`)) return;
      state.churches = state.churches.filter((item) => item.id !== churchId);
      if (!await saveHostsWithFeedback()) return;
      state.auditLog = await appendAuditLog({ action: 'church_deleted', label: churchId });
      renderMarkers();
      renderHostManager();
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
      startEditHost(churchId, { eventIndex });
      return;
    }

    if (button.dataset.action === 'delete-event') {
      if (!confirm(t(state, 'deleteEventConfirm'))) return;
      church.events.splice(eventIndex, 1);
      if (!await saveHostsWithFeedback()) return;
      state.auditLog = await appendAuditLog({ action: 'event_deleted', label: church.name });
      renderEventManager();
      renderMarkers();
      if (state.selectedHostId === churchId) renderHostDetails(church, startEditHost);
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
      state.suggestions = await updateReportStatus(id, status);
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
        if (!await saveHostsWithFeedback()) return;
      }
      state.hostRequests = await updateHostRequestStatus(id, status === 'approved' ? 'approved' : status);
      if (generatedHostCode) {
        const request = state.hostRequests.find((item) => item.id === id);
        if (request) request.generatedHostCode = generatedHostCode;
      }
      state.auditLog = await appendAuditLog({ action: `host_request_${status}`, label: id });
      renderHostManager();
      elements.workspaceStatus.textContent = t(state, 'moderationUpdated');
    }

    renderModeration();
  });

  elements.addEventButton.addEventListener('click', () => addEventRow(elements.eventsList, elements.eventTemplate, state));
  elements.workspaceAddEventButton.addEventListener('click', () => {
    const preferredChurchId = state.hostChurchId || state.selectedHostId || null;
    startEditHost(preferredChurchId, { mode: 'new-event' });
  });
  elements.cancelEditButton.addEventListener('click', resetForm);

  elements.deleteEditingItemButton.addEventListener('click', async () => {
    const churchId = elements.hostForm.elements.hostId.value;
    const church = state.churches.find((item) => item.id === churchId);
    if (!church) return;

    if (state.editorMode === 'event') {
      const eventIndex = Number(elements.hostForm.elements.eventIndex.value);
      if (Number.isInteger(eventIndex) && eventIndex >= 0 && eventIndex < church.events.length) {
        if (!confirm(t(state, 'deleteEventConfirm'))) return;
        church.events.splice(eventIndex, 1);
        if (!await saveHostsWithFeedback()) return;
        state.auditLog = await appendAuditLog({ action: 'event_deleted', label: church.name });
        renderEventManager();
        renderMarkers();
        renderHostDetails(church, startEditHost);
        elements.workspaceStatus.textContent = t(state, 'eventDeleted');
        resetForm();
      }
      return;
    }

    if (!confirm(`${t(state, 'deleteChurchConfirm')} ${church.name}?`)) return;
    state.churches = state.churches.filter((item) => item.id !== churchId);
    if (!await saveHostsWithFeedback()) return;
    state.auditLog = await appendAuditLog({ action: 'church_deleted', label: church.name });
    renderMarkers();
    renderHostManager();
    renderEventManager();
    elements.workspaceStatus.textContent = t(state, 'churchDeleted');
    resetForm();
  });

  map.on('click', async (event) => {
    if (elements.adminPanel.classList.contains('hidden') || state.editorMode !== 'church') return;
    elements.hostForm.elements.lat.value = event.latlng.lat.toFixed(6);
    elements.hostForm.elements.lng.value = event.latlng.lng.toFixed(6);
    updateDraftMarker(event.latlng.lat, event.latlng.lng);
    elements.hostForm.elements.address.value = t(state, 'locateLoading');
    const location = await reverseGeocode(event.latlng.lat, event.latlng.lng);
    if (!location) {
      elements.adminStatus.textContent = t(state, 'addressLookupFailed');
      return;
    }
    applyAddressMatch(location);
    elements.adminStatus.textContent = t(state, 'addressAutofilled');
  });

  elements.hostForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.hostForm);
    const existing = state.churches.find((item) => item.id === formData.get('hostId'));
    const eventRows = readEventRows();

    if (state.editorMode === 'new-event') {
      const churchId = formData.get('hostId');
      const church = state.churches.find((item) => item.id === churchId);
      const nextEvent = eventRows[0];
      if (!church || !nextEvent) {
        elements.adminStatus.textContent = t(state, 'selectChurchPrompt');
        return;
      }
      church.events.push(nextEvent);
      if (!await saveHostsWithFeedback()) return;
      state.auditLog = await appendAuditLog({ action: 'event_created', label: `${church.name}:${nextEvent.title}` });
      renderMarkers();
      renderHostManager();
      renderEventManager();
      renderHostDetails(church, startEditHost);
      elements.workspaceStatus.textContent = t(state, 'eventSaved');
      resetForm();
      return;
    }

    const churchId = formData.get('hostId') || crypto.randomUUID();
    if (state.isHostMode && churchId !== state.hostChurchId && formData.get('hostId')) return;
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
      languages: state.editorMode === 'event' ? existing?.languages || [] : getCheckedValues(elements.hostForm, 'languages'),
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
      if (!await saveHostsWithFeedback()) return;
      state.auditLog = await appendAuditLog({ action: churchIndex >= 0 && eventIndex < existingEvents.length ? 'event_updated' : 'event_created', label: `${church.name}:${nextEvent.title}` });
      renderMarkers();
      renderHostManager();
      renderEventManager();
      renderHostDetails(church, startEditHost);
      elements.workspaceStatus.textContent = t(state, 'eventSaved');
      resetForm();
      return;
    }

    church.events = eventRows;
    await persistChurch(church);
    renderMarkers();
    renderHostManager();
    renderEventManager();
    state.selectedHostId = church.id;
    renderHostDetails(church, startEditHost);
    elements.workspaceStatus.textContent = `${t(state, 'churchSaved')} ${t(state, 'hostPasscode')}: ${church.hostPasscode}`;
    resetForm();
  });

  addEventRow(elements.eventsList, elements.eventTemplate, state);
  updateChurchOptions();
  state.workspaceEventsPage = 1;
  setWorkspaceVisibility();
  renderHostManager();
  renderEventManager();
  renderModeration();

  return { startEditHost, renderHostManager, renderModeration };
}
