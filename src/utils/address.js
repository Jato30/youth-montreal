export function shortenAddress(address = '') {
  if (!address) return '';

  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return address;

  const first = parts[0]
    .replace(/\bBoulevard\b/gi, 'Boul')
    .replace(/\bAvenue\b/gi, 'Av')
    .replace(/\bStreet\b/gi, 'St')
    .replace(/\bRue\b/gi, 'Rue')
    .replace(/\s+-\s+.*$/g, '')
    .trim();

  const cityPart = parts.find((part) => /montr[eé]al/i.test(part)) || 'Montreal';
  const postalPart = parts.find((part) => /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i.test(part)) || '';

  return [first, cityPart.replace('Montréal', 'Montreal'), postalPart].filter(Boolean).join(', ');
}
