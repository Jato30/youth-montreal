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

export function renderCalendarList({ state, elements }) {
  const keyword = elements.calendarKeyword.value.trim().toLowerCase();
  const type = elements.calendarType.value;
  const language = elements.calendarLanguage.value.trim().toLowerCase();
  const from = elements.calendarFrom.value || new Date().toISOString().slice(0, 10);
  const to = elements.calendarTo.value || addDays(new Date(), 30).toISOString().slice(0, 10);

  const rangeStart = normalizeDate(from);
  const rangeEnd = normalizeDate(to);

  const rows = collectOccurrences(state.churches, rangeStart, rangeEnd).filter((row) => {
    const church = state.churches.find((item) => item.id === row.churchId);
    if (!church) return false;

    const text = `${row.churchName} ${row.churchAddress || ''} ${row.type}`.toLowerCase();
    const byKeyword = !keyword || text.includes(keyword);
    const byType = !type || row.type.toLowerCase().includes(type.toLowerCase());
    const byLanguage = !language || (church.languages || []).join(' ').toLowerCase().includes(language);
    return byKeyword && byType && byLanguage;
  });

  elements.calendarCount.textContent = `${rows.length} event(s)`;
  elements.calendarList.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
      <article class="calendar-item">
        <h4>${row.type}</h4>
        <p><strong>${row.date}</strong> at ${row.time || '00:00'}</p>
        <p>${row.churchName}</p>
        ${row.churchAddress ? `<p>${row.churchAddress}</p>` : ''}
        ${row.recurrence && row.recurrence !== 'none' ? `<p>Repeats: ${row.recurrence}</p>` : ''}
      </article>
    `
        )
        .join('')
    : '<p class="help-text">No events found for current filters.</p>';
}
