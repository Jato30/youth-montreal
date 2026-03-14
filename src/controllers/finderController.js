import { geocodeAddress } from '../services/geocoding.js';
import { haversineKm } from '../utils/distance.js';
import { t } from '../i18n.js';

export function attachFinderController({ state, map, elements, renderMarkers, renderChurchDetails }) {
  elements.finderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const address = elements.finderForm.elements.address.value.trim();
    const radiusKm = Number(elements.finderForm.elements.radiusKm.value);
    if (!address) return;

    elements.finderStatus.textContent = t(state, 'searchLoading');
    const point = await geocodeAddress(address);
    if (!point) {
      elements.finderStatus.textContent = t(state, 'searchNoResults');
      return;
    }

    const matches = state.churches.filter((church) => haversineKm(point.lat, point.lng, Number(church.lat), Number(church.lng)) <= radiusKm);
    state.filteredIds = new Set(matches.map((church) => church.id));
    renderMarkers();

    if (!matches.length) {
      elements.finderStatus.textContent = t(state, 'searchNoResults');
      map.setView([point.lat, point.lng], 12);
    } else {
      elements.finderStatus.textContent = `${matches.length} ${t(state, 'searchResultCount')}`;
      const bounds = L.latLngBounds(matches.map((church) => [Number(church.lat), Number(church.lng)]));
      map.fitBounds(bounds.pad(0.25));
      state.selectedChurchId = matches[0].id;
      renderChurchDetails(matches[0]);
    }

    document.querySelector('#map-section').scrollIntoView({ behavior: 'smooth' });
  });
}
