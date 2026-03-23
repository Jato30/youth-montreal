export function googlePlaceLink(church) {
  const placeId = church.googlePlaceId?.trim();
  const mapsUrl = church.googleMapsUrl?.trim();

  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
  }

  if (mapsUrl) return mapsUrl;

  if (church.lat && church.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${church.lat},${church.lng}`;
  }

  return 'https://www.google.com/maps';
}
