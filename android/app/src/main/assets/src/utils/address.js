function abbreviateStreet(value = '') {
  return value
    .replace(/\bBoulevard\b/gi, 'Boul')
    .replace(/\bAvenue\b/gi, 'Av')
    .replace(/\bStreet\b/gi, 'St')
    .replace(/\bRoad\b/gi, 'Rd')
    .replace(/\bDrive\b/gi, 'Dr')
    .replace(/\bChemin\b/gi, 'Ch')
    .replace(/\bSaint\b/gi, 'St')
    .replace(/\bSainte\b/gi, 'Ste')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizePostalCode(postalCode = '') {
  const compact = String(postalCode).replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) {
    return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }
  return String(postalCode).trim();
}

function extractUnitStreet(input = '') {
  const value = String(input || '').trim();
  const match = value.match(/(\d+\s*-\s*)?\d+[A-Za-z]?\b/);
  if (!match) return '';
  return match[0].replace(/\s+/g, '');
}

export function compactAddressFromParts({ unitStreet = '', road = '', city = 'Montreal', postcode = '' } = {}) {
  const streetPrefix = extractUnitStreet(unitStreet);
  const roadPart = abbreviateStreet(road);
  const first = [streetPrefix, roadPart].filter(Boolean).join(' ').replace(/\s{2,}/g, ' ').trim();
  const cleanedCity = String(city || 'Montreal').replace('Montréal', 'Montreal').trim();
  const normalizedPostal = normalizePostalCode(postcode);
  return [first || roadPart || cleanedCity, cleanedCity, normalizedPostal].filter(Boolean).join(', ');
}

export function normalizeAddress(address = '') {
  if (!address) return '';
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return address.trim();

  const first = abbreviateStreet(parts[0]).replace(/\s+-\s+.*$/g, '').trim();
  const cityPart = parts.find((part) => /montr[eé]al/i.test(part)) || parts[1] || 'Montreal';
  const postalPart = parts.find((part) => /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i.test(part)) || '';
  const city = cityPart.replace('Montréal', 'Montreal');
  const compact = [first, city, normalizePostalCode(postalPart)].filter(Boolean).join(', ');
  return compact.replace(/\s{2,}/g, ' ').trim();
}

export function shortenAddress(address = '') {
  return normalizeAddress(address);
}
