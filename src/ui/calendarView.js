import { t } from '../i18n.js';
import { shortenAddress } from '../utils/address.js';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function normalizeDate(value) {
  return new Date(`${value}T00:00:00`);
}

function expandEvent(event, rangeStart, rangeEnd, church, eventIndex, nextOnly = false) {
  const baseDate = normalizeDate(event.date);
  const recurrence = event.recurrence || 'none';
  const occurrences = [];
  let cursor = new Date(baseDate);

  const next = () => {
    if (recurrence === 'weekly') cursor = addDays(cursor, 7);
    else if (recurrence === 'biweekly') cursor = addDays(cursor, 14);
    else if (recurrence === 'monthly') cursor = addMonths(cursor, 1);
    else cursor = addDays(rangeEnd, 1);
  };

  // If nextOnly is true and no range filters are set, we find only the first occurrence from today
  const today = normalizeDate(new Date().toISOString().slice(0, 10));

  while (cursor <= rangeEnd) {
    if (cursor >= rangeStart) {
      occurrences.push({
        churchId: church.id,
        churchName: church.name,
        churchAddress: church.address,
        title: event.title || event.type,
        type: event.type,
        ageGroup: event.ageGroup || '',
        time: event.time,
        date: cursor.toISOString().slice(0, 10),
        recurrence,
        eventIndex
      });
      if (nextOnly) break; // Stop after first occurrence if we just want the next one
    }
    next();
  }

  return occurrences;
}

