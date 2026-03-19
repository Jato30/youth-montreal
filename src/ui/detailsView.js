import { t } from '../i18n.js';
import { googlePlaceLink } from '../utils/googlePlace.js';

export function renderChurchDetails({ state, church, detailsElement, emptyStateElement, onEdit, onSuggestPlaceUpdate, onSuggestEventUpdate }) {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() + 7);

  const upcoming = (church.events || [])
    .filter((event) => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      return eventDate >= today && eventDate <= cutoff;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const canEdit = state.isAdminMode || (state.isHostMode && state.hostChurchId === church.id);

  detailsElement.innerHTML = `
    <article class="detail-card">
      <h3>${church.name}</h3>
      ${church.address ? `<p>${church.address}</p>` : ''}
      <p><a href="${googlePlaceLink(church)}" target="_blank" rel="noreferrer">${t(state, 'openMaps')}</a></p>
      ${church.googlePlaceId ? `<p><strong>${t(state, 'googlePlaceIdLabel')}</strong> ${church.googlePlaceId}</p>` : ''}
      ${church.languages?.length ? `<p><strong>${t(state, 'languagesLabel')}</strong> ${church.languages.join(', ')}</p>` : ''}
      <div class="detail-actions-row">
        <button type="button" class="suggest-place-btn secondary" data-id="${church.id}">${t(state, 'suggestPlaceUpdate')}</button>
      </div>
      <ul>
        ${upcoming.length ? upcoming.map((e, index) => `<li>${e.date} ${e.time} — ${e.type} <button type="button" class="inline-action suggest-event-btn" data-event-index="${index}">${t(state, 'suggestEventUpdate')}</button></li>`).join('') : `<li>${t(state, 'noGatherings')}</li>`}
      </ul>
      <p>
        ${church.website ? `<a href="${church.website}" target="_blank" rel="noreferrer">${t(state, 'website')}</a>` : ''}
        ${church.instagram ? ` · <a href="${church.instagram}" target="_blank" rel="noreferrer">${t(state, 'instagram')}</a>` : ''}
        ${church.facebook ? ` · <a href="${church.facebook}" target="_blank" rel="noreferrer">${t(state, 'facebook')}</a>` : ''}
        ${church.whatsapp ? ` · <a href="${church.whatsapp}" target="_blank" rel="noreferrer">${t(state, 'whatsapp')}</a>` : ''}
      </p>
      ${state.isAdminMode && church.hostPasscode ? `<p class="help-text"><strong>${t(state, 'hostPasscode')}:</strong> ${church.hostPasscode}</p>` : ''}
      ${canEdit ? `<button type="button" class="edit-pin-btn" data-id="${church.id}">${t(state, 'editPin')}</button>` : ''}
    </article>
  `;

  detailsElement.querySelector('.edit-pin-btn')?.addEventListener('click', () => onEdit(church.id));
  detailsElement.querySelector('.suggest-place-btn')?.addEventListener('click', () => onSuggestPlaceUpdate?.(church));
  detailsElement.querySelectorAll('.suggest-event-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const eventIndex = Number(button.dataset.eventIndex);
      const event = upcoming[eventIndex];
      if (event) onSuggestEventUpdate?.(church, event);
    });
  });
  detailsElement.classList.remove('hidden');
  emptyStateElement.classList.add('hidden');
}
