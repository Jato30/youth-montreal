import { t } from '../i18n.js';

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

function expandEvent(event, rangeStart, rangeEnd, church) {
  const baseDate = normalizeDate(event.date);
  const until = event.until ? normalizeDate(event.until) : rangeEnd;
  const recurrence = event.recurrence || 'none';

  const occurrences = [];
  let cursor = new Date(baseDate);

  const next = () => {
    if (recurrence === 'weekly') cursor = addDays(cursor, 7);
    else if (recurrence === 'biweekly') cursor = addDays(cursor, 14);
    else if (recurrence === 'monthly') cursor = addMonths(cursor, 1);
    else cursor = addDays(rangeEnd, 1);
  };

  while (cursor <= rangeEnd && cursor <= until) {
    if (cursor >= rangeStart) {
      occurrences.push({
        churchId: church.id,
        churchName: church.name,
        churchAddress: church.address,
        type: event.type,
        ageGroup: event.ageGroup || '',
        time: event.time,
        date: cursor.toISOString().slice(0, 10),
        recurrence
      });
    }
    next();
  }

  return occurrences;
}

export function collectOccurrences(churches, rangeStart, rangeEnd) {
  return churches
    .flatMap((church) => (church.events || []).flatMap((event) => expandEvent(event, rangeStart, rangeEnd, church)))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function getGroupedHeading(mode, row) {
  if (mode === 'monthly') return row.date.slice(0, 7);
  if (mode === 'weekly') {
    const start = new Date(`${row.date}T00:00:00`);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return `Week of ${start.toISOString().slice(0, 10)}`;
  }
  return row.date;
}

export function renderCalendarList({ state, elements, onSuggestEventUpdate }) {
  const keyword = elements.calendarKeyword.value.trim().toLowerCase();
  const type = elements.calendarType.value.trim().toLowerCase();
  const language = elements.calendarLanguage.value.trim().toLowerCase();
  const ageGroup = elements.calendarAge?.value || '';
  const from = elements.calendarFrom.value || new Date().toISOString().slice(0, 10);
  const mode = elements.calendarMode?.value || 'daily';

  const rangeStart = normalizeDate(from);
  const rangeEnd = new Date(rangeStart);
  if (mode === 'daily') rangeEnd.setDate(rangeEnd.getDate() + 1);
  if (mode === 'weekly') rangeEnd.setDate(rangeEnd.getDate() + 7);
  if (mode === 'monthly') rangeEnd.setMonth(rangeEnd.getMonth() + 1);

  const rows = collectOccurrences(state.churches, rangeStart, rangeEnd).filter((row) => {
    const church = state.churches.find((item) => item.id === row.churchId);
    if (!church) return false;
    const text = `${row.churchName} ${row.churchAddress || ''} ${row.type}`.toLowerCase();
    const byKeyword = !keyword || text.includes(keyword);
    const byType = !type || row.type.toLowerCase().includes(type);
    const byLanguage = !language || (church.languages || []).join(' ').toLowerCase().includes(language);
    const byAge = !ageGroup || (row.ageGroup || '').toLowerCase() === ageGroup.toLowerCase();
    return byKeyword && byType && byLanguage && byAge;
  });

  let previousGroup = '';
  elements.calendarCount.textContent = `${rows.length} ${t(state, 'eventsFound')}`;
  elements.calendarList.innerHTML = rows.length
    ? rows
        .map((row, index) => {
          const heading = getGroupedHeading(mode, row);
          const showHeading = heading !== previousGroup;
          previousGroup = heading;
          return `
            ${showHeading ? `<h3 class="calendar-group-heading">${heading}</h3>` : ''}
            <article class="calendar-item">
              <h4>${row.type}</h4>
              <p><strong>${row.date}</strong> ${t(state, 'atLabel')} ${row.time || '00:00'}</p>
              <p>${row.churchName}</p>
              ${row.churchAddress ? `<p>${row.churchAddress}</p>` : ''}
              ${row.ageGroup ? `<p>${t(state, 'ageGroup')}: ${row.ageGroup}</p>` : ''}
              <button type="button" class="secondary calendar-suggest-btn" data-row-index="${index}">${t(state, 'suggestEventUpdate')}</button>
            </article>
          `;
        })
        .join('')
    : `<p class="help-text">${t(state, 'noEventsForFilters')}</p>`;

  elements.calendarList.querySelectorAll('.calendar-suggest-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const row = rows[Number(button.dataset.rowIndex)];
      if (!row) return;
      const church = state.churches.find((item) => item.id === row.churchId);
      if (!church) return;
      onSuggestEventUpdate?.(church, row);
    });
  });
}
