import { STORAGE_KEY } from '../config.js';
import { defaultChurches } from '../data/defaultChurches.js';

export function loadChurches() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultChurches;
  try {
    return JSON.parse(saved).map((church) => ({ ...church, googleMapsUrl: church.googleMapsUrl || '', googlePlaceId: church.googlePlaceId || '', languages: church.languages || [], events: church.events || [] }));
  } catch {
    return defaultChurches;
  }
}

export function saveChurches(churches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(churches));
}
