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

function expandEvent(event, rangeStart, rangeEnd, church, eventIndex) {
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

  while (cursor <= rangeEnd) {
    if (cursor >= rangeStart) {
      occurrences.push({
        churchId: church.id,
        churchName: church.name,
        churchAddress: church.address,
        type: event.type,
        ageGroup: event.ageGroup || '',
        time: event.time,
        date: cursor.toISOString().slice(0, 10),
        recurrence,
        eventIndex
      });
    }
    next();
  }

  return occurrences;
}

export function collectOccurrences(churches, rangeStart, rangeEnd) {
  return churches
    .flatMap((church) => (church.events || []).flatMap((event, index) => expandEvent(event, rangeStart, rangeEnd, church, index)))
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
      <button type="button" class="secondary calendar-suggest-btn" data-row-index="${rowIndex}">${t(state, 'suggestEventUpdate')}</button>
      ${canManage(state, row.churchId) ? `<button type="button" class="secondary calendar-edit-btn" data-row-index="${rowIndex}">${t(state, 'editPin')}</button>` : ''}
      ${canManage(state, row.churchId) ? `<button type="button" class="secondary calendar-delete-btn" data-row-index="${rowIndex}">${t(state, 'delete')}</button>` : ''}
    </div>
  `;
}

function renderDailyList(rows, state) {
  return rows.map((row, index) => `
    <article class="calendar-item">
      <h4>${row.type}</h4>
      <p><strong>${row.date}</strong> ${t(state, 'atLabel')} ${row.time || '00:00'}</p>
      <p>${row.churchName}</p>
      ${row.churchAddress ? `<p>${shortenAddress(row.churchAddress)}</p>` : ''}
      ${row.ageGroup ? `<p>${t(state, 'ageGroup')}: ${row.ageGroup}</p>` : ''}
      ${renderActionButtons(index, state, row)}
    </article>
  `).join('');
}

function renderGrid(days, rows, state, compactMonth = false) {
  return `
    <div class="calendar-grid ${compactMonth ? 'calendar-grid-month' : 'calendar-grid-week'}">
      ${days.map((day) => {
        const dateKey = day.toISOString().slice(0, 10);
        const dayRows = rows.filter((row) => row.date === dateKey);
        return `
          <section class="calendar-cell ${compactMonth && day.getMonth() !== days[10].getMonth() ? 'calendar-cell-muted' : ''}">
            <header>
              <strong>${compactMonth ? day.getDate() : day.toLocaleDateString('en-CA', { weekday: 'short' })}</strong>
              <span>${compactMonth ? day.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : dateKey}</span>
            </header>
            <div class="calendar-cell-events">
              ${dayRows.length
                ? dayRows.map((row) => {
                    const index = rows.indexOf(row);
                    return `
                      <article class="calendar-badge" data-row-index="${index}">
                        <strong>${row.time || '00:00'}</strong>
                        <span>${row.type}</span>
                        <em>${row.churchName}</em>
                      </article>
                      ${canManage(state, row.churchId) ? `
                        <div class="calendar-inline-actions">
                          <button type="button" class="secondary calendar-edit-btn" data-row-index="${index}">${t(state, 'editPin')}</button>
                          <button type="button" class="secondary calendar-delete-btn" data-row-index="${index}">${t(state, 'delete')}</button>
                        </div>
                      ` : ''}
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

export function renderCalendarList({ state, elements, onSuggestEventUpdate, onEditEvent, onDeleteEvent }) {
  const keyword = elements.calendarKeyword.value.trim().toLowerCase();
  const type = elements.calendarType.value.trim().toLowerCase();
  const language = elements.calendarLanguage.value.trim().toLowerCase();
  const ageGroup = elements.calendarAge?.value || '';
  const from = elements.calendarFrom.value || new Date().toISOString().slice(0, 10);
  const to = elements.calendarTo.value || from;
  const mode = elements.calendarMode?.value || 'daily';

  let rangeStart = normalizeDate(from);
  let rangeEnd = normalizeDate(to);
  if (rangeEnd < rangeStart) rangeEnd = new Date(rangeStart);
  if (mode === 'daily' && from === to) rangeEnd = new Date(rangeStart);
  if (mode === 'weekly' && (!elements.calendarTo.value || from === to)) rangeEnd = addDays(rangeStart, 6);
  if (mode === 'monthly' && (!elements.calendarTo.value || from === to)) rangeEnd = addMonths(rangeStart, 1);

  const rows = collectOccurrences(state.churches, rangeStart, rangeEnd).filter((row) => {
    const church = state.churches.find((item) => item.id === row.churchId);
    if (!church) return false;
    const text = `${row.churchName} ${row.churchAddress || ''} ${row.type}`.toLowerCase();
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

  elements.calendarList.querySelectorAll('.calendar-suggest-btn, .calendar-badge').forEach((button) => {
    button.addEventListener('click', () => {
      const row = rows[Number(button.dataset.rowIndex)];
      if (!row) return;
      const church = state.churches.find((item) => item.id === row.churchId);
      if (!church) return;
      onSuggestEventUpdate?.(church, row);
    });
  });

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
