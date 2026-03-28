import { LANGUAGE_KEY } from './config.js';

export const TRANSLATIONS = {
  en: {
    language: 'Language',
    admMode: 'ADM Mode',
    closeAdm: 'Close ADM',
    heroTitle: 'Connecting young people to local churches across Montreal.',
    heroBody: 'Our vision is to help every youth and young adult quickly find a nearby Bible study, prayer meeting, church service, or fellowship this week.',
    instagramLink: 'Follow the movement on Instagram',
    findChurch: 'Find a church near you',
    addressSearch: 'Your address',
    radius: 'Radius',
    findWithinRadius: 'Find within radius',
    openMap: 'Open map',
    churchDetails: 'Church details',
    emptyState: 'Click a marker on the map to view details.',
    addUpdateChurch: 'Add / update church',
    editingChurch: 'Editing church',
    churchName: 'Church name',
    address: 'Address',
    googleMapsPinUrl: 'Google Maps pin URL',
    googlePlaceId: 'Google Place ID (optional)',
    googlePlaceIdLabel: 'Google Place ID:',
    latitude: 'Latitude',
    longitude: 'Longitude',
    mapClickHint: 'When editing, click the map to capture coordinates and address automatically.',
    startMapCapture: 'Enable map capture',
    stopMapCapture: 'Disable map capture',
    languagesSpoken: 'Languages spoken',
    website: 'Website',
    instagram: 'Instagram',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    gatherings: 'Gatherings (next 7 days)',
    addGathering: '+ Add gathering',
    saveChurch: 'Save church',
    cancelEdit: 'Cancel edit',
    openMaps: 'Open pin in maps app',
    noGatherings: 'No gatherings listed in next 7 days.',
    languagesLabel: 'Languages:',
    editPin: 'Edit pin',
    locateLoading: 'Looking up address…',
    searchLoading: 'Searching nearby churches…',
    searchNoResults: 'No churches found in that radius yet.',
    searchResultCount: 'churches found near your address.'
  },
  'fr-CA': {
    language: 'Langue', admMode: 'Mode ADM', closeAdm: 'Fermer ADM', heroTitle: 'Connecter les jeunes aux églises locales partout à Montréal.',
    heroBody: 'Notre vision est d’aider chaque jeune à trouver rapidement une étude biblique, une réunion de prière, un culte ou un temps de fraternité cette semaine.', instagramLink: 'Suivre le mouvement sur Instagram', findChurch: 'Trouver une église près de vous', addressSearch: 'Votre adresse', radius: 'Rayon', findWithinRadius: 'Rechercher dans le rayon', openMap: 'Ouvrir la carte', churchDetails: "Détails de l'église", emptyState: 'Cliquez sur un marqueur pour voir les détails.', addUpdateChurch: 'Ajouter / modifier une église', editingChurch: 'Modification de l’église', churchName: "Nom de l'église", address: 'Adresse', googleMapsPinUrl: 'URL du point Google Maps', googlePlaceId: 'Google Place ID (optionnel)', googlePlaceIdLabel: 'Google Place ID :', latitude: 'Latitude', longitude: 'Longitude', mapClickHint: 'En mode édition, cliquez sur la carte pour récupérer automatiquement les coordonnées et l’adresse.', startMapCapture: 'Activer capture carte', stopMapCapture: 'Désactiver capture carte', languagesSpoken: 'Langues parlées', website: 'Site web', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', gatherings: 'Rencontres (7 prochains jours)', addGathering: '+ Ajouter rencontre', saveChurch: "Enregistrer l'église", cancelEdit: 'Annuler', openMaps: 'Ouvrir le point dans une app cartes', noGatherings: 'Aucune rencontre indiquée dans les 7 prochains jours.', languagesLabel: 'Langues :', editPin: 'Modifier le point', locateLoading: 'Recherche de l’adresse…', searchLoading: 'Recherche des églises proches…', searchNoResults: 'Aucune église trouvée dans ce rayon.', searchResultCount: 'églises trouvées près de votre adresse.'
  }
};

const rtlLanguages = new Set(['he']);

export const t = (state, key) => TRANSLATIONS[state.language]?.[key] || TRANSLATIONS.en[key] || key;

export function applyLanguage(state, elements, onSelectedChurchRender) {
  document.documentElement.lang = state.language;
  document.documentElement.dir = rtlLanguages.has(state.language) ? 'rtl' : 'ltr';
  localStorage.setItem(LANGUAGE_KEY, state.language);

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(state, node.dataset.i18n);
  });

  elements.toggleAdmin.textContent = state.isAdminMode ? t(state, 'closeAdm') : t(state, 'admMode');
  elements.toggleMapCapture.textContent = state.mapCaptureEnabled ? t(state, 'stopMapCapture') : t(state, 'startMapCapture');
  elements.adminTitle.textContent = state.selectedChurchId ? t(state, 'editingChurch') : t(state, 'addUpdateChurch');

  if (state.selectedChurchId) onSelectedChurchRender();
}
