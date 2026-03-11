const STORAGE_KEY = 'youth-montreal-churches';

const now = new Date();
const inDays = (count) => {
  const d = new Date();
  d.setDate(now.getDate() + count);
  return d.toISOString().slice(0, 10);
};

const defaultChurches = [
  {
    id: crypto.randomUUID(),
    name: 'Eglise Nouvelle Vie',
    lat: 45.4948,
    lng: -73.7206,
    website: 'https://www.nouvellevie.com/',
    instagram: 'https://www.instagram.com/nouvelleviechurch/',
    facebook: 'https://www.facebook.com/nouvelleviechurch/',
    whatsapp: '',
    events: [
      { date: inDays(1), time: '19:00', type: 'Young Adults Prayer Night' },
      { date: inDays(3), time: '18:30', type: 'Bible Study Group' }
    ]
  },
  {
    id: crypto.randomUUID(),
    name: 'La Chapelle Montréal',
    lat: 45.5203,
    lng: -73.5691,
    website: 'https://lachapelle.me/',
    instagram: 'https://www.instagram.com/lachapelle.me/',
    facebook: 'https://www.facebook.com/lachapelleme/',
    whatsapp: '',
    events: [
      { date: inDays(2), time: '19:30', type: 'Youth Fellowship' },
      { date: inDays(5), time: '10:30', type: 'Sunday Service' }
    ]
  }
];

const parseChurches = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultChurches;
  try {
    return JSON.parse(saved);
  } catch {
    return defaultChurches;
  }
};

const state = {
  churches: parseChurches(),
  markers: new Map()
};

const map = L.map('map', {
  dragging: true,
  touchZoom: true,
  doubleClickZoom: true,
  scrollWheelZoom: true,
  boxZoom: true,
  keyboard: true,
  tap: true
}).setView([45.5017, -73.5673], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const details = document.querySelector('#details');
const emptyState = document.querySelector('#empty-state');
const adminPanel = document.querySelector('#admin-panel');
const toggleAdmin = document.querySelector('#toggle-admin');
const churchForm = document.querySelector('#church-form');
const eventsList = document.querySelector('#events-list');
const eventTemplate = document.querySelector('#event-template');
const addEventButton = document.querySelector('#add-event');

function saveChurches() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.churches));
}

function mapLink(church) {
  return `https://www.google.com/maps/search/?api=1&query=${church.lat},${church.lng}`;
}

function renderChurchDetails(church) {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() + 7);

  const upcoming = church.events
    .filter((event) => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      return eventDate >= today && eventDate <= cutoff;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  details.innerHTML = `
    <article class="detail-card">
      <h3>${church.name}</h3>
      <p><a href="${mapLink(church)}" target="_blank" rel="noreferrer">Open pin in maps app</a></p>
      <ul>
        ${upcoming.length ? upcoming.map((event) => `<li>${event.date} at ${event.time} — ${event.type}</li>`).join('') : '<li>No gatherings listed in next 7 days.</li>'}
      </ul>
      <p>
        ${church.website ? `<a href="${church.website}" target="_blank" rel="noreferrer">Website</a>` : ''}
        ${church.instagram ? ` · <a href="${church.instagram}" target="_blank" rel="noreferrer">Instagram</a>` : ''}
        ${church.facebook ? ` · <a href="${church.facebook}" target="_blank" rel="noreferrer">Facebook</a>` : ''}
        ${church.whatsapp ? ` · <a href="${church.whatsapp}" target="_blank" rel="noreferrer">WhatsApp</a>` : ''}
      </p>
    </article>
  `;
  details.classList.remove('hidden');
  emptyState.classList.add('hidden');
}

function addMarker(church) {
  const marker = L.marker([Number(church.lat), Number(church.lng)]).addTo(map);
  marker.bindPopup(`<strong>${church.name}</strong>`);
  marker.on('click', () => renderChurchDetails(church));
  state.markers.set(church.id, marker);
}

function renderMarkers() {
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();
  state.churches.forEach(addMarker);
}

function addEventRow(event = { date: inDays(0), time: '19:00', type: '' }) {
  const node = eventTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[name="date"]').value = event.date;
  node.querySelector('[name="time"]').value = event.time;
  node.querySelector('[name="type"]').value = event.type;
  node.querySelector('.remove-event').addEventListener('click', () => node.remove());
  eventsList.appendChild(node);
}

toggleAdmin.addEventListener('click', () => {
  adminPanel.classList.toggle('hidden');
  toggleAdmin.textContent = adminPanel.classList.contains('hidden') ? 'ADM Mode' : 'Close ADM';
});

addEventButton.addEventListener('click', () => addEventRow());

churchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(churchForm);
  const rowNodes = Array.from(eventsList.querySelectorAll('.event-row'));

  const events = rowNodes
    .map((node) => ({
      date: node.querySelector('[name="date"]').value,
      time: node.querySelector('[name="time"]').value,
      type: node.querySelector('[name="type"]').value.trim()
    }))
    .filter((row) => row.date && row.time && row.type);

  const church = {
    id: crypto.randomUUID(),
    name: formData.get('name').trim(),
    lat: Number(formData.get('lat')),
    lng: Number(formData.get('lng')),
    website: formData.get('website').trim(),
    instagram: formData.get('instagram').trim(),
    facebook: formData.get('facebook').trim(),
    whatsapp: formData.get('whatsapp').trim(),
    events
  };

  state.churches.push(church);
  saveChurches();
  renderMarkers();
  churchForm.reset();
  eventsList.innerHTML = '';
  addEventRow();
});

renderMarkers();
addEventRow();
