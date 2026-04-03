import { geocodeAddress, searchMontrealAddresses } from '../services/geocoding.js';
import { haversineKm } from '../utils/distance.js';
import { t } from '../i18n.js';

export function attachFinderController({ state, map, elements, renderMarkers, renderChurchDetails }) {
  const addressList = document.querySelector('#montreal-addresses');

  const applyLocationFilter = async ({ shouldGeocode = true } = {}) => {
    const address = elements.finderForm.elements.address.value.trim();
    const radiusKm = Number(elements.finderForm.elements.radiusKm.value);

    if (!address) {
      state.filteredIds = null;
      elements.finderStatus.textContent = '';
      renderMarkers();
      return null;
    }

    let point = state.lastFinderPoint;
    if (shouldGeocode || !point || point.query !== address) {
      elements.finderStatus.textContent = t(state, 'searchLoading');
      const match = await geocodeAddress(address);
      if (!match) {
        state.filteredIds = null;
        state.lastFinderPoint = null;
        elements.finderStatus.textContent = t(state, 'searchNoResults');
        renderMarkers();
        return null;
      }
      point = { ...match, query: match.shortAddress || match.fullAddress };
      state.lastFinderPoint = point;
      elements.finderForm.elements.address.value = match.shortAddress || match.fullAddress;
    }

    const matches = state.churches.filter((church) => haversineKm(point.lat, point.lng, Number(church.lat), Number(church.lng)) <= radiusKm);
    state.filteredIds = new Set(matches.map((church) => church.id));
    renderMarkers();

    if (!matches.length) {
      elements.finderStatus.textContent = t(state, 'searchNoResults');
      map.setView([point.lat, point.lng], 12);
      return [];
    }

    const visibleMatches = matches.filter((church) => !state.mapFilteredIds || state.mapFilteredIds.has(church.id));
    elements.finderStatus.textContent = `${visibleMatches.length} ${t(state, 'searchResultCount')}`;
    const bounds = L.latLngBounds(matches.map((church) => [Number(church.lat), Number(church.lng)]));
    map.fitBounds(bounds.pad(0.25));

    const selected = visibleMatches[0] || matches[0];
    if (selected) {
      state.selectedChurchId = selected.id;
      renderChurchDetails(selected);
    }

    document.querySelector('#find-church')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return matches;
  };

  elements.finderForm.elements.address.addEventListener('input', async (event) => {
    state.lastFinderPoint = null;
    const matches = await searchMontrealAddresses(event.target.value, 6);
    if (!matches.length || !addressList) return;
    addressList.innerHTML = matches.map((item) => `<option value="${item.shortAddress || item.fullAddress}"></option>`).join('');
  });

  elements.finderForm.elements.address.addEventListener('change', () => applyLocationFilter({ shouldGeocode: true }));
  elements.finderForm.elements.radiusKm.addEventListener('change', () => applyLocationFilter({ shouldGeocode: false }));
  elements.finderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await applyLocationFilter({ shouldGeocode: true });
  });

  return {
    applyLocationFilter,
    clearLocationFilter() {
      state.filteredIds = null;
      state.lastFinderPoint = null;
      elements.finderStatus.textContent = '';
      renderMarkers();
    }
  };
}
