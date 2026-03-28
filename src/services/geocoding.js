export async function reverseGeocode(lat, lng) {
  try {
    const result = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    if (!result.ok) return '';
    const data = await result.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

export async function geocodeAddress(address) {
  try {
    const query = encodeURIComponent(address);
    const result = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
    if (!result.ok) return null;
    const data = await result.json();
    if (!data.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}
