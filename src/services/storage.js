import { STORAGE_KEY } from '../config.js';
import { defaultChurches } from '../data/defaultChurches.js';

export function loadChurches() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultChurches;

  try {
    return JSON.parse(saved).map((church) => ({
      ...church,
      hostPasscode: church.hostPasscode || '',
      googleMapsUrl: church.googleMapsUrl || '',
      googlePlaceId: church.googlePlaceId || '',
      languages: church.languages || [],
      events: (church.events || []).map((event) => ({
        ...event,
        ageGroup: event.ageGroup || 'all',
        recurrence: event.recurrence || 'none',
        until: event.until || ''
      }))
    }));
  } catch {
    return defaultChurches;
  }
}

export function saveChurches(churches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(churches));
}
