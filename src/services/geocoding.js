function normalizeAddressResult(item) {
  const address = item.address || {};
  const houseNumber = address.house_number || '';
  const road = address.road || address.pedestrian || address.footway || '';
  const city = address.city || address.town || address.village || address.municipality || 'Montreal';
  const postcode = address.postcode || '';
  const fullAddress = item.display_name || [houseNumber, road, city, postcode, 'Canada'].filter(Boolean).join(', ');
  const shortAddress = [houseNumber, road].filter(Boolean).join(' ').trim();

  return {
    lat: Number(item.lat),
    lng: Number(item.lon),
    houseNumber,
    road,
    city,
    postcode,
    fullAddress,
    shortAddress: [shortAddress || road || city, city, postcode].filter(Boolean).join(', ')
  };
}

export async function searchMontrealAddresses(query, limit = 5) {
  if (!query?.trim()) return [];

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(limit),
      countrycodes: 'ca',
      q: `${query}, Montreal, Quebec, Canada`
    });
    const result = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!result.ok) return [];
    const data = await result.json();
    return Array.isArray(data) ? data.map(normalizeAddressResult) : [];
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const result = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    if (!result.ok) return null;
    const data = await result.json();
    if (!data?.lat || !data?.lon) return null;
    return normalizeAddressResult(data);
  } catch {
    return null;
  }
}

export async function geocodeAddress(address) {
  const matches = await searchMontrealAddresses(address, 1);
  return matches[0] || null;
}
