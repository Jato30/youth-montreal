import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../config.js';

const RED_ICON = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const BLUE_ICON = new L.Icon.Default();

export function createMap(id = 'map') {
  const map = L.map(id, {
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
    if (state.mapFilteredIds && !state.mapFilteredIds.has(church.id)) return;

    const isSelected = state.selectedChurchId === church.id;
    const marker = L.marker([Number(church.lat), Number(church.lng)], {
      icon: isSelected ? RED_ICON : BLUE_ICON
    }).addTo(map);

    marker.bindPopup(`<strong>${church.name}</strong>`);
    marker.on('click', () => onSelectChurch(church));
    state.markers.set(church.id, marker);
  });
}

export function resetMapView(map) {
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
}
