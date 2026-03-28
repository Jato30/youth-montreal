import { t } from '../i18n.js';
import { googlePlaceLink } from '../utils/googlePlace.js';
import { shortenAddress } from '../utils/address.js';

function hasUpcomingEvent(event) {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() + 7);
  const eventDate = new Date(`${event.date}T${event.time}`);
  return eventDate >= today && eventDate <= cutoff;
}

export function renderChurchDetails({ state, church, detailsElement, emptyStateElement, onEdit, onSuggestPlaceUpdate }) {
  const upcoming = (church.events || []).filter(hasUpcomingEvent).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const canEdit = state.isAdminMode || (state.isHostMode && state.hostChurchId === church.id);
  const publicAddress = shortenAddress(church.address);

  detailsElement.innerHTML = `
    <article class="detail-card">
      <h3>${church.name}</h3>
      ${publicAddress ? `<p>${publicAddress}</p>` : ''}
      <p><a href="${googlePlaceLink(church)}" target="_blank" rel="noreferrer">${t(state, 'openMaps')}</a></p>
      ${church.languages?.length ? `<p><strong>${t(state, 'languagesLabel')}</strong> ${church.languages.join(', ')}</p>` : ''}
      <div class="detail-actions-row detail-actions-row-single">
        <button type="button" class="secondary issue-report-btn" aria-label="${t(state, 'reportIssue')}">!</button>
        <span class="help-text">${t(state, 'isSomethingWrong')}</span>
        ${canEdit ? `<button type="button" class="edit-pin-btn">${t(state, 'editPin')}</button>` : ''}
      </div>
      <ul>
        ${upcoming.length
          ? upcoming.map((event) => `<li><strong>${event.title || event.type}</strong><br />${event.date} ${event.time} — ${event.type}</li>`).join('')
          : `<li>${t(state, 'noGatherings')}</li>`}
      </ul>
      <p>
        ${church.website ? `<a href="${church.website}" target="_blank" rel="noreferrer">${t(state, 'website')}</a>` : ''}
        ${church.instagram ? ` · <a href="${church.instagram}" target="_blank" rel="noreferrer">${t(state, 'instagram')}</a>` : ''}
        ${church.facebook ? ` · <a href="${church.facebook}" target="_blank" rel="noreferrer">${t(state, 'facebook')}</a>` : ''}
        ${church.whatsapp ? ` · <a href="${church.whatsapp}" target="_blank" rel="noreferrer">${t(state, 'whatsapp')}</a>` : ''}
      </p>
      ${state.isAdminMode && church.hostPasscode ? `<p class="help-text"><strong>${t(state, 'hostPasscode')}:</strong> ${church.hostPasscode}</p>` : ''}
    </article>
  `;

  detailsElement.querySelector('.edit-pin-btn')?.addEventListener('click', () => onEdit(church.id));
  detailsElement.querySelector('.issue-report-btn')?.addEventListener('click', () => onSuggestPlaceUpdate?.(church));

  detailsElement.classList.remove('hidden');
  emptyStateElement.classList.add('hidden');
}
