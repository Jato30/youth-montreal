import { normalizeAddress } from './address.js';

const LAT_LNG_TOLERANCE = 0.0008; // ~90m around Montreal latitude

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeAddressKey = (address = '') => normalizeText(normalizeAddress(address));

const roundedCoordinate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  return parsed.toFixed(4);
};

const hostIdentityKey = (host = {}) => {
  const addressKey = normalizeAddressKey(host.address);
  if (addressKey) return `address:${addressKey}`;

  const latKey = roundedCoordinate(host.lat);
  const lngKey = roundedCoordinate(host.lng);
  const nameKey = normalizeText(host.name);
  if (latKey && lngKey && nameKey) return `coords-name:${latKey}:${lngKey}:${nameKey}`;
  return '';
};

const isNearSameCoordinates = (left = {}, right = {}) => {
  const leftLat = Number(left.lat);
  const leftLng = Number(left.lng);
  const rightLat = Number(right.lat);
  const rightLng = Number(right.lng);
  if (![leftLat, leftLng, rightLat, rightLng].every(Number.isFinite)) return false;
  return Math.abs(leftLat - rightLat) <= LAT_LNG_TOLERANCE
    && Math.abs(leftLng - rightLng) <= LAT_LNG_TOLERANCE;
};

const sameIdentity = (left = {}, right = {}) => {
  const leftKey = hostIdentityKey(left);
  const rightKey = hostIdentityKey(right);
  if (leftKey && rightKey && leftKey === rightKey) return true;

  const leftName = normalizeText(left.name);
  const rightName = normalizeText(right.name);
  if (leftName && rightName && leftName === rightName && isNearSameCoordinates(left, right)) return true;

  return false;
};

export function findDuplicateHost(hosts = [], candidate = {}, ignoreId = null) {
  return hosts.find((host) => {
    if (!host) return false;
    if (ignoreId && host.id === ignoreId) return false;
    return sameIdentity(host, candidate);
  }) || null;
}

export function dedupeHosts(hosts = []) {
  const deduped = [];
  const removed = [];

  hosts.forEach((host) => {
    const duplicate = findDuplicateHost(deduped, host);
    if (duplicate) {
      removed.push({ kept: duplicate, removed: host });
      return;
    }
    deduped.push(host);
  });

  return { deduped, removed };
}
