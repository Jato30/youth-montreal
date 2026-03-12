const STORAGE_KEY = 'youth-montreal-churches';
const LANGUAGE_KEY = 'youth-montreal-language';

const TRANSLATIONS = {
  en: {
    appTitle: 'Youth & Young Adult Church Map — Montreal',
    appSubtitle: 'Find Bible studies, prayer meetings, church services, and fellowship in the next 7 days.',
    language: 'Language',
    admMode: 'ADM Mode',
    closeAdm: 'Close ADM',
    churchDetails: 'Church details',
    emptyState: 'Click a marker on the map to view details.',
    addUpdateChurch: 'Add / update church',
    editingChurch: 'Editing church',
    churchName: 'Church name',
    address: 'Address',
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
    mapCaptureOn: 'Map capture enabled: click map to set pin and address.',
    mapCaptureOff: 'Map capture disabled.'
  },
  'fr-CA': {
    appTitle: 'Carte des églises jeunesse et jeunes adultes — Montréal',
    appSubtitle: 'Trouvez des études bibliques, prières, cultes et temps de fraternité dans les 7 prochains jours.',
    language: 'Langue', admMode: 'Mode ADM', closeAdm: 'Fermer ADM', churchDetails: "Détails de l'église", emptyState: 'Cliquez un repère sur la carte pour voir les détails.', addUpdateChurch: 'Ajouter / modifier une église', editingChurch: 'Modification de l’église', churchName: "Nom de l'église", address: 'Adresse', latitude: 'Latitude', longitude: 'Longitude', mapClickHint: 'En mode édition, cliquez sur la carte pour capturer automatiquement coordonnées et adresse.', startMapCapture: 'Activer la capture carte', stopMapCapture: 'Désactiver la capture carte', languagesSpoken: 'Langues parlées', website: 'Site web', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', gatherings: 'Rencontres (7 prochains jours)', addGathering: '+ Ajouter une rencontre', saveChurch: "Enregistrer l'église", cancelEdit: 'Annuler', openMaps: 'Ouvrir le point dans une app de cartes', noGatherings: 'Aucune rencontre indiquée dans les 7 prochains jours.', languagesLabel: 'Langues :', editPin: 'Modifier le point', locateLoading: 'Recherche de l’adresse…', mapCaptureOn: 'Capture carte activée : cliquez sur la carte.', mapCaptureOff: 'Capture carte désactivée.'
  },
  'es-LA': { appTitle: 'Mapa de iglesias para jóvenes — Montreal', appSubtitle: 'Encuentra estudios bíblicos, reuniones de oración, servicios y confraternidad en los próximos 7 días.', language: 'Idioma', admMode: 'Modo ADM', closeAdm: 'Cerrar ADM', churchDetails: 'Detalles de la iglesia', emptyState: 'Haz clic en un marcador para ver detalles.', addUpdateChurch: 'Agregar / actualizar iglesia', editingChurch: 'Editando iglesia', churchName: 'Nombre de la iglesia', address: 'Dirección', latitude: 'Latitud', longitude: 'Longitud', mapClickHint: 'Al editar, haz clic en el mapa para capturar coordenadas y dirección.', startMapCapture: 'Activar captura en mapa', stopMapCapture: 'Desactivar captura en mapa', languagesSpoken: 'Idiomas hablados', website: 'Sitio web', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', gatherings: 'Reuniones (próximos 7 días)', addGathering: '+ Agregar reunión', saveChurch: 'Guardar iglesia', cancelEdit: 'Cancelar edición', openMaps: 'Abrir ubicación en mapas', noGatherings: 'No hay reuniones en los próximos 7 días.', languagesLabel: 'Idiomas:', editPin: 'Editar pin', locateLoading: 'Buscando dirección…', mapCaptureOn: 'Captura de mapa activada.', mapCaptureOff: 'Captura de mapa desactivada.' },
  it: { appTitle: 'Mappa chiese giovani — Montreal', appSubtitle: 'Trova studi biblici, preghiera, culti e fellowship nei prossimi 7 giorni.', language: 'Lingua', admMode: 'Modalità ADM', closeAdm: 'Chiudi ADM', churchDetails: 'Dettagli chiesa', emptyState: 'Clicca un pin per vedere i dettagli.', addUpdateChurch: 'Aggiungi / aggiorna chiesa', editingChurch: 'Modifica chiesa', churchName: 'Nome chiesa', address: 'Indirizzo', latitude: 'Latitudine', longitude: 'Longitudine', mapClickHint: 'In modifica, clicca la mappa per coordinate e indirizzo.', startMapCapture: 'Attiva cattura mappa', stopMapCapture: 'Disattiva cattura mappa', languagesSpoken: 'Lingue parlate', website: 'Sito web', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', gatherings: 'Incontri (prossimi 7 giorni)', addGathering: '+ Aggiungi incontro', saveChurch: 'Salva chiesa', cancelEdit: 'Annulla', openMaps: 'Apri pin in mappe', noGatherings: 'Nessun incontro nei prossimi 7 giorni.', languagesLabel: 'Lingue:', editPin: 'Modifica pin', locateLoading: 'Ricerca indirizzo…', mapCaptureOn: 'Cattura mappa attiva.', mapCaptureOff: 'Cattura mappa disattiva.' },
  'pt-BR': { appTitle: 'Mapa de igrejas jovens — Montreal', appSubtitle: 'Encontre estudos bíblicos, oração, cultos e comunhão nos próximos 7 dias.', language: 'Idioma', admMode: 'Modo ADM', closeAdm: 'Fechar ADM', churchDetails: 'Detalhes da igreja', emptyState: 'Clique em um marcador para ver detalhes.', addUpdateChurch: 'Adicionar / atualizar igreja', editingChurch: 'Editando igreja', churchName: 'Nome da igreja', address: 'Endereço', latitude: 'Latitude', longitude: 'Longitude', mapClickHint: 'Ao editar, clique no mapa para capturar coordenadas e endereço.', startMapCapture: 'Ativar captura no mapa', stopMapCapture: 'Desativar captura no mapa', languagesSpoken: 'Idiomas falados', website: 'Site', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', gatherings: 'Encontros (próximos 7 dias)', addGathering: '+ Adicionar encontro', saveChurch: 'Salvar igreja', cancelEdit: 'Cancelar edição', openMaps: 'Abrir pin no mapa', noGatherings: 'Sem encontros nos próximos 7 dias.', languagesLabel: 'Idiomas:', editPin: 'Editar pin', locateLoading: 'Buscando endereço…', mapCaptureOn: 'Captura de mapa ativada.', mapCaptureOff: 'Captura de mapa desativada.' },
  ko: { appTitle: '몬트리올 청년 교회 지도', appSubtitle: '향후 7일 내 성경공부, 기도모임, 예배, 교제를 찾아보세요.', language: '언어', admMode: '관리자 모드', closeAdm: '관리자 닫기', churchDetails: '교회 정보', emptyState: '지도 마커를 눌러 상세 정보를 확인하세요.', addUpdateChurch: '교회 추가 / 수정', editingChurch: '교회 수정 중', churchName: '교회 이름', address: '주소', latitude: '위도', longitude: '경도', mapClickHint: '수정 중 지도 클릭으로 좌표/주소를 자동 입력합니다.', startMapCapture: '지도 캡처 켜기', stopMapCapture: '지도 캡처 끄기', languagesSpoken: '사용 언어', website: '웹사이트', instagram: '인스타그램', facebook: '페이스북', whatsapp: '왓츠앱', gatherings: '모임 (향후 7일)', addGathering: '+ 모임 추가', saveChurch: '저장', cancelEdit: '수정 취소', openMaps: '지도 앱에서 열기', noGatherings: '향후 7일 모임이 없습니다.', languagesLabel: '언어:', editPin: '핀 수정', locateLoading: '주소 조회 중…', mapCaptureOn: '지도 캡처가 활성화되었습니다.', mapCaptureOff: '지도 캡처가 비활성화되었습니다.' },
  zh: { appTitle: '蒙特利尔青年教会地图', appSubtitle: '查找未来7天的查经、祷告会、主日和团契。', language: '语言', admMode: '管理员模式', closeAdm: '关闭管理员', churchDetails: '教会详情', emptyState: '点击地图标记查看详情。', addUpdateChurch: '添加 / 更新教会', editingChurch: '正在编辑教会', churchName: '教会名称', address: '地址', latitude: '纬度', longitude: '经度', mapClickHint: '编辑时点击地图可自动获取坐标和地址。', startMapCapture: '开启地图捕捉', stopMapCapture: '关闭地图捕捉', languagesSpoken: '可使用语言', website: '网站', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', gatherings: '聚会（未来7天）', addGathering: '+ 添加聚会', saveChurch: '保存教会', cancelEdit: '取消编辑', openMaps: '在地图应用中打开', noGatherings: '未来7天暂无聚会。', languagesLabel: '语言：', editPin: '编辑位置', locateLoading: '正在查询地址…', mapCaptureOn: '已开启地图捕捉。', mapCaptureOff: '已关闭地图捕捉。' },
  uk: { appTitle: 'Мапа церков для молоді — Монреаль', appSubtitle: 'Знайдіть біблійні вивчення, молитовні зустрічі, служіння та спілкування на наступні 7 днів.', language: 'Мова', admMode: 'Режим ADM', closeAdm: 'Закрити ADM', churchDetails: 'Деталі церкви', emptyState: 'Натисніть маркер на мапі, щоб побачити деталі.', addUpdateChurch: 'Додати / оновити церкву', editingChurch: 'Редагування церкви', churchName: 'Назва церкви', address: 'Адреса', latitude: 'Широта', longitude: 'Довгота', mapClickHint: 'Під час редагування натисніть мапу для координат і адреси.', startMapCapture: 'Увімкнути захоплення з мапи', stopMapCapture: 'Вимкнути захоплення з мапи', languagesSpoken: 'Мови спілкування', website: 'Вебсайт', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', gatherings: 'Зустрічі (наступні 7 днів)', addGathering: '+ Додати зустріч', saveChurch: 'Зберегти церкву', cancelEdit: 'Скасувати редагування', openMaps: 'Відкрити пін у картах', noGatherings: 'Немає зустрічей у наступні 7 днів.', languagesLabel: 'Мови:', editPin: 'Редагувати пін', locateLoading: 'Пошук адреси…', mapCaptureOn: 'Захоплення з мапи увімкнено.', mapCaptureOff: 'Захоплення з мапи вимкнено.' },
  he: { appTitle: 'מפת כנסיות לצעירים — מונטריאול', appSubtitle: 'מצאו לימוד תנ״ך, תפילה, תפילה קהילתית ומפגשים ב-7 הימים הקרובים.', language: 'שפה', admMode: 'מצב מנהל', closeAdm: 'סגור מנהל', churchDetails: 'פרטי כנסייה', emptyState: 'לחצו על סמן במפה כדי לראות פרטים.', addUpdateChurch: 'הוספה / עדכון כנסייה', editingChurch: 'עריכת כנסייה', churchName: 'שם הכנסייה', address: 'כתובת', latitude: 'קו רוחב', longitude: 'קו אורך', mapClickHint: 'בזמן עריכה לחצו על המפה כדי ללכוד כתובת וקואורדינטות.', startMapCapture: 'הפעל לכידה מהמפה', stopMapCapture: 'כבה לכידה מהמפה', languagesSpoken: 'שפות מדוברות', website: 'אתר', instagram: 'אינסטגרם', facebook: 'פייסבוק', whatsapp: 'וואטסאפ', gatherings: 'מפגשים (7 הימים הקרובים)', addGathering: '+ הוסף מפגש', saveChurch: 'שמור כנסייה', cancelEdit: 'בטל עריכה', openMaps: 'פתח נקודה באפליקציית מפות', noGatherings: 'אין מפגשים ב-7 הימים הקרובים.', languagesLabel: 'שפות:', editPin: 'ערוך מיקום', locateLoading: 'מחפש כתובת…', mapCaptureOn: 'לכידה מהמפה הופעלה.', mapCaptureOff: 'לכידה מהמפה כבויה.' }
};

const rtlLanguages = new Set(['he']);

const now = new Date();
const inDays = (count) => {
  const d = new Date();
  d.setDate(now.getDate() + count);
  return d.toISOString().slice(0, 10);
};

const defaultChurches = [
  {
    id: crypto.randomUUID(),
    name: 'Eglise Nouvelle Vie',
    address: '10330 Boulevard Gouin O, Montreal, QC',
    lat: 45.4948,
    lng: -73.7206,
    languages: ['Français', 'English'],
    website: 'https://www.nouvellevie.com/',
    instagram: 'https://www.instagram.com/nouvelleviechurch/',
    facebook: 'https://www.facebook.com/nouvelleviechurch/',
    whatsapp: '',
    events: [
      { date: inDays(1), time: '19:00', type: 'Young Adults Prayer Night' },
      { date: inDays(3), time: '18:30', type: 'Bible Study Group' }
    ]
  }
];

const t = (key) => TRANSLATIONS[state.language]?.[key] || TRANSLATIONS.en[key] || key;

const parseChurches = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultChurches;
  try {
    return JSON.parse(saved).map((church) => ({ ...church, languages: church.languages || [] }));
  } catch {
    return defaultChurches;
  }
};

const state = {
  churches: parseChurches(),
  markers: new Map(),
  language: localStorage.getItem(LANGUAGE_KEY) || 'en',
  selectedChurchId: null,
  mapCaptureEnabled: false,
  isAdminMode: false
};

const map = L.map('map', {
  dragging: true,
  touchZoom: true,
  doubleClickZoom: true,
  scrollWheelZoom: true,
  boxZoom: true,
  keyboard: true,
  tap: true
}).setView([45.5017, -73.5673], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const details = document.querySelector('#details');
const emptyState = document.querySelector('#empty-state');
const adminPanel = document.querySelector('#admin-panel');
const adminTitle = document.querySelector('#admin-title');
const toggleAdmin = document.querySelector('#toggle-admin');
const churchForm = document.querySelector('#church-form');
const eventsList = document.querySelector('#events-list');
const eventTemplate = document.querySelector('#event-template');
const addEventButton = document.querySelector('#add-event');
const cancelEditButton = document.querySelector('#cancel-edit');
const toggleMapCapture = document.querySelector('#toggle-map-capture');
const languageSelect = document.querySelector('#language-select');

function saveChurches() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.churches));
}

function mapLink(church) {
  return `https://www.google.com/maps/search/?api=1&query=${church.lat},${church.lng}`;
}

function setLanguage(language) {
  state.language = TRANSLATIONS[language] ? language : 'en';
  localStorage.setItem(LANGUAGE_KEY, state.language);
  document.documentElement.lang = state.language;
  document.documentElement.dir = rtlLanguages.has(state.language) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  toggleAdmin.textContent = state.isAdminMode ? t('closeAdm') : t('admMode');
  toggleMapCapture.textContent = state.mapCaptureEnabled ? t('stopMapCapture') : t('startMapCapture');
  adminTitle.textContent = state.selectedChurchId ? t('editingChurch') : t('addUpdateChurch');
  if (state.selectedChurchId) {
    const church = state.churches.find((c) => c.id === state.selectedChurchId);
    if (church) renderChurchDetails(church);
  }
}

function renderChurchDetails(church) {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() + 7);

  const upcoming = church.events
    .filter((event) => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      return eventDate >= today && eventDate <= cutoff;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  details.innerHTML = `
    <article class="detail-card">
      <h3>${church.name}</h3>
      ${church.address ? `<p>${church.address}</p>` : ''}
      <p><a href="${mapLink(church)}" target="_blank" rel="noreferrer">${t('openMaps')}</a></p>
      ${church.languages?.length ? `<p><strong>${t('languagesLabel')}</strong> ${church.languages.join(', ')}</p>` : ''}
      <ul>
        ${upcoming.length ? upcoming.map((event) => `<li>${event.date} ${event.time} — ${event.type}</li>`).join('') : `<li>${t('noGatherings')}</li>`}
      </ul>
      <p>
        ${church.website ? `<a href="${church.website}" target="_blank" rel="noreferrer">${t('website')}</a>` : ''}
        ${church.instagram ? ` · <a href="${church.instagram}" target="_blank" rel="noreferrer">${t('instagram')}</a>` : ''}
        ${church.facebook ? ` · <a href="${church.facebook}" target="_blank" rel="noreferrer">${t('facebook')}</a>` : ''}
        ${church.whatsapp ? ` · <a href="${church.whatsapp}" target="_blank" rel="noreferrer">${t('whatsapp')}</a>` : ''}
      </p>
      ${state.isAdminMode ? `<button type="button" class="edit-pin-btn" data-id="${church.id}">${t('editPin')}</button>` : ''}
    </article>
  `;
  details.querySelector('.edit-pin-btn')?.addEventListener('click', () => startEditChurch(church.id));
  details.classList.remove('hidden');
  emptyState.classList.add('hidden');
}

function addMarker(church) {
  const marker = L.marker([Number(church.lat), Number(church.lng)]).addTo(map);
  marker.bindPopup(`<strong>${church.name}</strong>`);
  marker.on('click', () => {
    state.selectedChurchId = church.id;
    renderChurchDetails(church);
  });
  state.markers.set(church.id, marker);
}

function renderMarkers() {
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();
  state.churches.forEach(addMarker);
}

function addEventRow(event = { date: inDays(0), time: '19:00', type: '' }) {
  const node = eventTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('[name="date"]').value = event.date;
  node.querySelector('[name="time"]').value = event.time;
  node.querySelector('[name="type"]').value = event.type;
  node.querySelector('.remove-event').addEventListener('click', () => node.remove());
  eventsList.appendChild(node);
}

function resetForm() {
  churchForm.reset();
  churchForm.elements.churchId.value = '';
  eventsList.innerHTML = '';
  addEventRow();
  state.selectedChurchId = null;
  state.mapCaptureEnabled = false;
  toggleMapCapture.textContent = t('startMapCapture');
  adminTitle.textContent = t('addUpdateChurch');
}

function startEditChurch(churchId) {
  if (!state.isAdminMode) return;
  const church = state.churches.find((item) => item.id === churchId);
  if (!church) return;
  adminPanel.classList.remove('hidden');
  state.isAdminMode = true;
  toggleAdmin.textContent = t('closeAdm');

  churchForm.elements.churchId.value = church.id;
  churchForm.elements.name.value = church.name;
  churchForm.elements.address.value = church.address || '';
  churchForm.elements.lat.value = church.lat;
  churchForm.elements.lng.value = church.lng;
  churchForm.elements.languages.value = (church.languages || []).join(', ');
  churchForm.elements.website.value = church.website || '';
  churchForm.elements.instagram.value = church.instagram || '';
  churchForm.elements.facebook.value = church.facebook || '';
  churchForm.elements.whatsapp.value = church.whatsapp || '';

  eventsList.innerHTML = '';
  (church.events || []).forEach((event) => addEventRow(event));
  if (!church.events?.length) addEventRow();

  state.selectedChurchId = church.id;
  adminTitle.textContent = t('editingChurch');
}

async function reverseGeocode(lat, lng) {
  try {
    const result = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    );
    if (!result.ok) return '';
    const data = await result.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

toggleAdmin.addEventListener('click', () => {
  state.isAdminMode = !state.isAdminMode;
  adminPanel.classList.toggle('hidden', !state.isAdminMode);
  toggleAdmin.textContent = state.isAdminMode ? t('closeAdm') : t('admMode');
  if (!state.isAdminMode) resetForm();
  if (state.selectedChurchId) {
    const selected = state.churches.find((item) => item.id === state.selectedChurchId);
    if (selected) renderChurchDetails(selected);
  }
});

addEventButton.addEventListener('click', () => addEventRow());
cancelEditButton.addEventListener('click', () => resetForm());

toggleMapCapture.addEventListener('click', () => {
  state.mapCaptureEnabled = !state.mapCaptureEnabled;
  toggleMapCapture.textContent = state.mapCaptureEnabled ? t('stopMapCapture') : t('startMapCapture');
});

map.on('click', async (event) => {
  if (!state.mapCaptureEnabled || adminPanel.classList.contains('hidden')) return;
  churchForm.elements.lat.value = event.latlng.lat.toFixed(6);
  churchForm.elements.lng.value = event.latlng.lng.toFixed(6);
  churchForm.elements.address.value = t('locateLoading');
  const address = await reverseGeocode(event.latlng.lat, event.latlng.lng);
  churchForm.elements.address.value = address;
});

churchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(churchForm);
  const rowNodes = Array.from(eventsList.querySelectorAll('.event-row'));

  const events = rowNodes
    .map((node) => ({
      date: node.querySelector('[name="date"]').value,
      time: node.querySelector('[name="time"]').value,
      type: node.querySelector('[name="type"]').value.trim()
    }))
    .filter((row) => row.date && row.time && row.type);

  const church = {
    id: formData.get('churchId') || crypto.randomUUID(),
    name: formData.get('name').trim(),
    address: formData.get('address').trim(),
    lat: Number(formData.get('lat')),
    lng: Number(formData.get('lng')),
    languages: formData
      .get('languages')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    website: formData.get('website').trim(),
    instagram: formData.get('instagram').trim(),
    facebook: formData.get('facebook').trim(),
    whatsapp: formData.get('whatsapp').trim(),
    events
  };

  const existingIndex = state.churches.findIndex((item) => item.id === church.id);
  if (existingIndex >= 0) {
    state.churches[existingIndex] = church;
  } else {
    state.churches.push(church);
  }

  saveChurches();
  renderMarkers();
  state.selectedChurchId = church.id;
  renderChurchDetails(church);
  resetForm();
});

languageSelect.value = state.language;
languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));

renderMarkers();
addEventRow();
setLanguage(state.language);
