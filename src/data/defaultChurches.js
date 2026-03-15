const now = new Date();
const inDays = (count) => {
  const d = new Date();
  d.setDate(now.getDate() + count);
  return d.toISOString().slice(0, 10);
};

export const defaultChurches = [
  {
    id: crypto.randomUUID(),
    hostPasscode: 'H-NVMTL1',
    name: 'Eglise Nouvelle Vie',
    address: '10330 Boulevard Gouin O, Montreal, QC',
    googleMapsUrl: 'https://maps.google.com/?q=10330+Boulevard+Gouin+O,+Montreal',
    googlePlaceId: '',
    lat: 45.4948,
    lng: -73.7206,
    languages: ['Français', 'English'],
    website: 'https://www.nouvellevie.com/',
    instagram: 'https://www.instagram.com/nouvelleviechurch/',
    facebook: 'https://www.facebook.com/nouvelleviechurch/',
    whatsapp: '',
    events: [
      { date: inDays(1), time: '19:00', type: 'Young Adults Prayer Night', ageGroup: 'young-adults', recurrence: 'weekly', until: '' },
      { date: inDays(3), time: '18:30', type: 'Bible Study Group', ageGroup: 'all', recurrence: 'biweekly', until: '' }
    ]
  },
  {
    id: crypto.randomUUID(),
    hostPasscode: 'H-LCHAP2',
    name: 'La Chapelle Montréal',
    address: '177 Rue Saint-Jacques, Montreal, QC',
    googleMapsUrl: 'https://maps.google.com/?q=177+Rue+Saint-Jacques,+Montreal',
    googlePlaceId: '',
    lat: 45.5077,
    lng: -73.554,
    languages: ['Français', 'English', 'Español'],
    website: 'https://lachapelle.me/',
    instagram: 'https://www.instagram.com/lachapelle.me/',
    facebook: 'https://www.facebook.com/lachapelleme/',
    whatsapp: '',
    events: [{ date: inDays(2), time: '19:30', type: 'Youth Fellowship', ageGroup: 'teens', recurrence: 'monthly', until: '' }]
  }
];
