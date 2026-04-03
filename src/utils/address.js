function abbreviateStreet(value = '') {
  return value
    .replace(/\bBoulevard\b/gi, 'Boul')
    .replace(/\bAvenue\b/gi, 'Av')
    .replace(/\bStreet\b/gi, 'St')
    .replace(/\bRoad\b/gi, 'Rd')
    .replace(/\bRue\b/gi, 'Rue')
    .replace(/\bChemin\b/gi, 'Ch')
    .trim();
}

export function normalizeAddress(address = '') {
  if (!address) return '';
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return address.trim();

  const first = abbreviateStreet(parts[0]).replace(/\s+-\s+.*$/g, '').trim();
  const cityPart = parts.find((part) => /montr[eé]al/i.test(part)) || parts[1] || 'Montreal';
  const postalPart = parts.find((part) => /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i.test(part)) || '';
  const city = cityPart.replace('Montréal', 'Montreal');

  const compact = [first, city, postalPart].filter(Boolean).join(', ');
  return compact.replace(/\s{2,}/g, ' ').trim();
}

export function shortenAddress(address = '') {
  return normalizeAddress(address);
}