export function collectOccurrences(churches, rangeStart, rangeEnd, nextOnly = false) {
  return churches
    .flatMap((church) => (church.events || []).flatMap((event, index) => expandEvent(event, rangeStart, rangeEnd, church, index, nextOnly)))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function canManage(state, churchId) {
  return state.isAdminMode || (state.isHostMode && state.hostChurchId === churchId);
}

function renderActionButtons(rowIndex, state, row) {
  return `
    <div class="finder-actions compact-actions">
      <button type="button" class="secondary calendar-suggest-btn icon-mobile-btn suggest-icon-btn" data-row-index="${rowIndex}" aria-label="${t(state, 'suggestEventUpdate')}"><span class="icon-label">${t(state, 'suggestEventUpdate')}</span></button>
      ${canManage(state, row.churchId) ? `<button type="button" class="secondary calendar-edit-btn icon-mobile-btn edit-icon-btn" data-row-index="${rowIndex}" aria-label="${t(state, 'editPin')}"><span class="icon-label">${t(state, 'editPin')}</span></button>` : ''}
      ${canManage(state, row.churchId) ? `<button type="button" class="secondary calendar-delete-btn icon-mobile-btn delete-icon-btn" data-row-index="${rowIndex}" aria-label="${t(state, 'delete')}"><span class="icon-label">${t(state, 'delete')}</span></button>` : ''}
    </div>
  `;
}

function renderDailyList(rows, state) {
  return rows.map((row, index) => `
    <article class="calendar-item">
      <h4>${row.title || row.type}</h4>
      <p>${row.type}</p>
      <p><strong>${row.date}</strong> ${t(state, 'atLabel')} ${row.time || '00:00'}</p>
      <p>${row.churchName}</p>
      ${row.churchAddress ? `<p>${shortenAddress(row.churchAddress)}</p>` : ''}
      ${row.ageGroup ? `<p>${t(state, 'ageGroup')}: ${row.ageGroup}</p>` : ''}
      ${renderActionButtons(index, state, row)}
    </article>
  `).join('');
}

function renderGrid(days, rows, state, compactMonth = false) {
  const isMobile = window.innerWidth <= 900;

  if (isMobile) {
    // Mobile view: Agenda style list grouped by day (like Google Calendar mobile)
    return `
      <div class="calendar-mobile-agenda">
        ${days.map((day) => {
          const dateKey = day.toISOString().slice(0, 10);
          const dayRows = rows.filter((row) => row.date === dateKey);
          if (!dayRows.length) return ''; // Skip empty days in mobile agenda

          return `
            <div class="agenda-day-group">
              <div class="agenda-day-header">
                <strong>${day.toLocaleDateString(undefined, { weekday: 'long' })}</strong>
                <span>${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
              <div class="agenda-events">
                ${dayRows.map((row) => {
                  const index = rows.indexOf(row);
                  return `
                    <div class="agenda-event-card" data-row-index="${index}">
                      <div class="agenda-event-time">${row.time || '00:00'}</div>
                      <div class="agenda-event-info">
                        <strong>${row.title || row.type}</strong>
                        <span>${row.churchName}</span>
                        <small>${row.type}</small>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('') || `<p class="help-text">${t(state, 'noEventsForFilters')}</p>`}
      </div>
    `;
  }

  // Desktop view: Standard grid
  return `
    <div class="calendar-grid ${compactMonth ? 'calendar-grid-month' : 'calendar-grid-week'}">
      ${days.map((day) => {
        const dateKey = day.toISOString().slice(0, 10);
        const dayRows = rows.filter((row) => row.date === dateKey);
        return `
          <section class="calendar-cell ${compactMonth && day.getMonth() !== days[10].getMonth() ? 'calendar-cell-muted' : ''}" data-day-key="${dateKey}">
            <header>
              <strong>${compactMonth ? day.getDate() : day.toLocaleDateString('en-CA', { weekday: 'short' })}</strong>
              <span>${compactMonth ? day.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : dateKey}</span>
            </header>
            <div class="calendar-cell-events">
              ${dayRows.length
                ? dayRows.map((row) => {
                    const index = rows.indexOf(row);
                    return `
                      <article class="calendar-badge ${canManage(state, row.churchId) ? 'calendar-badge-manageable' : ''}" data-row-index="${index}" data-day-key="${dateKey}">
                        <strong>${row.time || '00:00'}</strong>
                        <span>${row.title || row.type}</span>
                        <small>${row.type}</small>
                        <em>${row.churchName}</em>
                        ${canManage(state, row.churchId) ? '<span class="calendar-danger-icon" aria-hidden="true">⚠</span>' : ''}
                      </article>
                    `;
                  }).join('')
                : `<p class="help-text">${t(state, 'noEventsForFilters')}</p>`}
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;
}

export function renderCalendarList({ state, elements, onSuggestEventUpdate, onEditEvent, onDeleteEvent, onOpenDay }) {
  const keyword = elements.calendarKeyword.value.trim().toLowerCase();
  const type = elements.calendarType.value.trim().toLowerCase();
  const language = elements.calendarLanguage.value.trim().toLowerCase();
  const ageGroup = elements.calendarAge?.value || '';
  const from = elements.calendarFrom.value;
  const to = elements.calendarTo.value;
  const mode = elements.calendarMode?.value || 'daily';

  // If daily mode and NO specific date filter is applied, we use the current anchor day
  const anchor = state.calendarAnchorDate instanceof Date ? state.calendarAnchorDate : new Date();
  const todayStr = anchor.toISOString().slice(0, 10);
  let effectiveFrom = from || todayStr;
  let effectiveTo = to || effectiveFrom;

  if (mode === 'daily' && !from) {
    effectiveFrom = todayStr;
    effectiveTo = todayStr;
  }

  let rangeStart = normalizeDate(effectiveFrom);
  let rangeEnd = normalizeDate(effectiveTo);

  if (rangeEnd < rangeStart) rangeEnd = new Date(rangeStart);

  if (mode === 'weekly' && (!to || effectiveFrom === effectiveTo)) rangeEnd = addDays(rangeStart, 6);
  if (mode === 'monthly' && (!to || effectiveFrom === effectiveTo)) rangeEnd = addMonths(rangeStart, 1);

  // We only show one occurrence (next only) IF there's no specific date filter range applied
  const isFilteringByRange = from || to;
  const nextOnly = !isFilteringByRange;

  const rows = collectOccurrences(state.churches, rangeStart, rangeEnd, nextOnly).filter((row) => {
    const church = state.churches.find((item) => item.id === row.churchId);
    if (!church) return false;
    const text = `${row.churchName} ${row.churchAddress || ''} ${row.title || ''} ${row.type}`.toLowerCase();
    const byKeyword = !keyword || text.includes(keyword);
    const byType = !type || row.type.toLowerCase().includes(type);
    const byLanguage = !language || (church.languages || []).join(' ').toLowerCase().includes(language);
    const byAge = !ageGroup || (row.ageGroup || '').toLowerCase() === ageGroup.toLowerCase();
    const rowDate = normalizeDate(row.date);
    const byDate = rowDate >= rangeStart && rowDate <= rangeEnd;
    return byKeyword && byType && byLanguage && byAge && byDate;
  });

  elements.calendarCount.textContent = `${rows.length} ${t(state, 'eventsFound')}`;
  if (!rows.length) {
    elements.calendarList.innerHTML = `<p class="help-text">${t(state, 'noEventsForFilters')}</p>`;
    return;
  }

  if (mode === 'daily') elements.calendarList.innerHTML = renderDailyList(rows, state);
  if (mode === 'weekly') {
    const weekStart = startOfWeek(rangeStart);
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    elements.calendarList.innerHTML = renderGrid(days, rows, state, false);
  }
  if (mode === 'monthly') {
    const monthStart = startOfWeek(new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1));
    const days = Array.from({ length: 35 }, (_, index) => addDays(monthStart, index));
    elements.calendarList.innerHTML = renderGrid(days, rows, state, true);
  }

  elements.calendarList.querySelectorAll('.calendar-suggest-btn, .calendar-badge, .agenda-event-card').forEach((button) => {
    button.addEventListener('click', () => {
      const row = rows[Number(button.dataset.rowIndex)];
      if (!row) return;
      const church = state.churches.find((item) => item.id === row.churchId);
      if (!church) return;
      if (mode !== 'daily') {
        if (canManage(state, row.churchId)) onEditEvent?.(row);
        else onOpenDay?.(row.date);
        return;
      }
      onSuggestEventUpdate?.(church, row);
    });
  });

  if (mode === 'monthly') {
    elements.calendarList.querySelectorAll('.calendar-cell').forEach((cell) => {
      cell.addEventListener('click', (event) => {
        if (event.target.closest('.calendar-badge')) return;
        const dayKey = cell.dataset.dayKey;
        if (!dayKey) return;
        onOpenDay?.(dayKey);
      });
    });
  }

  elements.calendarList.querySelectorAll('.calendar-edit-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const row = rows[Number(button.dataset.rowIndex)];
      if (!row || !canManage(state, row.churchId)) return;
      onEditEvent?.(row);
    });
  });

  elements.calendarList.querySelectorAll('.calendar-delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const row = rows[Number(button.dataset.rowIndex)];
      if (!row || !canManage(state, row.churchId)) return;
      onDeleteEvent?.(row);
    });
  });
}
