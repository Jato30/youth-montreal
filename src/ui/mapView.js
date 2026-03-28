import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../config.js';

export function createMap() {
  const map = L.map('map', {
    dragging: true,
    touchZoom: true,
    doubleClickZoom: true,
    scrollWheelZoom: true,
    boxZoom: true,
    keyboard: true,
    tap: true
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  return map;
}

export function renderMarkers({ map, state, onSelectChurch }) {
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();

  state.churches.forEach((church) => {
    if (state.filteredIds && !state.filteredIds.has(church.id)) return;
    const marker = L.marker([Number(church.lat), Number(church.lng)]).addTo(map);
    marker.bindPopup(`<strong>${church.name}</strong>`);
    marker.on('click', () => onSelectChurch(church));
    state.markers.set(church.id, marker);
  });
}

export function resetMapView(map) {
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
}
