/**
 * Shared by the light cards (its names are used by the other src/ files): the light's fixtures, colours and strings,
 * i18n helpers, the base card (header, tiles, tap / hold), the mini card, the visual editor and the common styles.
 * Same base as ha-room-card.
 * https://github.com/juju35/ha-light-card
 */
const RC_VERSION = "__VERSION__";

// ── Discovery rules ──────────────────────────────────────────────────────────
const RC_OPENING_CLASSES = ["moisture", "smoke", "carbon_monoxide", "gas", "door", "window", "opening", "garage_door"];
// Safety sensors: an active state is an alarm, not an opening. Most serious first: it names the room's status.
const RC_ALERT_KINDS = {
  smoke: { dc: "smoke", on: "mdi:smoke-detector-alert", off: "mdi:smoke-detector" },
  co: { dc: "carbon_monoxide", on: "mdi:molecule-co", off: "mdi:molecule-co" },
  gas: { dc: "gas", on: "mdi:gas-cylinder", off: "mdi:gas-cylinder" },
  leak: { dc: "moisture", on: "mdi:water-alert", off: "mdi:water-check" },
};
const RC_ALERT_ORDER = Object.keys(RC_ALERT_KINDS);
// Alert kind of a device class (`leak`, `smoke`, `co`, `gas`), or undefined for any other class.
const rcAlertKind = (dc) => RC_ALERT_ORDER.find((k) => RC_ALERT_KINDS[k].dc === dc);
// The most serious alert kind among `kinds`, `leak` when none is known.
const rcTopAlert = (kinds) => RC_ALERT_ORDER.find((k) => kinds.includes(k)) || "leak";
const RC_PRESENCE_CLASSES = ["occupancy", "presence", "motion"];
// A switch driving a light belongs to the lights card, a switch that is a plug to the plugs card.
const RC_LIGHT_NAME = /(^|\s)(lumi[eè]re|lampe|lamp|light|veilleuse|guirlande)(\s|$)/i;
const RC_PLUG_NAME = /(^|\s)(prise|multiprise|plug|outlet|socket)(\s|$)/i;
const RC_HOLD_MS = 500;
const RC_MOVE_PX = 8;
// A held arrow key repeats some 30 times a second: one brightness step every RC_REPEAT_MS at most.
const RC_REPEAT_MS = 150;

const rcIsLightSwitch = (st) => RC_LIGHT_NAME.test(st.attributes.friendly_name || "");
const rcIsPlug = (st) =>
  !rcIsLightSwitch(st) && (st.attributes.device_class === "outlet" || RC_PLUG_NAME.test(st.attributes.friendly_name || ""));

// What each room card shows, shared with the Overview so that both count the same entities.
// Detections that are not about people, which cameras report as motion: pets never count, vehicles only outdoors.
const RC_PET = /(^|[\s_.-])(pets?|animals?|animaux|chiens?|chats?|dogs?|cats?)($|[\s_-])/i;
const RC_VEHICLE = /(^|[\s_.-])(vehicles?|v[ée]hicules?|voitures?|cars?)($|[\s_-])/i;
// An outdoor room, from its name: garden, terrace, balcony, patio, yard, driveway, porch, gate, parking…
const RC_OUTDOOR =
  /jardin|terrasse|balcon|patio|ext[ée]rieur|cour(\s|$)|all[ée]e|porche|portail|parking|garden|terrace|balcony|outdoor|outside|yard|driveway|porch|gate/i;
const rcIsOutdoor = (area) => !!area && RC_OUTDOOR.test(`${area.name || ""} ${area.area_id || ""}`);

// Sensors card: leak, door, window and opening sensors, plus presence and motion unless `presence` is false. Camera
// detections count, except pets, and vehicles outside an `outdoor` room.
const rcMatchSensor = (hass, id, { presence = true, outdoor = false } = {}) => {
  if (!id.startsWith("binary_sensor.")) return false;
  const st = hass.states[id];
  const dc = st?.attributes.device_class;
  if (RC_OPENING_CLASSES.includes(dc)) return true;
  if (presence === false || !RC_PRESENCE_CLASSES.includes(dc)) return false;
  const name = `${id} ${st.attributes.friendly_name || ""}`;
  if (RC_PET.test(name)) return false;
  return outdoor || !RC_VEHICLE.test(name);
};
// Lights card: lights (groups excepted) and switches driving a light, configuration and diagnostic entities excepted.
const rcMatchLight = (hass, id) => {
  const st = hass.states[id];
  if (!st || hass.entities?.[id]?.entity_category) return false;
  if (id.startsWith("light.")) return !Array.isArray(st.attributes.entity_id);
  return id.startsWith("switch.") && rcIsLightSwitch(st);
};
// Plugs card: switches that are plugs, configuration and diagnostic entities excepted.
const rcMatchPlug = (hass, id) => {
  const st = hass.states[id];
  if (!st || !id.startsWith("switch.") || hass.entities?.[id]?.entity_category) return false;
  return rcIsPlug(st);
};

const RC_ROOM_ICONS = [
  [/chambre|bedroom|nursery/i, "mdi:bed-outline"],
  [/s[ée]jour|salon|living|lounge/i, "mdi:sofa-outline"],
  [/cuisine|kitchen/i, "mdi:silverware-fork-knife"],
  [/salle (de )?bains?|bath|douche|shower/i, "mdi:shower-head"],
  [/toilettes?|wc|toilet/i, "mdi:toilet"],
  [/entr[ée]e|entrance|hall d.entr|entry/i, "mdi:door"],
  [/couloir|hall|corridor/i, "mdi:arrow-left-right"],
  [/bureau|office|study/i, "mdi:desk"],
  [/garage/i, "mdi:garage"],
  [/terrasse|jardin|balcon|garden|terrace|balcony|patio|ext[ée]rieur|outdoor/i, "mdi:flower-outline"],
  [/buanderie|cellier|laundry|utility/i, "mdi:washing-machine"],
  [/salle [àa] manger|dining/i, "mdi:table-chair"],
];

// Icon of a room in the overviews: the area's own icon, or one picked from its name.
const rcRoomIcon = (area) => {
  if (area.icon) return area.icon;
  const hit = RC_ROOM_ICONS.find(([re]) => re.test(area.name || area.area_id || ""));
  return hit ? hit[1] : "mdi:home-outline";
};

// `fn(hass)` computed once per entity registry: HA replaces hass.entities only when the registry changes,
// whereas a new hass (and hass.states) comes with every state change of the whole instance.
const rcPerRegistry = (fn) => {
  const cache = new WeakMap();
  const none = {};
  return (hass) => {
    const reg = hass.entities || none;
    if (!cache.has(reg)) cache.set(reg, fn(hass));
    return cache.get(reg);
  };
};

// The sensor entities of each device, in registry order.
const rcDeviceSensors = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) {
    if (r.device_id && id.startsWith("sensor.")) (out[r.device_id] ||= []).push(id);
  }
  return out;
});

// Power sensor (device class power, W or kW) of each device; only the device's own sensors are read.
// Settled per registry like rcDeviceSensors (a device_class next to never changes), except for the devices with a
// sensor that has no state yet (an integration still loading after a restart): those are looked at again on every
// call until all their sensors report, so their power sensor is not missed until the next registry change.
const rcPowerCache = rcPerRegistry((hass) => ({ found: {}, pending: new Set(Object.keys(rcDeviceSensors(hass))) }));
const rcPowerSensors = (hass) => {
  const cache = rcPowerCache(hass);
  if (!cache.pending.size) return cache.found;
  const sensors = rcDeviceSensors(hass);
  for (const device of cache.pending) {
    const ids = sensors[device] || [];
    const id = ids.find((s) => hass.states[s]?.attributes.device_class === "power");
    if (id) cache.found[device] = id;
    if (id || ids.every((s) => hass.states[s])) cache.pending.delete(device);
  }
  return cache.found;
};

const rcWattsOf = (hass, sensorId) => {
  const st = sensorId && hass.states[sensorId];
  const v = st ? Number.parseFloat(st.state) : Number.NaN;
  if (!Number.isFinite(v)) return null;
  return st.attributes.unit_of_measurement === "kW" ? v * 1000 : v;
};

// ── Overviews ────────────────────────────────────────────────────────────────
// Shared by room-overview-card and room-environment-overview-card.

// Visible entities accepted by `match(id)`, with their area, minus the config's `exclude`: the registries are
// scanned again only when they or the config change.
const rcByArea = (card, match) => {
  const h = card._hass;
  const c = card._config;
  return rcMemo((card._memo ||= {}), "byArea", [c, h.entities, h.devices], () => {
    const excluded = new Set(c.exclude || []);
    const out = [];
    for (const [id, r] of Object.entries(h.entities || {})) {
      if (r.hidden || excluded.has(id) || !match(id)) continue;
      const aid = card._areaOf(id);
      if (aid) out.push([id, aid]);
    }
    return out;
  });
};

// Rooms in the order of the config's `rooms` list, then, with `sort: state`, the highest `rank(room)` first,
// then by name.
const rcSortRooms = (list, config, rank) => {
  const order = (config.rooms || []).map((x) => x.area);
  return list.sort((a, b) => {
    if (order.length) {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== ib) return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    }
    return (config.sort === "state" ? rank(b) - rank(a) : 0) || a.name.localeCompare(b.name);
  });
};

// The overviews only show the rooms needing a look until their detail button (`zoom`, on by default) is pressed;
// `zoom: false` shows every room, with no button.
const rcCompact = (card) => card._config.zoom !== false && !card._zoomed;

// The zoom / detail button: the same icons on the overviews and the mini cards.
const rcZoomIcon = (card) => (card._zoomed ? "mdi:arrow-collapse" : "mdi:arrow-expand");

// The detail button of an overview header, at its end.
const rcZoomButton = (card) =>
  card._config.zoom === false
    ? ""
    : `<button class="zoom" title="${rcEsc(card._t(card._zoomed ? "rooms_check" : "rooms_all"))}"><ha-icon icon="${rcZoomIcon(card)}"></ha-icon></button>`;

// Back to the compact view (mini card, or overview showing the rooms needing a look), when zoomed in.
const rcUnzoom = (card) => {
  if (!card._zoomed) return;
  card._zoomed = false;
  card._sig = null;
  card._render();
};

// True for a click outside `card` that is not in a dialog opened from it (more-info, say): it folds the card back.
const rcOutside = (card, ev) => !ev.composedPath().includes(card) && !rcInDialog(ev);

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. The handler runs when the press and the release are both outside the card (a slider dragged out of the
// card does not count), and a scroll does not count (the browser cancels the pointer); keyboard clicks still go
// through the click event. The handler keeps its own checks (outside of the card, not in a dialog).
const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = !ev.composedPath().includes(card);
  };
  const onUp = (ev) => {
    if (downOutside) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
  };
};

// A click on the detail button: every room, or back to the rooms needing a look. True when handled.
const rcZoomClick = (card, ev) => {
  if (!ev.target.closest?.(".zoom")) return false;
  ev.stopPropagation();
  card._zoomed = !card._zoomed;
  card._sig = null;
  card._render();
  if (ev.detail === 0) card.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  return true;
};

// Editor fields shared by the overviews: title, columns and sort.
const rcOverviewFields = (i18n, lang) => [
  { name: "title", selector: { text: {} } },
  { name: "columns", selector: { number: { min: 1, max: 6, mode: "box" } } },
  {
    name: "sort",
    selector: {
      select: {
        mode: "dropdown",
        options: ["name", "state"].map((value) => ({ value, label: rcT(i18n, lang, `ed_sort_${value}`) })),
      },
    },
  },
];

// ── i18n ─────────────────────────────────────────────────────────────────────
// Strings shared by the cards; a card's own dictionary wins over these.
const RC_I18N = {
  en: {
    all_closed: "All closed",
    all_quiet: "All quiet",
    open_one: "{n} open",
    open_many: "{n} open",
    unavail_one: "{n} unavailable",
    unavail_many: "{n} unavailable",
    leak: "Water leak",
    smoke: "Smoke detected",
    gas: "Gas detected",
    co: "Carbon monoxide",
    detected: "Detected",
    clear: "Clear",
    unavailable: "Unavailable",
    on: "On",
    off: "Off",
    turn_all_off: "Turn everything off",
    ed_area: "Area",
    ed_title: "Title",
    ed_show_title: "Show title",
    ed_title_helper: "Leave empty for the area name",
    ed_columns: "Columns",
    ed_layout: "Layout",
    ed_layout_helper: "Tiles: one large tile per entity, like the Tile card, easier to tap on a phone",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Tiles",
    ed_advanced: "Advanced",
    ed_language: "Language",
    ed_language_helper: "Empty: the Home Assistant language",
    ed_language_auto: "Automatic",
    ed_entities: "Explicit entities (YAML)",
    ed_entities_helper: "Replaces the automatic discovery: entity IDs, or {entity, name, icon}",
    ed_thresholds: "Comfort thresholds (YAML)",
    ed_thresholds_helper: "Per kind, in the sensor's unit, e.g. co2: [800, 1200] or humidity: [25, 35, 70, 80]",
    ed_rooms: "Rooms (YAML)",
    ed_rooms_helper: "Order and overrides: a list of {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigation path",
    ed_all_off_button: "“Turn everything off” button",
    err_config: "Set `area` or `entities`",
    zoom_in: "Show the full card",
    zoom_out: "Back to the compact view",
    ed_zoom: "Zoom button",
    ed_zoom_helper: "Switches the mini card to the full card and back",
    rooms_all: "Show every room",
    rooms_check: "Only the rooms needing a look",
    ed_sort: "Sort",
    ed_sort_name: "By name",
    ed_exclude_areas: "Rooms to exclude",
  },
  fr: {
    all_closed: "Tout est fermé",
    all_quiet: "Tout est calme",
    open_one: "{n} ouverture",
    open_many: "{n} ouvertures",
    unavail_one: "{n} indisponible",
    unavail_many: "{n} indisponibles",
    leak: "Fuite d'eau",
    smoke: "Fumée détectée",
    gas: "Gaz détecté",
    co: "Monoxyde de carbone",
    detected: "Détecté",
    clear: "Non détecté",
    unavailable: "Indisponible",
    on: "Allumée",
    off: "Éteinte",
    turn_all_off: "Tout éteindre",
    ed_area: "Pièce",
    ed_title: "Titre",
    ed_show_title: "Afficher le titre",
    ed_title_helper: "Laisser vide pour le nom de la pièce",
    ed_columns: "Colonnes",
    ed_layout: "Disposition",
    ed_layout_helper: "Tuiles : une grande tuile par entité, comme la carte Tuile, plus facile à toucher sur téléphone",
    ed_layout_compact: "Compacte",
    ed_layout_tiles: "Tuiles",
    ed_advanced: "Avancé",
    ed_language: "Langue",
    ed_language_helper: "Vide : la langue de Home Assistant",
    ed_language_auto: "Automatique",
    ed_entities: "Entités explicites (YAML)",
    ed_entities_helper: "Remplace la découverte automatique : des identifiants d'entités, ou {entity, name, icon}",
    ed_thresholds: "Seuils de confort (YAML)",
    ed_thresholds_helper: "Par type, dans l'unité du capteur, par exemple co2: [800, 1200] ou humidity: [25, 35, 70, 80]",
    ed_rooms: "Pièces (YAML)",
    ed_rooms_helper: "Ordre et personnalisation : une liste de {area, name, icon, navigation_path}",
    ed_navigation_path: "Chemin de navigation",
    ed_all_off_button: "Bouton « Tout éteindre »",
    err_config: "Définis `area` ou `entities`",
    zoom_in: "Afficher la carte complète",
    zoom_out: "Revenir à la vue compacte",
    ed_zoom: "Bouton zoom",
    ed_zoom_helper: "Bascule la mini-carte en carte complète, et inversement",
    rooms_all: "Afficher toutes les pièces",
    rooms_check: "Seulement les pièces à surveiller",
    ed_sort: "Tri",
    ed_sort_name: "Par nom",
    ed_exclude_areas: "Pièces à exclure",
  },
  de: {
    all_closed: "Alles geschlossen",
    all_quiet: "Alles ruhig",
    open_one: "{n} offen",
    open_many: "{n} offen",
    unavail_one: "{n} nicht verfügbar",
    unavail_many: "{n} nicht verfügbar",
    leak: "Wasserleck",
    smoke: "Rauch erkannt",
    gas: "Gas erkannt",
    co: "Kohlenmonoxid",
    detected: "Erkannt",
    clear: "Nicht erkannt",
    unavailable: "Nicht verfügbar",
    on: "An",
    off: "Aus",
    turn_all_off: "Alles ausschalten",
    ed_area: "Bereich",
    ed_title: "Titel",
    ed_show_title: "Titel anzeigen",
    ed_title_helper: "Leer lassen für den Namen des Bereichs",
    ed_columns: "Spalten",
    ed_layout: "Layout",
    ed_layout_helper: "Kacheln: eine große Kachel pro Entität wie die Kachel-Karte, auf dem Handy leichter anzutippen",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Kacheln",
    ed_advanced: "Erweitert",
    ed_language: "Sprache",
    ed_language_helper: "Leer: die Sprache von Home Assistant",
    ed_language_auto: "Automatisch",
    ed_entities: "Explizite Entitäten (YAML)",
    ed_entities_helper: "Ersetzt die automatische Erkennung: Entitäts-IDs oder {entity, name, icon}",
    ed_thresholds: "Komfortschwellen (YAML)",
    ed_thresholds_helper: "Pro Art, in der Einheit des Sensors, z. B. co2: [800, 1200] oder humidity: [25, 35, 70, 80]",
    ed_rooms: "Räume (YAML)",
    ed_rooms_helper: "Reihenfolge und Anpassungen: eine Liste von {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigationspfad",
    ed_all_off_button: "Schaltfläche „Alles ausschalten“",
    err_config: "Lege `area` oder `entities` fest",
    zoom_in: "Vollständige Karte anzeigen",
    zoom_out: "Zurück zur kompakten Ansicht",
    ed_zoom: "Zoom-Schaltfläche",
    ed_zoom_helper: "Wechselt von der Mini-Karte zur vollständigen Karte und zurück",
    rooms_all: "Alle Räume anzeigen",
    rooms_check: "Nur die Räume, die Aufmerksamkeit brauchen",
    ed_sort: "Sortierung",
    ed_sort_name: "Nach Name",
    ed_exclude_areas: "Auszuschließende Räume",
  },
  es: {
    all_closed: "Todo cerrado",
    all_quiet: "Todo tranquilo",
    open_one: "{n} abierto",
    open_many: "{n} abiertos",
    unavail_one: "{n} no disponible",
    unavail_many: "{n} no disponibles",
    leak: "Fuga de agua",
    smoke: "Humo detectado",
    gas: "Gas detectado",
    co: "Monóxido de carbono",
    detected: "Detectado",
    clear: "No detectado",
    unavailable: "No disponible",
    on: "Encendido",
    off: "Apagado",
    turn_all_off: "Apagar todo",
    ed_area: "Área",
    ed_title: "Título",
    ed_show_title: "Mostrar el título",
    ed_title_helper: "Déjalo vacío para usar el nombre del área",
    ed_columns: "Columnas",
    ed_layout: "Diseño",
    ed_layout_helper: "Mosaicos: un mosaico grande por entidad, como la tarjeta Mosaico, más fácil de tocar en el móvil",
    ed_layout_compact: "Compacto",
    ed_layout_tiles: "Mosaicos",
    ed_advanced: "Avanzado",
    ed_language: "Idioma",
    ed_language_helper: "Vacío: el idioma de Home Assistant",
    ed_language_auto: "Automático",
    ed_entities: "Entidades explícitas (YAML)",
    ed_entities_helper: "Sustituye la detección automática: IDs de entidad, o {entity, name, icon}",
    ed_thresholds: "Umbrales de confort (YAML)",
    ed_thresholds_helper: "Por tipo, en la unidad del sensor, p. ej. co2: [800, 1200] o humidity: [25, 35, 70, 80]",
    ed_rooms: "Habitaciones (YAML)",
    ed_rooms_helper: "Orden y personalización: una lista de {area, name, icon, navigation_path}",
    ed_navigation_path: "Ruta de navegación",
    ed_all_off_button: "Botón «Apagar todo»",
    err_config: "Define `area` o `entities`",
    zoom_in: "Mostrar la tarjeta completa",
    zoom_out: "Volver a la vista compacta",
    ed_zoom: "Botón de zoom",
    ed_zoom_helper: "Cambia de la minitarjeta a la tarjeta completa y viceversa",
    rooms_all: "Mostrar todas las habitaciones",
    rooms_check: "Solo las habitaciones que requieren atención",
    ed_sort: "Orden",
    ed_sort_name: "Por nombre",
    ed_exclude_areas: "Habitaciones a excluir",
  },
  sr: {
    all_closed: "Све је затворено",
    all_quiet: "Све је мирно",
    open_one: "{n} отворено",
    open_few: "{n} отворена",
    open_many: "{n} отворених",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Цурење воде",
    smoke: "Откривен дим",
    gas: "Откривен гас",
    co: "Угљен-моноксид",
    detected: "Откривено",
    clear: "Није откривено",
    unavailable: "Недоступно",
    on: "Укључено",
    off: "Искључено",
    turn_all_off: "Искључи све",
    ed_area: "Просторија",
    ed_title: "Наслов",
    ed_show_title: "Прикажи наслов",
    ed_title_helper: "Остави празно за назив просторије",
    ed_columns: "Колоне",
    ed_layout: "Распоред",
    ed_layout_helper: "Плочице: једна велика плочица по ентитету, као картица Плочица, лакше за додир на телефону",
    ed_layout_compact: "Збијено",
    ed_layout_tiles: "Плочице",
    ed_advanced: "Напредно",
    ed_language: "Језик",
    ed_language_helper: "Празно: језик Home Assistant-а",
    ed_language_auto: "Аутоматски",
    ed_entities: "Експлицитни ентитети (YAML)",
    ed_entities_helper: "Замењује аутоматско проналажење: ID-ови ентитета или {entity, name, icon}",
    ed_thresholds: "Прагови комфора (YAML)",
    ed_thresholds_helper: "По врсти, у јединици сензора, нпр. co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Собе/Просторије (YAML)",
    ed_rooms_helper: "Редослед и измене: листа са {area, name, icon, navigation_path}",
    ed_navigation_path: "Путања за навигацију",
    ed_all_off_button: "Дугме „Искључи све“",
    err_config: "Подесите `area` или `entities`",
    zoom_in: "Прикажи целу картицу",
    zoom_out: "Назад на компактни приказ",
    ed_zoom: "Дугме за увећање",
    ed_zoom_helper: "Пребацује мини картицу на пун приказ и назад",
    rooms_all: "Прикажи сваку собу",
    rooms_check: "Само собе које захтевају пажњу",
    ed_sort: "Сортирање",
    ed_sort_name: "По имену",
    ed_exclude_areas: "Изостави собе",
  },
  "sr-Latn": {
    all_closed: "Sve je zatvoreno",
    all_quiet: "Sve je mirno",
    open_one: "{n} otvoreno",
    open_few: "{n} otvorena",
    open_many: "{n} otvorenih",
    unavail_one: "Nedostupno: {n}",
    unavail_many: "Nedostupno: {n}",
    leak: "Curenje vode",
    smoke: "Otkriven dim",
    gas: "Otkriven gas",
    co: "Ugljen-monoksid",
    detected: "Otkriveno",
    clear: "Nije otkriveno",
    unavailable: "Nedostupno",
    on: "Uključeno",
    off: "Isključeno",
    turn_all_off: "Isključi sve",
    ed_area: "Prostorija",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_title_helper: "Ostavi prazno za naziv prostorije",
    ed_columns: "Kolone",
    ed_layout: "Raspored",
    ed_layout_helper: "Pločice: jedna velika pločica po entitetu, kao kartica Pločica, lakše za dodir na telefonu",
    ed_layout_compact: "Zbijeno",
    ed_layout_tiles: "Pločice",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistant-a",
    ed_language_auto: "Automatski",
    ed_entities: "Eksplicitni entiteti (YAML)",
    ed_entities_helper: "Zamenjuje automatsko pronalaženje: ID-ovi entiteta ili {entity, name, icon}",
    ed_thresholds: "Pragovi komfora (YAML)",
    ed_thresholds_helper: "Po vrsti, u jedinici senzora, npr. co2: [800, 1200] ili humidity: [25, 35, 70, 80]",
    ed_rooms: "Sobe/Prostorije (YAML)",
    ed_rooms_helper: "Redosled i izmene: lista sa {area, name, icon, navigation_path}",
    ed_navigation_path: "Putanja za navigaciju",
    ed_all_off_button: "Dugme „Isključi sve“",
    err_config: "Podesite `area` ili `entities`",
    zoom_in: "Prikaži celu karticu",
    zoom_out: "Nazad na kompaktni prikaz",
    ed_zoom: "Dugme za uvećanje",
    ed_zoom_helper: "Prebacuje mini karticu na pun prikaz i nazad",
    rooms_all: "Prikaži svaku sobu",
    rooms_check: "Samo sobe koje zahtevaju pažnju",
    ed_sort: "Sortiranje",
    ed_sort_name: "Po imenu",
    ed_exclude_areas: "Izostavi sobe",
  },
  it: {
    all_closed: "Tutto chiuso",
    all_quiet: "Tutto calmo",
    open_one: "{n} apertura",
    open_many: "{n} aperture",
    unavail_one: "{n} non disponibile",
    unavail_many: "{n} non disponibili",
    leak: "Perdita d'acqua",
    smoke: "Fumo rilevato",
    gas: "Gas rilevato",
    co: "Monossido di carbonio",
    detected: "Rilevato",
    clear: "Non rilevato",
    unavailable: "Non disponibile",
    on: "Accesa",
    off: "Spenta",
    turn_all_off: "Spegni tutto",
    ed_area: "Area",
    ed_title: "Titolo",
    ed_show_title: "Mostra il titolo",
    ed_title_helper: "Lascia vuoto per usare il nome dell'area",
    ed_columns: "Colonne",
    ed_layout: "Layout",
    ed_layout_helper: "Riquadri: un riquadro grande per entità, come la scheda Riquadro, più facile da toccare sul telefono",
    ed_layout_compact: "Compatto",
    ed_layout_tiles: "Riquadri",
    ed_advanced: "Avanzate",
    ed_language: "Lingua",
    ed_language_helper: "Vuoto: la lingua di Home Assistant",
    ed_language_auto: "Automatica",
    ed_entities: "Entità esplicite (YAML)",
    ed_entities_helper: "Sostituisce il rilevamento automatico: ID entità o {entity, name, icon}",
    ed_thresholds: "Soglie di comfort (YAML)",
    ed_thresholds_helper: "Per tipo, nell'unità del sensore, ad es. co2: [800, 1200] o humidity: [25, 35, 70, 80]",
    ed_rooms: "Stanze (YAML)",
    ed_rooms_helper: "Ordine e personalizzazioni: un elenco di {area, name, icon, navigation_path}",
    ed_navigation_path: "Percorso di navigazione",
    ed_all_off_button: "Pulsante «Spegni tutto»",
    err_config: "Imposta `area` o `entities`",
    zoom_in: "Mostra la scheda completa",
    zoom_out: "Torna alla vista compatta",
    ed_zoom: "Pulsante zoom",
    ed_zoom_helper: "Passa dalla mini scheda alla scheda completa e viceversa",
    rooms_all: "Mostra tutte le stanze",
    rooms_check: "Solo le stanze da controllare",
    ed_sort: "Ordinamento",
    ed_sort_name: "Per nome",
    ed_exclude_areas: "Stanze da escludere",
  },
  nl: {
    all_closed: "Alles dicht",
    all_quiet: "Alles rustig",
    open_one: "{n} open",
    open_many: "{n} open",
    unavail_one: "{n} niet beschikbaar",
    unavail_many: "{n} niet beschikbaar",
    leak: "Waterlek",
    smoke: "Rook gedetecteerd",
    gas: "Gas gedetecteerd",
    co: "Koolmonoxide",
    detected: "Gedetecteerd",
    clear: "Niet gedetecteerd",
    unavailable: "Niet beschikbaar",
    on: "Aan",
    off: "Uit",
    turn_all_off: "Alles uitschakelen",
    ed_area: "Ruimte",
    ed_title: "Titel",
    ed_show_title: "Titel tonen",
    ed_title_helper: "Leeg laten voor de naam van de ruimte",
    ed_columns: "Kolommen",
    ed_layout: "Indeling",
    ed_layout_helper: "Tegels: één grote tegel per entiteit, zoals de Tegel-kaart, makkelijker aan te tikken op een telefoon",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Tegels",
    ed_advanced: "Geavanceerd",
    ed_language: "Taal",
    ed_language_helper: "Leeg: de taal van Home Assistant",
    ed_language_auto: "Automatisch",
    ed_entities: "Expliciete entiteiten (YAML)",
    ed_entities_helper: "Vervangt de automatische detectie: entiteit-ID's of {entity, name, icon}",
    ed_thresholds: "Comfortdrempels (YAML)",
    ed_thresholds_helper: "Per soort, in de eenheid van de sensor, bijv. co2: [800, 1200] of humidity: [25, 35, 70, 80]",
    ed_rooms: "Ruimtes (YAML)",
    ed_rooms_helper: "Volgorde en aanpassingen: een lijst van {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigatiepad",
    ed_all_off_button: "Knop “Alles uitschakelen”",
    err_config: "Stel `area` of `entities` in",
    zoom_in: "Volledige kaart tonen",
    zoom_out: "Terug naar de compacte weergave",
    ed_zoom: "Zoomknop",
    ed_zoom_helper: "Schakelt de minikaart naar de volledige kaart en terug",
    rooms_all: "Alle ruimtes tonen",
    rooms_check: "Alleen de ruimtes die aandacht nodig hebben",
    ed_sort: "Sortering",
    ed_sort_name: "Op naam",
    ed_exclude_areas: "Uit te sluiten ruimtes",
  },
  pt: {
    all_closed: "Tudo fechado",
    all_quiet: "Tudo calmo",
    open_one: "{n} abertura",
    open_many: "{n} aberturas",
    unavail_one: "{n} indisponível",
    unavail_many: "{n} indisponíveis",
    leak: "Fuga de água",
    smoke: "Fumo detetado",
    gas: "Gás detetado",
    co: "Monóxido de carbono",
    detected: "Detetado",
    clear: "Não detetado",
    unavailable: "Indisponível",
    on: "Ligada",
    off: "Desligada",
    turn_all_off: "Desligar tudo",
    ed_area: "Área",
    ed_title: "Título",
    ed_show_title: "Mostrar o título",
    ed_title_helper: "Deixe vazio para usar o nome da área",
    ed_columns: "Colunas",
    ed_layout: "Disposição",
    ed_layout_helper: "Mosaicos: um mosaico grande por entidade, como o cartão Mosaico, mais fácil de tocar no telemóvel",
    ed_layout_compact: "Compacta",
    ed_layout_tiles: "Mosaicos",
    ed_advanced: "Avançado",
    ed_language: "Idioma",
    ed_language_helper: "Vazio: o idioma do Home Assistant",
    ed_language_auto: "Automático",
    ed_entities: "Entidades explícitas (YAML)",
    ed_entities_helper: "Substitui a deteção automática: IDs de entidade, ou {entity, name, icon}",
    ed_thresholds: "Limiares de conforto (YAML)",
    ed_thresholds_helper: "Por tipo, na unidade do sensor, p. ex. co2: [800, 1200] ou humidity: [25, 35, 70, 80]",
    ed_rooms: "Divisões (YAML)",
    ed_rooms_helper: "Ordem e personalização: uma lista de {area, name, icon, navigation_path}",
    ed_navigation_path: "Caminho de navegação",
    ed_all_off_button: "Botão «Desligar tudo»",
    err_config: "Defina `area` ou `entities`",
    zoom_in: "Mostrar o cartão completo",
    zoom_out: "Voltar à vista compacta",
    ed_zoom: "Botão de zoom",
    ed_zoom_helper: "Alterna entre o minicartão e o cartão completo",
    rooms_all: "Mostrar todas as divisões",
    rooms_check: "Só as divisões que precisam de atenção",
    ed_sort: "Ordenação",
    ed_sort_name: "Por nome",
    ed_exclude_areas: "Divisões a excluir",
  },
  pl: {
    all_closed: "Zamknięte",
    all_quiet: "Spokojnie",
    open_one: "Otwarte: {n}",
    open_many: "Otwarte: {n}",
    unavail_one: "Niedostępne: {n}",
    unavail_many: "Niedostępne: {n}",
    leak: "Wyciek wody",
    smoke: "Wykryto dym",
    gas: "Wykryto gaz",
    co: "Tlenek węgla",
    detected: "Wykryto",
    clear: "Nie wykryto",
    unavailable: "Niedostępne",
    on: "Włączone",
    off: "Wyłączone",
    turn_all_off: "Wyłącz wszystko",
    ed_area: "Obszar",
    ed_title: "Tytuł",
    ed_show_title: "Pokaż tytuł",
    ed_title_helper: "Pozostaw puste, aby użyć nazwy obszaru",
    ed_columns: "Kolumny",
    ed_layout: "Układ",
    ed_layout_helper: "Kafelki: jeden duży kafelek na encję, jak karta Kafelek, łatwiejszy do dotknięcia na telefonie",
    ed_layout_compact: "Kompaktowy",
    ed_layout_tiles: "Kafelki",
    ed_advanced: "Zaawansowane",
    ed_language: "Język",
    ed_language_helper: "Puste: język Home Assistanta",
    ed_language_auto: "Automatyczny",
    ed_entities: "Jawnie podane encje (YAML)",
    ed_entities_helper: "Zastępuje automatyczne wykrywanie: identyfikatory encji lub {entity, name, icon}",
    ed_thresholds: "Progi komfortu (YAML)",
    ed_thresholds_helper: "Dla każdego rodzaju, w jednostce czujnika, np. co2: [800, 1200] lub humidity: [25, 35, 70, 80]",
    ed_rooms: "Pomieszczenia (YAML)",
    ed_rooms_helper: "Kolejność i nadpisania: lista {area, name, icon, navigation_path}",
    ed_navigation_path: "Ścieżka nawigacji",
    ed_all_off_button: "Przycisk „Wyłącz wszystko”",
    err_config: "Ustaw `area` lub `entities`",
    zoom_in: "Pokaż pełną kartę",
    zoom_out: "Wróć do widoku kompaktowego",
    ed_zoom: "Przycisk powiększenia",
    ed_zoom_helper: "Przełącza minikartę na pełną kartę i z powrotem",
    rooms_all: "Pokaż wszystkie pomieszczenia",
    rooms_check: "Tylko pomieszczenia wymagające uwagi",
    ed_sort: "Sortowanie",
    ed_sort_name: "Według nazwy",
    ed_exclude_areas: "Pomieszczenia do wykluczenia",
  },
  ro: {
    all_closed: "Totul închis",
    all_quiet: "Totul liniștit",
    open_one: "Deschise: {n}",
    open_many: "Deschise: {n}",
    unavail_one: "Indisponibile: {n}",
    unavail_many: "Indisponibile: {n}",
    leak: "Scurgere",
    smoke: "Fum detectat",
    gas: "Gaz detectat",
    co: "Monoxid de carbon",
    detected: "Detectat",
    clear: "Nedetectat",
    unavailable: "Indisponibil",
    on: "Pornită",
    off: "Oprită",
    turn_all_off: "Oprește tot",
    ed_area: "Zonă",
    ed_title: "Titlu",
    ed_show_title: "Afișează titlul",
    ed_title_helper: "Lasă gol pentru numele zonei",
    ed_columns: "Coloane",
    ed_layout: "Aspect",
    ed_layout_helper: "Plăci: o placă mare pentru fiecare entitate, ca fișa Placă, mai ușor de atins pe telefon",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Plăci",
    ed_advanced: "Avansat",
    ed_language: "Limbă",
    ed_language_helper: "Gol: limba Home Assistant",
    ed_language_auto: "Automată",
    ed_entities: "Entități explicite (YAML)",
    ed_entities_helper: "Înlocuiește detectarea automată: ID-uri de entitate sau {entity, name, icon}",
    ed_thresholds: "Praguri de confort (YAML)",
    ed_thresholds_helper: "Pe tip, în unitatea senzorului, de ex. co2: [800, 1200] sau humidity: [25, 35, 70, 80]",
    ed_rooms: "Camere (YAML)",
    ed_rooms_helper: "Ordine și personalizări: o listă de {area, name, icon, navigation_path}",
    ed_navigation_path: "Cale de navigare",
    ed_all_off_button: "Butonul „Oprește tot”",
    err_config: "Setează `area` sau `entities`",
    zoom_in: "Afișează cardul complet",
    zoom_out: "Înapoi la vizualizarea compactă",
    ed_zoom: "Buton de zoom",
    ed_zoom_helper: "Comută între mini-card și cardul complet",
    rooms_all: "Afișează toate camerele",
    rooms_check: "Doar camerele care necesită atenție",
    ed_sort: "Sortare",
    ed_sort_name: "După nume",
    ed_exclude_areas: "Camere excluse",
  },
  da: {
    all_closed: "Alt lukket",
    all_quiet: "Alt roligt",
    open_one: "{n} åben",
    open_many: "{n} åbne",
    unavail_one: "{n} utilgængelig",
    unavail_many: "{n} utilgængelige",
    leak: "Vandlækage",
    smoke: "Røg registreret",
    gas: "Gas registreret",
    co: "Kulilte",
    detected: "Registreret",
    clear: "Ikke registreret",
    unavailable: "Utilgængelig",
    on: "Tændt",
    off: "Slukket",
    turn_all_off: "Sluk alt",
    ed_area: "Område",
    ed_title: "Titel",
    ed_show_title: "Vis titel",
    ed_title_helper: "Lad stå tomt for at bruge områdets navn",
    ed_columns: "Kolonner",
    ed_layout: "Layout",
    ed_layout_helper: "Fliser: én stor flise pr. entitet som Flise-kortet, nemmere at trykke på en telefon",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Fliser",
    ed_advanced: "Avanceret",
    ed_language: "Sprog",
    ed_language_helper: "Tomt: Home Assistants sprog",
    ed_language_auto: "Automatisk",
    ed_entities: "Eksplicitte enheder (YAML)",
    ed_entities_helper: "Erstatter den automatiske registrering: enheds-id'er eller {entity, name, icon}",
    ed_thresholds: "Komforttærskler (YAML)",
    ed_thresholds_helper: "Pr. type, i sensorens enhed, f.eks. co2: [800, 1200] eller humidity: [25, 35, 70, 80]",
    ed_rooms: "Rum (YAML)",
    ed_rooms_helper: "Rækkefølge og tilpasninger: en liste med {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigationssti",
    ed_all_off_button: "Knappen »Sluk alt«",
    err_config: "Angiv `area` eller `entities`",
    zoom_in: "Vis hele kortet",
    zoom_out: "Tilbage til den kompakte visning",
    ed_zoom: "Zoomknap",
    ed_zoom_helper: "Skifter fra minikortet til hele kortet og tilbage",
    rooms_all: "Vis alle rum",
    rooms_check: "Kun rum, der kræver opmærksomhed",
    ed_sort: "Sortering",
    ed_sort_name: "Efter navn",
    ed_exclude_areas: "Rum, der udelades",
  },
  sv: {
    all_closed: "Allt stängt",
    all_quiet: "Allt lugnt",
    open_one: "{n} öppen",
    open_many: "{n} öppna",
    unavail_one: "{n} ej tillgänglig",
    unavail_many: "{n} ej tillgängliga",
    leak: "Vattenläcka",
    smoke: "Rök upptäckt",
    gas: "Gas upptäckt",
    co: "Kolmonoxid",
    detected: "Upptäckt",
    clear: "Inte upptäckt",
    unavailable: "Ej tillgänglig",
    on: "På",
    off: "Av",
    turn_all_off: "Stäng av allt",
    ed_area: "Område",
    ed_title: "Titel",
    ed_show_title: "Visa rubrik",
    ed_title_helper: "Lämna tomt för områdets namn",
    ed_columns: "Kolumner",
    ed_layout: "Layout",
    ed_layout_helper: "Rutor: en stor ruta per entitet, som Ruta-kortet, lättare att trycka på i mobilen",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Rutor",
    ed_advanced: "Avancerat",
    ed_language: "Språk",
    ed_language_helper: "Tomt: Home Assistants språk",
    ed_language_auto: "Automatiskt",
    ed_entities: "Explicita entiteter (YAML)",
    ed_entities_helper: "Ersätter den automatiska identifieringen: entitets-ID:n eller {entity, name, icon}",
    ed_thresholds: "Komfortgränser (YAML)",
    ed_thresholds_helper: "Per typ, i sensorns enhet, t.ex. co2: [800, 1200] eller humidity: [25, 35, 70, 80]",
    ed_rooms: "Rum (YAML)",
    ed_rooms_helper: "Ordning och anpassningar: en lista med {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigeringssökväg",
    ed_all_off_button: "Knappen ”Stäng av allt”",
    err_config: "Ange `area` eller `entities`",
    zoom_in: "Visa hela kortet",
    zoom_out: "Tillbaka till kompakt vy",
    ed_zoom: "Zoomknapp",
    ed_zoom_helper: "Växlar mellan minikortet och hela kortet",
    rooms_all: "Visa alla rum",
    rooms_check: "Bara rum som behöver ses över",
    ed_sort: "Sortering",
    ed_sort_name: "Efter namn",
    ed_exclude_areas: "Rum att utesluta",
  },
  bg: {
    all_closed: "Всичко е затворено",
    all_quiet: "Всичко е спокойно",
    open_one: "Отворени: {n}",
    open_many: "Отворени: {n}",
    unavail_one: "Недостъпни: {n}",
    unavail_many: "Недостъпни: {n}",
    leak: "Теч на вода",
    smoke: "Открит дим",
    gas: "Открит газ",
    co: "Въглероден оксид",
    detected: "Открито",
    clear: "Не е открито",
    unavailable: "Недостъпно",
    on: "Включен",
    off: "Изключен",
    turn_all_off: "Изключи всичко",
    ed_area: "Зона",
    ed_title: "Заглавие",
    ed_show_title: "Показване на заглавието",
    ed_title_helper: "Оставете празно за името на зоната",
    ed_columns: "Колони",
    ed_layout: "Оформление",
    ed_layout_helper: "Плочки: по една голяма плочка за обект, като картата Плочка, по-лесна за докосване на телефон",
    ed_layout_compact: "Компактно",
    ed_layout_tiles: "Плочки",
    ed_advanced: "Разширени",
    ed_language: "Език",
    ed_language_helper: "Празно: езикът на Home Assistant",
    ed_language_auto: "Автоматично",
    ed_entities: "Изрично зададени обекти (YAML)",
    ed_entities_helper: "Заменя автоматичното откриване: ID на обекти или {entity, name, icon}",
    ed_thresholds: "Прагове на комфорт (YAML)",
    ed_thresholds_helper: "По вид, в мерната единица на сензора, напр. co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Стаи (YAML)",
    ed_rooms_helper: "Ред и персонализиране: списък от {area, name, icon, navigation_path}",
    ed_navigation_path: "Път за навигация",
    ed_all_off_button: "Бутон „Изключи всичко“",
    err_config: "Задайте `area` или `entities`",
    zoom_in: "Покажи пълната карта",
    zoom_out: "Обратно към компактния изглед",
    ed_zoom: "Бутон за увеличение",
    ed_zoom_helper: "Превключва от мини картата към пълната карта и обратно",
    rooms_all: "Покажи всички стаи",
    rooms_check: "Само стаите, които изискват внимание",
    ed_sort: "Сортиране",
    ed_sort_name: "По име",
    ed_exclude_areas: "Стаи за пропускане",
  },
  ru: {
    all_closed: "Всё закрыто",
    all_quiet: "Всё спокойно",
    open_one: "Открыто: {n}",
    open_many: "Открыто: {n}",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Протечка",
    smoke: "Обнаружен дым",
    gas: "Обнаружен газ",
    co: "Угарный газ",
    detected: "Обнаружено",
    clear: "Не обнаружено",
    unavailable: "Недоступно",
    on: "Включено",
    off: "Выключено",
    turn_all_off: "Выключить всё",
    ed_area: "Пространство",
    ed_title: "Заголовок",
    ed_show_title: "Показывать заголовок",
    ed_title_helper: "Оставьте пустым, чтобы использовать название пространства",
    ed_columns: "Столбцы",
    ed_layout: "Макет",
    ed_layout_helper: "Плитки: одна большая плитка на объект, как карточка «Плитка», удобнее нажимать на телефоне",
    ed_layout_compact: "Компактный",
    ed_layout_tiles: "Плитки",
    ed_advanced: "Дополнительно",
    ed_language: "Язык",
    ed_language_helper: "Пусто: язык Home Assistant",
    ed_language_auto: "Автоматически",
    ed_entities: "Явно заданные объекты (YAML)",
    ed_entities_helper: "Заменяет автоматическое обнаружение: ID объектов или {entity, name, icon}",
    ed_thresholds: "Пороги комфорта (YAML)",
    ed_thresholds_helper: "Для каждого типа, в единицах датчика, например co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Комнаты (YAML)",
    ed_rooms_helper: "Порядок и настройки: список {area, name, icon, navigation_path}",
    ed_navigation_path: "Путь навигации",
    ed_all_off_button: "Кнопка «Выключить всё»",
    err_config: "Укажите `area` или `entities`",
    zoom_in: "Показать полную карточку",
    zoom_out: "Вернуться к компактному виду",
    ed_zoom: "Кнопка масштаба",
    ed_zoom_helper: "Переключает мини-карточку на полную карточку и обратно",
    rooms_all: "Показать все комнаты",
    rooms_check: "Только комнаты, требующие внимания",
    ed_sort: "Сортировка",
    ed_sort_name: "По названию",
    ed_exclude_areas: "Исключить комнаты",
  },
  uk: {
    all_closed: "Усе зачинено",
    all_quiet: "Усе спокійно",
    open_one: "Відчинено: {n}",
    open_many: "Відчинено: {n}",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Витік води",
    smoke: "Виявлено дим",
    gas: "Виявлено газ",
    co: "Чадний газ",
    detected: "Виявлено",
    clear: "Не виявлено",
    unavailable: "Недоступно",
    on: "Увімкнено",
    off: "Вимкнено",
    turn_all_off: "Вимкнути все",
    ed_area: "Простір",
    ed_title: "Заголовок",
    ed_show_title: "Показувати заголовок",
    ed_title_helper: "Залиште порожнім, щоб використати назву простору",
    ed_columns: "Стовпці",
    ed_layout: "Макет",
    ed_layout_helper: "Плитки: одна велика плитка на сутність, як картка «Плитка», зручніше торкатися на телефоні",
    ed_layout_compact: "Компактний",
    ed_layout_tiles: "Плитки",
    ed_advanced: "Додатково",
    ed_language: "Мова",
    ed_language_helper: "Порожньо: мова Home Assistant",
    ed_language_auto: "Автоматично",
    ed_entities: "Явно задані сутності (YAML)",
    ed_entities_helper: "Замінює автоматичне виявлення: ID сутностей або {entity, name, icon}",
    ed_thresholds: "Пороги комфорту (YAML)",
    ed_thresholds_helper: "Для кожного типу, в одиницях датчика, наприклад co2: [800, 1200] або humidity: [25, 35, 70, 80]",
    ed_rooms: "Кімнати (YAML)",
    ed_rooms_helper: "Порядок і налаштування: список {area, name, icon, navigation_path}",
    ed_navigation_path: "Шлях навігації",
    ed_all_off_button: "Кнопка «Вимкнути все»",
    err_config: "Вкажіть `area` або `entities`",
    zoom_in: "Показати повну картку",
    zoom_out: "Повернутися до компактного вигляду",
    ed_zoom: "Кнопка масштабу",
    ed_zoom_helper: "Перемикає міні-картку на повну картку й назад",
    rooms_all: "Показати всі кімнати",
    rooms_check: "Лише кімнати, що потребують уваги",
    ed_sort: "Сортування",
    ed_sort_name: "За назвою",
    ed_exclude_areas: "Виключити кімнати",
  },
  hu: {
    all_closed: "Minden zárva",
    all_quiet: "Minden nyugodt",
    open_one: "{n} nyitva",
    open_many: "{n} nyitva",
    unavail_one: "{n} nem elérhető",
    unavail_many: "{n} nem elérhető",
    leak: "Vízszivárgás",
    smoke: "Füst észlelve",
    gas: "Gáz észlelve",
    co: "Szén-monoxid",
    detected: "Észlelve",
    clear: "Nincs észlelés",
    unavailable: "Nem elérhető",
    on: "Be",
    off: "Ki",
    turn_all_off: "Minden kikapcsolása",
    ed_area: "Terület",
    ed_title: "Cím",
    ed_show_title: "Cím megjelenítése",
    ed_title_helper: "Hagyd üresen a terület nevéhez",
    ed_columns: "Oszlopok",
    ed_layout: "Elrendezés",
    ed_layout_helper: "Csempék: entitásonként egy nagy csempe, mint a Csempe kártya, telefonon könnyebb megérinteni",
    ed_layout_compact: "Tömör",
    ed_layout_tiles: "Csempék",
    ed_advanced: "Speciális",
    ed_language: "Nyelv",
    ed_language_helper: "Üres: a Home Assistant nyelve",
    ed_language_auto: "Automatikus",
    ed_entities: "Kifejezetten megadott entitások (YAML)",
    ed_entities_helper: "Felülírja az automatikus felismerést: entitásazonosítók vagy {entity, name, icon}",
    ed_thresholds: "Komfortküszöbök (YAML)",
    ed_thresholds_helper: "Típusonként, az érzékelő mértékegységében, pl. co2: [800, 1200] vagy humidity: [25, 35, 70, 80]",
    ed_rooms: "Helyiségek (YAML)",
    ed_rooms_helper: "Sorrend és testreszabás: {area, name, icon, navigation_path} elemek listája",
    ed_navigation_path: "Navigációs útvonal",
    ed_all_off_button: "„Minden kikapcsolása” gomb",
    err_config: "Állítsd be az `area` vagy az `entities` értékét",
    zoom_in: "A teljes kártya megjelenítése",
    zoom_out: "Vissza a kompakt nézethez",
    ed_zoom: "Nagyítás gomb",
    ed_zoom_helper: "Vált a mini kártya és a teljes kártya között",
    rooms_all: "Minden helyiség megjelenítése",
    rooms_check: "Csak a figyelmet igénylő helyiségek",
    ed_sort: "Rendezés",
    ed_sort_name: "Név szerint",
    ed_exclude_areas: "Kihagyott helyiségek",
  },
  sk: {
    all_closed: "Všetko zatvorené",
    all_quiet: "Všetko pokojné",
    open_one: "Otvorené: {n}",
    open_many: "Otvorené: {n}",
    unavail_one: "Nedostupné: {n}",
    unavail_many: "Nedostupné: {n}",
    leak: "Únik vody",
    smoke: "Zistený dym",
    gas: "Zistený plyn",
    co: "Oxid uhoľnatý",
    detected: "Zistené",
    clear: "Nezistené",
    unavailable: "Nedostupné",
    on: "Zapnuté",
    off: "Vypnuté",
    turn_all_off: "Vypnúť všetko",
    ed_area: "Oblasť",
    ed_title: "Názov",
    ed_show_title: "Zobraziť názov",
    ed_title_helper: "Nechajte prázdne pre názov oblasti",
    ed_columns: "Stĺpce",
    ed_layout: "Rozloženie",
    ed_layout_helper: "Dlaždice: jedna veľká dlaždica na entitu ako karta Dlaždica, na telefóne sa ľahšie ťuká",
    ed_layout_compact: "Kompaktné",
    ed_layout_tiles: "Dlaždice",
    ed_advanced: "Rozšírené",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdne: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_entities: "Explicitné entity (YAML)",
    ed_entities_helper: "Nahrádza automatické vyhľadávanie: ID entít alebo {entity, name, icon}",
    ed_thresholds: "Prahy komfortu (YAML)",
    ed_thresholds_helper: "Podľa druhu, v jednotke senzora, napr. co2: [800, 1200] alebo humidity: [25, 35, 70, 80]",
    ed_rooms: "Miestnosti (YAML)",
    ed_rooms_helper: "Poradie a úpravy: zoznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigačná cesta",
    ed_all_off_button: "Tlačidlo „Vypnúť všetko“",
    err_config: "Nastavte `area` alebo `entities`",
    zoom_in: "Zobraziť celú kartu",
    zoom_out: "Späť na kompaktné zobrazenie",
    ed_zoom: "Tlačidlo priblíženia",
    ed_zoom_helper: "Prepína minikartu na celú kartu a späť",
    rooms_all: "Zobraziť všetky miestnosti",
    rooms_check: "Len miestnosti vyžadujúce pozornosť",
    ed_sort: "Zoradenie",
    ed_sort_name: "Podľa názvu",
    ed_exclude_areas: "Vynechané miestnosti",
  },
  cs: {
    all_closed: "Vše zavřeno",
    all_quiet: "Vše v klidu",
    open_one: "Otevřeno: {n}",
    open_many: "Otevřeno: {n}",
    unavail_one: "Nedostupné: {n}",
    unavail_many: "Nedostupné: {n}",
    leak: "Únik vody",
    smoke: "Zjištěn kouř",
    gas: "Zjištěn plyn",
    co: "Oxid uhelnatý",
    detected: "Zjištěno",
    clear: "Nezjištěno",
    unavailable: "Nedostupné",
    on: "Zapnuto",
    off: "Vypnuto",
    turn_all_off: "Vypnout vše",
    ed_area: "Oblast",
    ed_title: "Název",
    ed_show_title: "Zobrazit název",
    ed_title_helper: "Ponechte prázdné pro název oblasti",
    ed_columns: "Sloupce",
    ed_layout: "Rozložení",
    ed_layout_helper: "Dlaždice: jedna velká dlaždice na entitu jako karta Dlaždice, na telefonu se snáz ťuká",
    ed_layout_compact: "Kompaktní",
    ed_layout_tiles: "Dlaždice",
    ed_advanced: "Pokročilé",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdné: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_entities: "Explicitní entity (YAML)",
    ed_entities_helper: "Nahrazuje automatické vyhledávání: ID entit nebo {entity, name, icon}",
    ed_thresholds: "Prahy komfortu (YAML)",
    ed_thresholds_helper: "Podle druhu, v jednotce senzoru, např. co2: [800, 1200] nebo humidity: [25, 35, 70, 80]",
    ed_rooms: "Místnosti (YAML)",
    ed_rooms_helper: "Pořadí a úpravy: seznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigační cesta",
    ed_all_off_button: "Tlačítko „Vypnout vše“",
    err_config: "Nastavte `area` nebo `entities`",
    zoom_in: "Zobrazit celou kartu",
    zoom_out: "Zpět na kompaktní zobrazení",
    ed_zoom: "Tlačítko přiblížení",
    ed_zoom_helper: "Přepíná minikartu na celou kartu a zpět",
    rooms_all: "Zobrazit všechny místnosti",
    rooms_check: "Jen místnosti vyžadující pozornost",
    ed_sort: "Řazení",
    ed_sort_name: "Podle názvu",
    ed_exclude_areas: "Vynechané místnosti",
  },
  sl: {
    all_closed: "Vse zaprto",
    all_quiet: "Vse mirno",
    open_one: "Odprto: {n}",
    open_many: "Odprto: {n}",
    unavail_one: "Ni na voljo: {n}",
    unavail_many: "Ni na voljo: {n}",
    leak: "Puščanje vode",
    smoke: "Zaznan dim",
    gas: "Zaznan plin",
    co: "Ogljikov monoksid",
    detected: "Zaznano",
    clear: "Ni zaznano",
    unavailable: "Ni na voljo",
    on: "Vklopljeno",
    off: "Izklopljeno",
    turn_all_off: "Izklopi vse",
    ed_area: "Območje",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_title_helper: "Pustite prazno za ime območja",
    ed_columns: "Stolpci",
    ed_layout: "Postavitev",
    ed_layout_helper: "Ploščice: ena velika ploščica na entiteto, kot kartica Ploščica, lažje za dotik na telefonu",
    ed_layout_compact: "Strnjena",
    ed_layout_tiles: "Ploščice",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistanta",
    ed_language_auto: "Samodejno",
    ed_entities: "Izrecno navedene entitete (YAML)",
    ed_entities_helper: "Nadomesti samodejno zaznavanje: ID-ji entitet ali {entity, name, icon}",
    ed_thresholds: "Pragovi udobja (YAML)",
    ed_thresholds_helper: "Po vrsti, v enoti senzorja, npr. co2: [800, 1200] ali humidity: [25, 35, 70, 80]",
    ed_rooms: "Prostori (YAML)",
    ed_rooms_helper: "Vrstni red in prilagoditve: seznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigacijska pot",
    ed_all_off_button: "Gumb »Izklopi vse«",
    err_config: "Nastavite `area` ali `entities`",
    zoom_in: "Prikaži celotno kartico",
    zoom_out: "Nazaj na strnjen pogled",
    ed_zoom: "Gumb za povečavo",
    ed_zoom_helper: "Preklopi mini kartico v celotno kartico in nazaj",
    rooms_all: "Prikaži vse prostore",
    rooms_check: "Samo prostori, ki potrebujejo pozornost",
    ed_sort: "Razvrščanje",
    ed_sort_name: "Po imenu",
    ed_exclude_areas: "Izpuščeni prostori",
  },
  lv: {
    all_closed: "Viss aizvērts",
    all_quiet: "Viss mierīgi",
    open_one: "Atvērti: {n}",
    open_many: "Atvērti: {n}",
    unavail_one: "Nav pieejami: {n}",
    unavail_many: "Nav pieejami: {n}",
    leak: "Ūdens noplūde",
    smoke: "Konstatēti dūmi",
    gas: "Konstatēta gāze",
    co: "Tvana gāze",
    detected: "Konstatēts",
    clear: "Nav konstatēts",
    unavailable: "Nav pieejams",
    on: "Ieslēgts",
    off: "Izslēgts",
    turn_all_off: "Izslēgt visu",
    ed_area: "Zona",
    ed_title: "Virsraksts",
    ed_show_title: "Rādīt virsrakstu",
    ed_title_helper: "Atstājiet tukšu, lai izmantotu zonas nosaukumu",
    ed_columns: "Kolonnas",
    ed_layout: "Izkārtojums",
    ed_layout_helper: "Flīzes: viena liela flīze katrai entītijai kā kartītē Flīze, tālrunī vieglāk pieskarties",
    ed_layout_compact: "Kompakts",
    ed_layout_tiles: "Flīzes",
    ed_advanced: "Papildu",
    ed_language: "Valoda",
    ed_language_helper: "Tukšs: Home Assistant valoda",
    ed_language_auto: "Automātiski",
    ed_entities: "Tieši norādītas vienības (YAML)",
    ed_entities_helper: "Aizstāj automātisko noteikšanu: vienību ID vai {entity, name, icon}",
    ed_thresholds: "Komforta sliekšņi (YAML)",
    ed_thresholds_helper: "Pēc veida, sensora mērvienībā, piem., co2: [800, 1200] vai humidity: [25, 35, 70, 80]",
    ed_rooms: "Telpas (YAML)",
    ed_rooms_helper: "Secība un pielāgojumi: saraksts ar {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigācijas ceļš",
    ed_all_off_button: "Poga “Izslēgt visu”",
    err_config: "Iestatiet `area` vai `entities`",
    zoom_in: "Rādīt pilno karti",
    zoom_out: "Atpakaļ uz kompakto skatu",
    ed_zoom: "Tālummaiņas poga",
    ed_zoom_helper: "Pārslēdz mini karti uz pilno karti un atpakaļ",
    rooms_all: "Rādīt visas telpas",
    rooms_check: "Tikai telpas, kurām jāpievērš uzmanība",
    ed_sort: "Kārtošana",
    ed_sort_name: "Pēc nosaukuma",
    ed_exclude_areas: "Izslēdzamās telpas",
  },
  el: {
    all_closed: "Όλα κλειστά",
    all_quiet: "Όλα ήσυχα",
    open_one: "{n} ανοιχτό",
    open_many: "{n} ανοιχτά",
    unavail_one: "Μη διαθέσιμα: {n}",
    unavail_many: "Μη διαθέσιμα: {n}",
    leak: "Διαρροή νερού",
    smoke: "Ανιχνεύθηκε καπνός",
    gas: "Ανιχνεύθηκε αέριο",
    co: "Μονοξείδιο του άνθρακα",
    detected: "Ανιχνεύθηκε",
    clear: "Δεν ανιχνεύθηκε",
    unavailable: "Μη διαθέσιμο",
    on: "Ενεργή",
    off: "Ανενεργή",
    turn_all_off: "Απενεργοποίηση όλων",
    ed_area: "Περιοχή",
    ed_title: "Τίτλος",
    ed_show_title: "Εμφάνιση τίτλου",
    ed_title_helper: "Αφήστε το κενό για το όνομα της περιοχής",
    ed_columns: "Στήλες",
    ed_layout: "Διάταξη",
    ed_layout_helper: "Πλακίδια: ένα μεγάλο πλακίδιο ανά οντότητα, όπως η κάρτα Πλακίδιο, πιο εύκολο στο πάτημα στο κινητό",
    ed_layout_compact: "Συμπαγής",
    ed_layout_tiles: "Πλακίδια",
    ed_advanced: "Για προχωρημένους",
    ed_language: "Γλώσσα",
    ed_language_helper: "Κενό: η γλώσσα του Home Assistant",
    ed_language_auto: "Αυτόματα",
    ed_entities: "Ρητές οντότητες (YAML)",
    ed_entities_helper: "Αντικαθιστά τον αυτόματο εντοπισμό: αναγνωριστικά οντοτήτων ή {entity, name, icon}",
    ed_thresholds: "Όρια άνεσης (YAML)",
    ed_thresholds_helper: "Ανά είδος, στη μονάδα του αισθητήρα, π.χ. co2: [800, 1200] ή humidity: [25, 35, 70, 80]",
    ed_rooms: "Δωμάτια (YAML)",
    ed_rooms_helper: "Σειρά και προσαρμογές: μια λίστα με {area, name, icon, navigation_path}",
    ed_navigation_path: "Διαδρομή πλοήγησης",
    ed_all_off_button: "Κουμπί «Απενεργοποίηση όλων»",
    err_config: "Ορίστε `area` ή `entities`",
    zoom_in: "Εμφάνιση της πλήρους κάρτας",
    zoom_out: "Επιστροφή στη συμπαγή προβολή",
    ed_zoom: "Κουμπί ζουμ",
    ed_zoom_helper: "Εναλλάσσει τη μίνι κάρτα με την πλήρη κάρτα",
    rooms_all: "Εμφάνιση όλων των δωματίων",
    rooms_check: "Μόνο τα δωμάτια που χρειάζονται έλεγχο",
    ed_sort: "Ταξινόμηση",
    ed_sort_name: "Κατά όνομα",
    ed_exclude_areas: "Δωμάτια προς εξαίρεση",
  },
};

// ── Light ────────────────────────────────────────────────────────────────────
// A light is a `light` entity (its brightness, colour temperature, colour and effects), or a group of them (a light
// group, or `entities`), or a switch driving a lamp. Its fixture — a bulb, a pendant, a chandelier, a floor lamp, a
// garland… — is found from its name, else set with `kind`: it decides the illustration and its room.

// The fixtures, most specific first (a cluster of pendants is not one pendant, a Christmas tree's garland is a tree).
const LC_KIND_NAMES = [
  ["tree", /sapin|christmas|xmas|tree|weihnacht|navidad|natale|kerstboom|choink|árvore|natal|brad|juletr|julgran|елх|ёлк|ялинк|karácsony|strom[cč]|jelk|eglīt|χριστουγ/],
  ["garland", /guirlande|garland|string|fairy|lichterkette|guirnalda|ghirlanda|lichtsnoer|girland|grinalda|ghirland|lyskæde|ljusslinga|гирлянд|гірлянд|fényfüzér|re[tť]az|[rř]et[eě]z|veriga|virtene|γιρλάντ/],
  ["strip", /strip|ruban|bandeau|led.?band|tira|striscia|ledstrip|ta[sś]m|fita|band[aă]|lysbånd|slinga|лент|стрічк|szalag|pásik|pásek|trak|lenta|ταινί|play.?bar/],
  ["chandelier", /lustre|chandelier|kronleuchter|araña|lampadario|kroonluchter|[zż]yrandol|candelabr|lysekrone|ljuskrona|полилей|люстр|csillár|luster|lestenec|lustra|πολυέλαι/],
  ["cluster", /grappe|cluster|trio|triple|suspensions|pendants|pendelleuchten|colgantes|sospensioni|hanglampen/],
  ["pendant", /suspension|pendant|pendel|colgante|sospensione|hanglamp|wisz[aą]c|pendente|suspendat|висящ|подвес|підвіс|függeszt|závesn|viseč|piekar|κρεμαστ/],
  ["ceiling", /plafonnier|ceiling|decke|plafón|techo|plafoniera|plafond|sufit|teto|tavan|loft|tak|таван|потол|стел|mennyezet|strop|griest|οροφ/],
  ["floor", /lampadaire|floor|stehl|de pie|piantana|vloerlamp|pod[lł]og|de pé|lampadar|gulvlampe|golvlampa|лампион|торшер|állólámpa|stojac|stoje[cč]|stāvlamp|δαπέδου/],
  ["desk", /bureau|desk|schreibtisch|escritorio|scrivania|biurk|secretária|birou|skrivebord|skrivbord|бюро|письмен|настільн|íróasztal|stolov|psací|namizn|galda|γραφεί|chevet|bedside|nightstand|nachttisch|mesita|comodino|nachtkast|szafk|cabeceira|noptier|natbord|sängbord|нощн|прикроват|éjjeli|no[cč]n|noč|naktsgald|κομοδίνο|table lamp|lampe de table|tischlampe/],
  ["spot", /spot|garden|jardin|garten|jard[ií]n|giardino|tuin|ogr[oó]d|jardim|gr[aă]din|\bhave\b|trädgård|градин|сад|kert|záhrad|zahrad|vrt|dārz|κήπ|outdoor|extérieur|terrasse|terrace|path|allée|façade|facade/],
  ["filament", /filament|edison|vintage|gl[uü]hfaden|filamento|włókn|glødetråd|glödtråd|нишк|нить|нитк|izzószál|vlákn|nitk|kvēldieg|νήμα/],
];
const LC_KINDS = [...LC_KIND_NAMES.map(([k]) => k), "bulb"];
const LC_HANGING = new Set(["bulb", "filament", "pendant", "cluster", "chandelier", "ceiling"]);
// Where each fixture is drawn.
const LC_ROOM = { tree: "living", garland: "window", strip: "living", chandelier: "dining", cluster: "dining", pendant: "dining", ceiling: "living", floor: "living", desk: "desk", spot: "garden", filament: "dining", bulb: "living" };
const lcKindOf = (text) => LC_KIND_NAMES.find(([, re]) => re.test(String(text || "").toLowerCase()))?.[0] || "bulb";

// A colour temperature (K) as RGB, after Tanner Helland's fit of the black body.
const lcKelvin = (k) => {
  const t = Math.min(40000, Math.max(1000, k)) / 100;
  const c = (v) => Math.round(Math.min(255, Math.max(0, v)));
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [c(r), c(g), c(b)];
};
const lcHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
// The light's own colour: its RGB, else its colour temperature, else a warm white.
const lcColorOf = (st) => {
  const a = st?.attributes || {};
  if (a.color_mode && a.color_mode !== "color_temp" && Array.isArray(a.rgb_color)) return lcHex(a.rgb_color);
  if (a.color_temp_kelvin) return lcHex(lcKelvin(a.color_temp_kelvin));
  if (Array.isArray(a.rgb_color)) return lcHex(a.rgb_color);
  return "#ffc46b";
};
const LC_COLOR_MODES = ["hs", "xy", "rgb", "rgbw", "rgbww"];
// What a light can do, from its supported colour modes (a light with no mode list is a plain switch).
const lcCaps = (st) => {
  const modes = st?.attributes.supported_color_modes || [];
  return {
    dim: modes.some((m) => m !== "onoff"),
    ct: modes.includes("color_temp"),
    color: modes.some((m) => LC_COLOR_MODES.includes(m)),
    effects: Array.isArray(st?.attributes.effect_list) ? st.attributes.effect_list : [],
  };
};
// The lights of the home that are no group, most likely first: the ones that dim.
const lcLights = (hass) => {
  const ids = Object.keys(hass.states || {}).filter((id) => id.startsWith("light.") && !hass.entities?.[id]?.hidden && !hass.entities?.[id]?.entity_category);
  const group = (id) => Array.isArray(hass.states[id].attributes.entity_id);
  return [...ids.filter((id) => !group(id) && lcCaps(hass.states[id]).dim), ...ids.filter((id) => !group(id) && !lcCaps(hass.states[id]).dim), ...ids.filter(group)];
};

// Strings of the light cards; the shared ones above (unavailable, editor basics) complete them.
const LC_I18N = {
  en: {
    title: "Light",
    st_on: "On",
    st_off: "Off",
    st_offline: "Offline",
    group_on: "{n} of {t} on",
    brightness: "Brightness",
    color: "Colour",
    color_temp: "Colour temperature",
    effects: "Effects",
    scenes: "Scenes",
    lights: "Lights",
    warm: "Warm white",
    neutral: "Neutral white",
    cool: "Cool white",
    full: "Full",
    night: "Night light",
    more: "More colours",
    turn_on: "Turn on",
    turn_off: "Turn off",
    no_light: "No light found",
    k_auto: "Automatic (from the name)",
    k_bulb: "Bulb",
    k_filament: "Filament bulb",
    k_pendant: "Pendant",
    k_cluster: "Pendant cluster",
    k_chandelier: "Chandelier",
    k_ceiling: "Ceiling light",
    k_floor: "Floor lamp",
    k_desk: "Desk lamp",
    k_spot: "Garden spotlight",
    k_tree: "Christmas tree",
    k_garland: "LED garland",
    k_strip: "LED strip",
    ed_entity: "Light",
    ed_entity_helper: "A light, a light group, or the switch of a lamp",
    ed_entities: "Lights of the group",
    ed_entities_helper: "Several lights shown as one, each with its own tile",
    ed_kind: "Fixture",
    ed_scenes: "Scenes",
    ed_scenes_helper: "Scenes to recall from the card",
    ed_colors: "Favourite colours (YAML)",
    ed_colors_helper: "A list of colours, as #rrggbb or [r, g, b]",
    ed_show_colors: "Colours and white tones",
    ed_show_effects: "Effects",
    ed_show_members: "Lights of the group",
    ed_animations: "Animations",
    ed_show_controls: "Controls",
    ed_title_helper: "Empty: the light's name",
    ed_illustration: "Illustrated header",
    ed_illustration_theme: "Header theme",
    ed_theme_auto: "Automatic (follows the theme)",
    ed_theme_day: "Day",
    ed_theme_night: "Night",
  },
  fr: {
    title: "Lumière",
    st_on: "Allumée",
    st_off: "Éteinte",
    st_offline: "Hors ligne",
    group_on: "{n} sur {t} allumées",
    brightness: "Luminosité",
    color: "Couleur",
    color_temp: "Température de couleur",
    effects: "Effets",
    scenes: "Scènes",
    lights: "Lumières",
    warm: "Blanc chaud",
    neutral: "Blanc neutre",
    cool: "Blanc froid",
    full: "Pleine",
    night: "Veilleuse",
    more: "Plus de couleurs",
    turn_on: "Allumer",
    turn_off: "Éteindre",
    no_light: "Aucune lumière trouvée",
    k_auto: "Automatique (d'après le nom)",
    k_bulb: "Ampoule",
    k_filament: "Ampoule à filament",
    k_pendant: "Suspension",
    k_cluster: "Suspensions en grappe",
    k_chandelier: "Lustre",
    k_ceiling: "Plafonnier",
    k_floor: "Lampadaire",
    k_desk: "Lampe de bureau",
    k_spot: "Spot de jardin",
    k_tree: "Sapin de Noël",
    k_garland: "Guirlande LED",
    k_strip: "Ruban LED",
    ed_entity: "Lumière",
    ed_entity_helper: "Une lumière, un groupe de lumières, ou l'interrupteur d'une lampe",
    ed_entities: "Lumières du groupe",
    ed_entities_helper: "Plusieurs lumières montrées comme une seule, chacune avec sa tuile",
    ed_kind: "Luminaire",
    ed_scenes: "Scènes",
    ed_scenes_helper: "Scènes à rappeler depuis la carte",
    ed_colors: "Couleurs favorites (YAML)",
    ed_colors_helper: "Une liste de couleurs, en #rrggbb ou [r, g, b]",
    ed_show_colors: "Couleurs et blancs",
    ed_show_effects: "Effets",
    ed_show_members: "Lumières du groupe",
    ed_animations: "Animations",
    ed_show_controls: "Commandes",
    ed_title_helper: "Vide : le nom de la lumière",
    ed_illustration: "En-tête illustré",
    ed_illustration_theme: "Thème de l'en-tête",
    ed_theme_auto: "Automatique (suit le thème)",
    ed_theme_day: "Jour",
    ed_theme_night: "Nuit",
  },
  de: {
    title: "Licht",
    st_on: "An",
    st_off: "Aus",
    st_offline: "Offline",
    group_on: "{n} von {t} an",
    brightness: "Helligkeit",
    color: "Farbe",
    color_temp: "Farbtemperatur",
    effects: "Effekte",
    scenes: "Szenen",
    lights: "Lichter",
    warm: "Warmweiß",
    neutral: "Neutralweiß",
    cool: "Kaltweiß",
    full: "Voll",
    night: "Nachtlicht",
    more: "Weitere Farben",
    turn_on: "Einschalten",
    turn_off: "Ausschalten",
    no_light: "Kein Licht gefunden",
    k_auto: "Automatisch (nach dem Namen)",
    k_bulb: "Glühbirne",
    k_filament: "Filament-Lampe",
    k_pendant: "Pendelleuchte",
    k_cluster: "Pendelleuchten-Gruppe",
    k_chandelier: "Kronleuchter",
    k_ceiling: "Deckenleuchte",
    k_floor: "Stehlampe",
    k_desk: "Schreibtischlampe",
    k_spot: "Gartenstrahler",
    k_tree: "Weihnachtsbaum",
    k_garland: "LED-Lichterkette",
    k_strip: "LED-Streifen",
    ed_entity: "Licht",
    ed_entity_helper: "Ein Licht, eine Lichtgruppe oder der Schalter einer Lampe",
    ed_entities: "Lichter der Gruppe",
    ed_entities_helper: "Mehrere Lichter als eines gezeigt, jedes mit eigener Kachel",
    ed_kind: "Leuchte",
    ed_scenes: "Szenen",
    ed_scenes_helper: "Szenen, die von der Karte aus abgerufen werden",
    ed_colors: "Lieblingsfarben (YAML)",
    ed_colors_helper: "Eine Liste von Farben, als #rrggbb oder [r, g, b]",
    ed_show_colors: "Farben und Weißtöne",
    ed_show_effects: "Effekte",
    ed_show_members: "Lichter der Gruppe",
    ed_animations: "Animationen",
    ed_show_controls: "Bedienelemente",
    ed_title_helper: "Leer: der Name des Lichts",
    ed_illustration: "Illustrierte Kopfzeile",
    ed_illustration_theme: "Thema der Kopfzeile",
    ed_theme_auto: "Automatisch (folgt dem Design)",
    ed_theme_day: "Tag",
    ed_theme_night: "Nacht",
  },
  es: {
    title: "Luz",
    st_on: "Encendida",
    st_off: "Apagada",
    st_offline: "Sin conexión",
    group_on: "{n} de {t} encendidas",
    brightness: "Brillo",
    color: "Color",
    color_temp: "Temperatura de color",
    effects: "Efectos",
    scenes: "Escenas",
    lights: "Luces",
    warm: "Blanco cálido",
    neutral: "Blanco neutro",
    cool: "Blanco frío",
    full: "Máximo",
    night: "Luz nocturna",
    more: "Más colores",
    turn_on: "Encender",
    turn_off: "Apagar",
    no_light: "No se encontró ninguna luz",
    k_auto: "Automático (según el nombre)",
    k_bulb: "Bombilla",
    k_filament: "Bombilla de filamento",
    k_pendant: "Lámpara colgante",
    k_cluster: "Grupo de colgantes",
    k_chandelier: "Lámpara de araña",
    k_ceiling: "Plafón",
    k_floor: "Lámpara de pie",
    k_desk: "Lámpara de escritorio",
    k_spot: "Foco de jardín",
    k_tree: "Árbol de Navidad",
    k_garland: "Guirnalda LED",
    k_strip: "Tira LED",
    ed_entity: "Luz",
    ed_entity_helper: "Una luz, un grupo de luces o el interruptor de una lámpara",
    ed_entities: "Luces del grupo",
    ed_entities_helper: "Varias luces mostradas como una, cada una con su mosaico",
    ed_kind: "Luminaria",
    ed_scenes: "Escenas",
    ed_scenes_helper: "Escenas para activar desde la tarjeta",
    ed_colors: "Colores favoritos (YAML)",
    ed_colors_helper: "Una lista de colores, como #rrggbb o [r, g, b]",
    ed_show_colors: "Colores y tonos de blanco",
    ed_show_effects: "Efectos",
    ed_show_members: "Luces del grupo",
    ed_animations: "Animaciones",
    ed_show_controls: "Controles",
    ed_title_helper: "Vacío: el nombre de la luz",
    ed_illustration: "Cabecera ilustrada",
    ed_illustration_theme: "Tema de la cabecera",
    ed_theme_auto: "Automático (sigue el tema)",
    ed_theme_day: "Día",
    ed_theme_night: "Noche",
  },
  sr: {
    title: "Светло",
    st_on: "Укључено",
    st_off: "Искључено",
    st_offline: "Ван мреже",
    group_on: "{n} од {t} укључено",
    brightness: "Осветљеност",
    color: "Боја",
    color_temp: "Температура боје",
    effects: "Ефекти",
    scenes: "Сцене",
    lights: "Светла",
    warm: "Топла бела",
    neutral: "Неутрална бела",
    cool: "Хладна бела",
    full: "Пуно",
    night: "Ноћно светло",
    more: "Још боја",
    turn_on: "Укључи",
    turn_off: "Искључи",
    no_light: "Није пронађено светло",
    k_auto: "Аутоматски (према имену)",
    k_bulb: "Сијалица",
    k_filament: "Филамент сијалица",
    k_pendant: "Висилица",
    k_cluster: "Група висилица",
    k_chandelier: "Лустер",
    k_ceiling: "Плафоњера",
    k_floor: "Подна лампа",
    k_desk: "Стона лампа",
    k_spot: "Баштенски рефлектор",
    k_tree: "Новогодишња јелка",
    k_garland: "LED гирланда",
    k_strip: "LED трака",
    ed_entity: "Светло",
    ed_entity_helper: "Светло, група светала или прекидач лампе",
    ed_entities: "Светла групе",
    ed_entities_helper: "Више светала приказаних као једно, свако са својом плочицом",
    ed_kind: "Светиљка",
    ed_scenes: "Сцене",
    ed_scenes_helper: "Сцене које се покрећу са картице",
    ed_colors: "Омиљене боје (YAML)",
    ed_colors_helper: "Листа боја, као #rrggbb или [r, g, b]",
    ed_show_colors: "Боје и нијансе беле",
    ed_show_effects: "Ефекти",
    ed_show_members: "Светла групе",
    ed_animations: "Анимације",
    ed_show_controls: "Команде",
    ed_title_helper: "Празно: име светла",
    ed_illustration: "Илустровано заглавље",
    ed_illustration_theme: "Тема заглавља",
    ed_theme_auto: "Аутоматски (прати тему)",
    ed_theme_day: "Дан",
    ed_theme_night: "Ноћ",
  },
  "sr-Latn": {
    title: "Svetlo",
    st_on: "Uključeno",
    st_off: "Isključeno",
    st_offline: "Van mreže",
    group_on: "{n} od {t} uključeno",
    brightness: "Osvetljenost",
    color: "Boja",
    color_temp: "Temperatura boje",
    effects: "Efekti",
    scenes: "Scene",
    lights: "Svetla",
    warm: "Topla bela",
    neutral: "Neutralna bela",
    cool: "Hladna bela",
    full: "Puno",
    night: "Noćno svetlo",
    more: "Još boja",
    turn_on: "Uključi",
    turn_off: "Isključi",
    no_light: "Nije pronađeno svetlo",
    k_auto: "Automatski (prema imenu)",
    k_bulb: "Sijalica",
    k_filament: "Filament sijalica",
    k_pendant: "Visilica",
    k_cluster: "Grupa visilica",
    k_chandelier: "Luster",
    k_ceiling: "Plafonjera",
    k_floor: "Podna lampa",
    k_desk: "Stona lampa",
    k_spot: "Baštenski reflektor",
    k_tree: "Novogodišnja jelka",
    k_garland: "LED girlanda",
    k_strip: "LED traka",
    ed_entity: "Svetlo",
    ed_entity_helper: "Svetlo, grupa svetala ili prekidač lampe",
    ed_entities: "Svetla grupe",
    ed_entities_helper: "Više svetala prikazanih kao jedno, svako sa svojom pločicom",
    ed_kind: "Svetiljka",
    ed_scenes: "Scene",
    ed_scenes_helper: "Scene koje se pokreću sa kartice",
    ed_colors: "Omiljene boje (YAML)",
    ed_colors_helper: "Lista boja, kao #rrggbb ili [r, g, b]",
    ed_show_colors: "Boje i nijanse bele",
    ed_show_effects: "Efekti",
    ed_show_members: "Svetla grupe",
    ed_animations: "Animacije",
    ed_show_controls: "Komande",
    ed_title_helper: "Prazno: ime svetla",
    ed_illustration: "Ilustrovano zaglavlje",
    ed_illustration_theme: "Tema zaglavlja",
    ed_theme_auto: "Automatski (prati temu)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noć",
  },
  it: {
    title: "Luce",
    st_on: "Accesa",
    st_off: "Spenta",
    st_offline: "Non in linea",
    group_on: "{n} di {t} accese",
    brightness: "Luminosità",
    color: "Colore",
    color_temp: "Temperatura di colore",
    effects: "Effetti",
    scenes: "Scene",
    lights: "Luci",
    warm: "Bianco caldo",
    neutral: "Bianco neutro",
    cool: "Bianco freddo",
    full: "Piena",
    night: "Luce notturna",
    more: "Altri colori",
    turn_on: "Accendi",
    turn_off: "Spegni",
    no_light: "Nessuna luce trovata",
    k_auto: "Automatico (dal nome)",
    k_bulb: "Lampadina",
    k_filament: "Lampadina a filamento",
    k_pendant: "Lampada a sospensione",
    k_cluster: "Grappolo di sospensioni",
    k_chandelier: "Lampadario",
    k_ceiling: "Plafoniera",
    k_floor: "Piantana",
    k_desk: "Lampada da scrivania",
    k_spot: "Faretto da giardino",
    k_tree: "Albero di Natale",
    k_garland: "Ghirlanda LED",
    k_strip: "Striscia LED",
    ed_entity: "Luce",
    ed_entity_helper: "Una luce, un gruppo di luci o l'interruttore di una lampada",
    ed_entities: "Luci del gruppo",
    ed_entities_helper: "Più luci mostrate come una, ognuna con il suo riquadro",
    ed_kind: "Apparecchio",
    ed_scenes: "Scene",
    ed_scenes_helper: "Scene da richiamare dalla scheda",
    ed_colors: "Colori preferiti (YAML)",
    ed_colors_helper: "Un elenco di colori, come #rrggbb o [r, g, b]",
    ed_show_colors: "Colori e toni di bianco",
    ed_show_effects: "Effetti",
    ed_show_members: "Luci del gruppo",
    ed_animations: "Animazioni",
    ed_show_controls: "Comandi",
    ed_title_helper: "Vuoto: il nome della luce",
    ed_illustration: "Intestazione illustrata",
    ed_illustration_theme: "Tema dell'intestazione",
    ed_theme_auto: "Automatico (segue il tema)",
    ed_theme_day: "Giorno",
    ed_theme_night: "Notte",
  },
  nl: {
    title: "Licht",
    st_on: "Aan",
    st_off: "Uit",
    st_offline: "Offline",
    group_on: "{n} van {t} aan",
    brightness: "Helderheid",
    color: "Kleur",
    color_temp: "Kleurtemperatuur",
    effects: "Effecten",
    scenes: "Scènes",
    lights: "Lampen",
    warm: "Warm wit",
    neutral: "Neutraal wit",
    cool: "Koel wit",
    full: "Vol",
    night: "Nachtlampje",
    more: "Meer kleuren",
    turn_on: "Aanzetten",
    turn_off: "Uitzetten",
    no_light: "Geen lamp gevonden",
    k_auto: "Automatisch (op naam)",
    k_bulb: "Lamp",
    k_filament: "Filamentlamp",
    k_pendant: "Hanglamp",
    k_cluster: "Groep hanglampen",
    k_chandelier: "Kroonluchter",
    k_ceiling: "Plafondlamp",
    k_floor: "Vloerlamp",
    k_desk: "Bureaulamp",
    k_spot: "Tuinspot",
    k_tree: "Kerstboom",
    k_garland: "Led-lichtsnoer",
    k_strip: "Ledstrip",
    ed_entity: "Licht",
    ed_entity_helper: "Een lamp, een lichtgroep of de schakelaar van een lamp",
    ed_entities: "Lampen van de groep",
    ed_entities_helper: "Meerdere lampen als één getoond, elk met een eigen tegel",
    ed_kind: "Armatuur",
    ed_scenes: "Scènes",
    ed_scenes_helper: "Scènes om vanaf de kaart te activeren",
    ed_colors: "Favoriete kleuren (YAML)",
    ed_colors_helper: "Een lijst kleuren, als #rrggbb of [r, g, b]",
    ed_show_colors: "Kleuren en wittinten",
    ed_show_effects: "Effecten",
    ed_show_members: "Lampen van de groep",
    ed_animations: "Animaties",
    ed_show_controls: "Bediening",
    ed_title_helper: "Leeg: de naam van de lamp",
    ed_illustration: "Geïllustreerde kop",
    ed_illustration_theme: "Thema van de kop",
    ed_theme_auto: "Automatisch (volgt het thema)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nacht",
  },
  pt: {
    title: "Luz",
    st_on: "Ligada",
    st_off: "Desligada",
    st_offline: "Offline",
    group_on: "{n} de {t} ligadas",
    brightness: "Brilho",
    color: "Cor",
    color_temp: "Temperatura de cor",
    effects: "Efeitos",
    scenes: "Cenas",
    lights: "Luzes",
    warm: "Branco quente",
    neutral: "Branco neutro",
    cool: "Branco frio",
    full: "Máximo",
    night: "Luz de presença",
    more: "Mais cores",
    turn_on: "Ligar",
    turn_off: "Desligar",
    no_light: "Nenhuma luz encontrada",
    k_auto: "Automático (pelo nome)",
    k_bulb: "Lâmpada",
    k_filament: "Lâmpada de filamento",
    k_pendant: "Candeeiro suspenso",
    k_cluster: "Conjunto de suspensões",
    k_chandelier: "Lustre",
    k_ceiling: "Plafon",
    k_floor: "Candeeiro de pé",
    k_desk: "Candeeiro de secretária",
    k_spot: "Projetor de jardim",
    k_tree: "Árvore de Natal",
    k_garland: "Grinalda LED",
    k_strip: "Fita LED",
    ed_entity: "Luz",
    ed_entity_helper: "Uma luz, um grupo de luzes ou o interruptor de um candeeiro",
    ed_entities: "Luzes do grupo",
    ed_entities_helper: "Várias luzes mostradas como uma, cada uma com o seu mosaico",
    ed_kind: "Luminária",
    ed_scenes: "Cenas",
    ed_scenes_helper: "Cenas a ativar a partir do cartão",
    ed_colors: "Cores favoritas (YAML)",
    ed_colors_helper: "Uma lista de cores, como #rrggbb ou [r, g, b]",
    ed_show_colors: "Cores e tons de branco",
    ed_show_effects: "Efeitos",
    ed_show_members: "Luzes do grupo",
    ed_animations: "Animações",
    ed_show_controls: "Comandos",
    ed_title_helper: "Vazio: o nome da luz",
    ed_illustration: "Cabeçalho ilustrado",
    ed_illustration_theme: "Tema do cabeçalho",
    ed_theme_auto: "Automático (segue o tema)",
    ed_theme_day: "Dia",
    ed_theme_night: "Noite",
  },
  pl: {
    title: "Światło",
    st_on: "Włączone",
    st_off: "Wyłączone",
    st_offline: "Offline",
    group_on: "{n} z {t} włączone",
    brightness: "Jasność",
    color: "Kolor",
    color_temp: "Temperatura barwowa",
    effects: "Efekty",
    scenes: "Sceny",
    lights: "Światła",
    warm: "Ciepła biel",
    neutral: "Neutralna biel",
    cool: "Zimna biel",
    full: "Pełna",
    night: "Lampka nocna",
    more: "Więcej kolorów",
    turn_on: "Włącz",
    turn_off: "Wyłącz",
    no_light: "Nie znaleziono światła",
    k_auto: "Automatycznie (z nazwy)",
    k_bulb: "Żarówka",
    k_filament: "Żarówka filamentowa",
    k_pendant: "Lampa wisząca",
    k_cluster: "Zestaw lamp wiszących",
    k_chandelier: "Żyrandol",
    k_ceiling: "Plafon",
    k_floor: "Lampa podłogowa",
    k_desk: "Lampka biurkowa",
    k_spot: "Reflektor ogrodowy",
    k_tree: "Choinka",
    k_garland: "Girlanda LED",
    k_strip: "Taśma LED",
    ed_entity: "Światło",
    ed_entity_helper: "Światło, grupa świateł lub przełącznik lampy",
    ed_entities: "Światła grupy",
    ed_entities_helper: "Kilka świateł pokazanych jako jedno, każde z własnym kafelkiem",
    ed_kind: "Oprawa",
    ed_scenes: "Sceny",
    ed_scenes_helper: "Sceny do uruchomienia z karty",
    ed_colors: "Ulubione kolory (YAML)",
    ed_colors_helper: "Lista kolorów, jako #rrggbb lub [r, g, b]",
    ed_show_colors: "Kolory i odcienie bieli",
    ed_show_effects: "Efekty",
    ed_show_members: "Światła grupy",
    ed_animations: "Animacje",
    ed_show_controls: "Sterowanie",
    ed_title_helper: "Puste: nazwa światła",
    ed_illustration: "Ilustrowany nagłówek",
    ed_illustration_theme: "Motyw nagłówka",
    ed_theme_auto: "Automatycznie (zgodnie z motywem)",
    ed_theme_day: "Dzień",
    ed_theme_night: "Noc",
  },
  ro: {
    title: "Lumină",
    st_on: "Aprinsă",
    st_off: "Stinsă",
    st_offline: "Offline",
    group_on: "{n} din {t} aprinse",
    brightness: "Luminozitate",
    color: "Culoare",
    color_temp: "Temperatura culorii",
    effects: "Efecte",
    scenes: "Scene",
    lights: "Lumini",
    warm: "Alb cald",
    neutral: "Alb neutru",
    cool: "Alb rece",
    full: "Maximă",
    night: "Lumină de veghe",
    more: "Mai multe culori",
    turn_on: "Aprinde",
    turn_off: "Stinge",
    no_light: "Nicio lumină găsită",
    k_auto: "Automat (după nume)",
    k_bulb: "Bec",
    k_filament: "Bec cu filament",
    k_pendant: "Pendul",
    k_cluster: "Grup de pendule",
    k_chandelier: "Candelabru",
    k_ceiling: "Plafonieră",
    k_floor: "Lampadar",
    k_desk: "Lampă de birou",
    k_spot: "Proiector de grădină",
    k_tree: "Brad de Crăciun",
    k_garland: "Ghirlandă LED",
    k_strip: "Bandă LED",
    ed_entity: "Lumină",
    ed_entity_helper: "O lumină, un grup de lumini sau comutatorul unei lămpi",
    ed_entities: "Luminile grupului",
    ed_entities_helper: "Mai multe lumini afișate ca una singură, fiecare cu propria dală",
    ed_kind: "Corp de iluminat",
    ed_scenes: "Scene",
    ed_scenes_helper: "Scene de pornit din card",
    ed_colors: "Culori preferate (YAML)",
    ed_colors_helper: "O listă de culori, ca #rrggbb sau [r, g, b]",
    ed_show_colors: "Culori și nuanțe de alb",
    ed_show_effects: "Efecte",
    ed_show_members: "Luminile grupului",
    ed_animations: "Animații",
    ed_show_controls: "Comenzi",
    ed_title_helper: "Gol: numele luminii",
    ed_illustration: "Antet ilustrat",
    ed_illustration_theme: "Tema antetului",
    ed_theme_auto: "Automat (urmează tema)",
    ed_theme_day: "Zi",
    ed_theme_night: "Noapte",
  },
  da: {
    title: "Lys",
    st_on: "Tændt",
    st_off: "Slukket",
    st_offline: "Offline",
    group_on: "{n} af {t} tændt",
    brightness: "Lysstyrke",
    color: "Farve",
    color_temp: "Farvetemperatur",
    effects: "Effekter",
    scenes: "Scener",
    lights: "Lys",
    warm: "Varm hvid",
    neutral: "Neutral hvid",
    cool: "Kold hvid",
    full: "Fuld",
    night: "Natlys",
    more: "Flere farver",
    turn_on: "Tænd",
    turn_off: "Sluk",
    no_light: "Intet lys fundet",
    k_auto: "Automatisk (ud fra navnet)",
    k_bulb: "Pære",
    k_filament: "Filamentpære",
    k_pendant: "Pendel",
    k_cluster: "Pendelgruppe",
    k_chandelier: "Lysekrone",
    k_ceiling: "Loftslampe",
    k_floor: "Gulvlampe",
    k_desk: "Skrivebordslampe",
    k_spot: "Havespot",
    k_tree: "Juletræ",
    k_garland: "LED-lyskæde",
    k_strip: "LED-strip",
    ed_entity: "Lys",
    ed_entity_helper: "Et lys, en lysgruppe eller kontakten til en lampe",
    ed_entities: "Gruppens lys",
    ed_entities_helper: "Flere lys vist som ét, hver med sin egen flise",
    ed_kind: "Armatur",
    ed_scenes: "Scener",
    ed_scenes_helper: "Scener, der kan aktiveres fra kortet",
    ed_colors: "Yndlingsfarver (YAML)",
    ed_colors_helper: "En liste over farver, som #rrggbb eller [r, g, b]",
    ed_show_colors: "Farver og hvide toner",
    ed_show_effects: "Effekter",
    ed_show_members: "Gruppens lys",
    ed_animations: "Animationer",
    ed_show_controls: "Betjening",
    ed_title_helper: "Tom: lysets navn",
    ed_illustration: "Illustreret overskrift",
    ed_illustration_theme: "Overskriftens tema",
    ed_theme_auto: "Automatisk (følger temaet)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nat",
  },
  sv: {
    title: "Ljus",
    st_on: "På",
    st_off: "Av",
    st_offline: "Offline",
    group_on: "{n} av {t} på",
    brightness: "Ljusstyrka",
    color: "Färg",
    color_temp: "Färgtemperatur",
    effects: "Effekter",
    scenes: "Scener",
    lights: "Lampor",
    warm: "Varmvitt",
    neutral: "Neutralvitt",
    cool: "Kallvitt",
    full: "Full",
    night: "Nattljus",
    more: "Fler färger",
    turn_on: "Tänd",
    turn_off: "Släck",
    no_light: "Inget ljus hittades",
    k_auto: "Automatiskt (från namnet)",
    k_bulb: "Glödlampa",
    k_filament: "Filamentlampa",
    k_pendant: "Taklampa",
    k_cluster: "Grupp taklampor",
    k_chandelier: "Ljuskrona",
    k_ceiling: "Plafond",
    k_floor: "Golvlampa",
    k_desk: "Skrivbordslampa",
    k_spot: "Trädgårdsspot",
    k_tree: "Julgran",
    k_garland: "LED-ljusslinga",
    k_strip: "LED-list",
    ed_entity: "Ljus",
    ed_entity_helper: "Ett ljus, en ljusgrupp eller brytaren till en lampa",
    ed_entities: "Gruppens lampor",
    ed_entities_helper: "Flera lampor visade som en, var och en med sin egen ruta",
    ed_kind: "Armatur",
    ed_scenes: "Scener",
    ed_scenes_helper: "Scener att aktivera från kortet",
    ed_colors: "Favoritfärger (YAML)",
    ed_colors_helper: "En lista med färger, som #rrggbb eller [r, g, b]",
    ed_show_colors: "Färger och vita toner",
    ed_show_effects: "Effekter",
    ed_show_members: "Gruppens lampor",
    ed_animations: "Animationer",
    ed_show_controls: "Reglage",
    ed_title_helper: "Tomt: ljusets namn",
    ed_illustration: "Illustrerad rubrik",
    ed_illustration_theme: "Rubrikens tema",
    ed_theme_auto: "Automatiskt (följer temat)",
    ed_theme_day: "Dag",
    ed_theme_night: "Natt",
  },
  bg: {
    title: "Осветление",
    st_on: "Включено",
    st_off: "Изключено",
    st_offline: "Офлайн",
    group_on: "{n} от {t} включени",
    brightness: "Яркост",
    color: "Цвят",
    color_temp: "Цветна температура",
    effects: "Ефекти",
    scenes: "Сцени",
    lights: "Осветителни тела",
    warm: "Топло бяло",
    neutral: "Неутрално бяло",
    cool: "Студено бяло",
    full: "Пълна",
    night: "Нощна светлина",
    more: "Още цветове",
    turn_on: "Включи",
    turn_off: "Изключи",
    no_light: "Не е намерено осветление",
    k_auto: "Автоматично (по името)",
    k_bulb: "Крушка",
    k_filament: "Крушка с нажежаема жичка",
    k_pendant: "Висяща лампа",
    k_cluster: "Група висящи лампи",
    k_chandelier: "Полилей",
    k_ceiling: "Плафон",
    k_floor: "Лампион",
    k_desk: "Настолна лампа",
    k_spot: "Градински прожектор",
    k_tree: "Коледна елха",
    k_garland: "LED гирлянд",
    k_strip: "LED лента",
    ed_entity: "Осветление",
    ed_entity_helper: "Осветление, група осветления или ключът на лампа",
    ed_entities: "Осветление в групата",
    ed_entities_helper: "Няколко осветителни тела, показани като едно, всяко със своя плочка",
    ed_kind: "Осветително тяло",
    ed_scenes: "Сцени",
    ed_scenes_helper: "Сцени за извикване от картата",
    ed_colors: "Любими цветове (YAML)",
    ed_colors_helper: "Списък с цветове, като #rrggbb или [r, g, b]",
    ed_show_colors: "Цветове и нюанси на бялото",
    ed_show_effects: "Ефекти",
    ed_show_members: "Осветление в групата",
    ed_animations: "Анимации",
    ed_show_controls: "Управление",
    ed_title_helper: "Празно: името на осветлението",
    ed_illustration: "Илюстрирано заглавие",
    ed_illustration_theme: "Тема на заглавието",
    ed_theme_auto: "Автоматично (следва темата)",
    ed_theme_day: "Ден",
    ed_theme_night: "Нощ",
  },
  ru: {
    title: "Свет",
    st_on: "Включён",
    st_off: "Выключен",
    st_offline: "Не в сети",
    group_on: "{n} из {t} включены",
    brightness: "Яркость",
    color: "Цвет",
    color_temp: "Цветовая температура",
    effects: "Эффекты",
    scenes: "Сцены",
    lights: "Светильники",
    warm: "Тёплый белый",
    neutral: "Нейтральный белый",
    cool: "Холодный белый",
    full: "Полная",
    night: "Ночник",
    more: "Другие цвета",
    turn_on: "Включить",
    turn_off: "Выключить",
    no_light: "Свет не найден",
    k_auto: "Автоматически (по названию)",
    k_bulb: "Лампочка",
    k_filament: "Филаментная лампа",
    k_pendant: "Подвесной светильник",
    k_cluster: "Группа подвесных светильников",
    k_chandelier: "Люстра",
    k_ceiling: "Потолочный светильник",
    k_floor: "Торшер",
    k_desk: "Настольная лампа",
    k_spot: "Садовый прожектор",
    k_tree: "Новогодняя ёлка",
    k_garland: "Светодиодная гирлянда",
    k_strip: "Светодиодная лента",
    ed_entity: "Свет",
    ed_entity_helper: "Светильник, группа светильников или выключатель лампы",
    ed_entities: "Светильники группы",
    ed_entities_helper: "Несколько светильников как один, у каждого своя плитка",
    ed_kind: "Светильник",
    ed_scenes: "Сцены",
    ed_scenes_helper: "Сцены для вызова с карточки",
    ed_colors: "Избранные цвета (YAML)",
    ed_colors_helper: "Список цветов в виде #rrggbb или [r, g, b]",
    ed_show_colors: "Цвета и оттенки белого",
    ed_show_effects: "Эффекты",
    ed_show_members: "Светильники группы",
    ed_animations: "Анимации",
    ed_show_controls: "Управление",
    ed_title_helper: "Пусто: название светильника",
    ed_illustration: "Иллюстрированный заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматически (по теме)",
    ed_theme_day: "День",
    ed_theme_night: "Ночь",
  },
  uk: {
    title: "Світло",
    st_on: "Увімкнено",
    st_off: "Вимкнено",
    st_offline: "Не в мережі",
    group_on: "{n} з {t} увімкнено",
    brightness: "Яскравість",
    color: "Колір",
    color_temp: "Колірна температура",
    effects: "Ефекти",
    scenes: "Сцени",
    lights: "Світильники",
    warm: "Теплий білий",
    neutral: "Нейтральний білий",
    cool: "Холодний білий",
    full: "Повна",
    night: "Нічник",
    more: "Інші кольори",
    turn_on: "Увімкнути",
    turn_off: "Вимкнути",
    no_light: "Світло не знайдено",
    k_auto: "Автоматично (за назвою)",
    k_bulb: "Лампочка",
    k_filament: "Філаментна лампа",
    k_pendant: "Підвісний світильник",
    k_cluster: "Група підвісних світильників",
    k_chandelier: "Люстра",
    k_ceiling: "Стельовий світильник",
    k_floor: "Торшер",
    k_desk: "Настільна лампа",
    k_spot: "Садовий прожектор",
    k_tree: "Новорічна ялинка",
    k_garland: "Світлодіодна гірлянда",
    k_strip: "Світлодіодна стрічка",
    ed_entity: "Світло",
    ed_entity_helper: "Світильник, група світильників або вимикач лампи",
    ed_entities: "Світильники групи",
    ed_entities_helper: "Кілька світильників як один, кожен зі своєю плиткою",
    ed_kind: "Світильник",
    ed_scenes: "Сцени",
    ed_scenes_helper: "Сцени для виклику з картки",
    ed_colors: "Улюблені кольори (YAML)",
    ed_colors_helper: "Список кольорів у вигляді #rrggbb або [r, g, b]",
    ed_show_colors: "Кольори та відтінки білого",
    ed_show_effects: "Ефекти",
    ed_show_members: "Світильники групи",
    ed_animations: "Анімації",
    ed_show_controls: "Керування",
    ed_title_helper: "Порожньо: назва світильника",
    ed_illustration: "Ілюстрований заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматично (за темою)",
    ed_theme_day: "День",
    ed_theme_night: "Ніч",
  },
  hu: {
    title: "Világítás",
    st_on: "Bekapcsolva",
    st_off: "Kikapcsolva",
    st_offline: "Offline",
    group_on: "{n}/{t} bekapcsolva",
    brightness: "Fényerő",
    color: "Szín",
    color_temp: "Színhőmérséklet",
    effects: "Effektek",
    scenes: "Jelenetek",
    lights: "Lámpák",
    warm: "Meleg fehér",
    neutral: "Semleges fehér",
    cool: "Hideg fehér",
    full: "Teljes",
    night: "Éjszakai fény",
    more: "További színek",
    turn_on: "Bekapcsolás",
    turn_off: "Kikapcsolás",
    no_light: "Nem található lámpa",
    k_auto: "Automatikus (a név alapján)",
    k_bulb: "Izzó",
    k_filament: "Filament izzó",
    k_pendant: "Függesztett lámpa",
    k_cluster: "Függesztett lámpa csoport",
    k_chandelier: "Csillár",
    k_ceiling: "Mennyezeti lámpa",
    k_floor: "Állólámpa",
    k_desk: "Asztali lámpa",
    k_spot: "Kerti reflektor",
    k_tree: "Karácsonyfa",
    k_garland: "LED fényfüzér",
    k_strip: "LED szalag",
    ed_entity: "Lámpa",
    ed_entity_helper: "Egy lámpa, egy lámpacsoport vagy egy lámpa kapcsolója",
    ed_entities: "A csoport lámpái",
    ed_entities_helper: "Több lámpa egyként mutatva, mindegyik saját csempével",
    ed_kind: "Lámpatest",
    ed_scenes: "Jelenetek",
    ed_scenes_helper: "A kártyáról indítható jelenetek",
    ed_colors: "Kedvenc színek (YAML)",
    ed_colors_helper: "Színek listája, #rrggbb vagy [r, g, b] formában",
    ed_show_colors: "Színek és fehér árnyalatok",
    ed_show_effects: "Effektek",
    ed_show_members: "A csoport lámpái",
    ed_animations: "Animációk",
    ed_show_controls: "Vezérlők",
    ed_title_helper: "Üres: a lámpa neve",
    ed_illustration: "Illusztrált fejléc",
    ed_illustration_theme: "Fejléc témája",
    ed_theme_auto: "Automatikus (a témát követi)",
    ed_theme_day: "Nappal",
    ed_theme_night: "Éjszaka",
  },
  sk: {
    title: "Svetlo",
    st_on: "Zapnuté",
    st_off: "Vypnuté",
    st_offline: "Offline",
    group_on: "{n} z {t} zapnuté",
    brightness: "Jas",
    color: "Farba",
    color_temp: "Teplota farby",
    effects: "Efekty",
    scenes: "Scény",
    lights: "Svetlá",
    warm: "Teplá biela",
    neutral: "Neutrálna biela",
    cool: "Studená biela",
    full: "Plný",
    night: "Nočné svetlo",
    more: "Ďalšie farby",
    turn_on: "Zapnúť",
    turn_off: "Vypnúť",
    no_light: "Nenašlo sa žiadne svetlo",
    k_auto: "Automaticky (podľa názvu)",
    k_bulb: "Žiarovka",
    k_filament: "Filamentová žiarovka",
    k_pendant: "Závesné svietidlo",
    k_cluster: "Skupina závesných svietidiel",
    k_chandelier: "Luster",
    k_ceiling: "Stropné svietidlo",
    k_floor: "Stojacia lampa",
    k_desk: "Stolová lampa",
    k_spot: "Záhradný reflektor",
    k_tree: "Vianočný stromček",
    k_garland: "LED reťaz",
    k_strip: "LED pásik",
    ed_entity: "Svetlo",
    ed_entity_helper: "Svetlo, skupina svetiel alebo vypínač lampy",
    ed_entities: "Svetlá skupiny",
    ed_entities_helper: "Viacero svetiel zobrazených ako jedno, každé s vlastnou dlaždicou",
    ed_kind: "Svietidlo",
    ed_scenes: "Scény",
    ed_scenes_helper: "Scény na spustenie z karty",
    ed_colors: "Obľúbené farby (YAML)",
    ed_colors_helper: "Zoznam farieb ako #rrggbb alebo [r, g, b]",
    ed_show_colors: "Farby a odtiene bielej",
    ed_show_effects: "Efekty",
    ed_show_members: "Svetlá skupiny",
    ed_animations: "Animácie",
    ed_show_controls: "Ovládanie",
    ed_title_helper: "Prázdne: názov svetla",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Téma hlavičky",
    ed_theme_auto: "Automaticky (podľa témy)",
    ed_theme_day: "Deň",
    ed_theme_night: "Noc",
  },
  cs: {
    title: "Světlo",
    st_on: "Zapnuto",
    st_off: "Vypnuto",
    st_offline: "Offline",
    group_on: "{n} z {t} zapnuto",
    brightness: "Jas",
    color: "Barva",
    color_temp: "Teplota barvy",
    effects: "Efekty",
    scenes: "Scény",
    lights: "Světla",
    warm: "Teplá bílá",
    neutral: "Neutrální bílá",
    cool: "Studená bílá",
    full: "Plný",
    night: "Noční světlo",
    more: "Další barvy",
    turn_on: "Zapnout",
    turn_off: "Vypnout",
    no_light: "Nenalezeno žádné světlo",
    k_auto: "Automaticky (podle názvu)",
    k_bulb: "Žárovka",
    k_filament: "Filamentová žárovka",
    k_pendant: "Závěsné svítidlo",
    k_cluster: "Skupina závěsných svítidel",
    k_chandelier: "Lustr",
    k_ceiling: "Stropní svítidlo",
    k_floor: "Stojací lampa",
    k_desk: "Stolní lampa",
    k_spot: "Zahradní reflektor",
    k_tree: "Vánoční stromek",
    k_garland: "LED řetěz",
    k_strip: "LED pásek",
    ed_entity: "Světlo",
    ed_entity_helper: "Světlo, skupina světel nebo vypínač lampy",
    ed_entities: "Světla skupiny",
    ed_entities_helper: "Několik světel zobrazených jako jedno, každé s vlastní dlaždicí",
    ed_kind: "Svítidlo",
    ed_scenes: "Scény",
    ed_scenes_helper: "Scény ke spuštění z karty",
    ed_colors: "Oblíbené barvy (YAML)",
    ed_colors_helper: "Seznam barev jako #rrggbb nebo [r, g, b]",
    ed_show_colors: "Barvy a odstíny bílé",
    ed_show_effects: "Efekty",
    ed_show_members: "Světla skupiny",
    ed_animations: "Animace",
    ed_show_controls: "Ovládání",
    ed_title_helper: "Prázdné: název světla",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Motiv hlavičky",
    ed_theme_auto: "Automaticky (podle motivu)",
    ed_theme_day: "Den",
    ed_theme_night: "Noc",
  },
  sl: {
    title: "Luč",
    st_on: "Prižgana",
    st_off: "Ugasnjena",
    st_offline: "Brez povezave",
    group_on: "{n} od {t} prižganih",
    brightness: "Svetlost",
    color: "Barva",
    color_temp: "Barvna temperatura",
    effects: "Učinki",
    scenes: "Scene",
    lights: "Luči",
    warm: "Toplo bela",
    neutral: "Nevtralno bela",
    cool: "Hladno bela",
    full: "Polna",
    night: "Nočna lučka",
    more: "Več barv",
    turn_on: "Prižgi",
    turn_off: "Ugasni",
    no_light: "Luč ni bila najdena",
    k_auto: "Samodejno (po imenu)",
    k_bulb: "Žarnica",
    k_filament: "Filamentna žarnica",
    k_pendant: "Viseča svetilka",
    k_cluster: "Skupina visečih svetilk",
    k_chandelier: "Lestenec",
    k_ceiling: "Stropna svetilka",
    k_floor: "Stoječa svetilka",
    k_desk: "Namizna svetilka",
    k_spot: "Vrtni reflektor",
    k_tree: "Novoletna jelka",
    k_garland: "LED veriga",
    k_strip: "LED trak",
    ed_entity: "Luč",
    ed_entity_helper: "Luč, skupina luči ali stikalo svetilke",
    ed_entities: "Luči skupine",
    ed_entities_helper: "Več luči prikazanih kot ena, vsaka s svojo ploščico",
    ed_kind: "Svetilka",
    ed_scenes: "Scene",
    ed_scenes_helper: "Scene za priklic s kartice",
    ed_colors: "Priljubljene barve (YAML)",
    ed_colors_helper: "Seznam barv kot #rrggbb ali [r, g, b]",
    ed_show_colors: "Barve in odtenki bele",
    ed_show_effects: "Učinki",
    ed_show_members: "Luči skupine",
    ed_animations: "Animacije",
    ed_show_controls: "Upravljanje",
    ed_title_helper: "Prazno: ime luči",
    ed_illustration: "Ilustrirana glava",
    ed_illustration_theme: "Tema glave",
    ed_theme_auto: "Samodejno (sledi temi)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noč",
  },
  lv: {
    title: "Gaisma",
    st_on: "Ieslēgta",
    st_off: "Izslēgta",
    st_offline: "Bezsaistē",
    group_on: "{n} no {t} ieslēgtas",
    brightness: "Spilgtums",
    color: "Krāsa",
    color_temp: "Krāsu temperatūra",
    effects: "Efekti",
    scenes: "Ainas",
    lights: "Gaismas",
    warm: "Silti balts",
    neutral: "Neitrāli balts",
    cool: "Auksti balts",
    full: "Pilna",
    night: "Naktslampiņa",
    more: "Vairāk krāsu",
    turn_on: "Ieslēgt",
    turn_off: "Izslēgt",
    no_light: "Gaisma nav atrasta",
    k_auto: "Automātiski (pēc nosaukuma)",
    k_bulb: "Spuldze",
    k_filament: "Kvēldiega spuldze",
    k_pendant: "Piekarināma lampa",
    k_cluster: "Piekarināmo lampu grupa",
    k_chandelier: "Lustra",
    k_ceiling: "Griestu lampa",
    k_floor: "Stāvlampa",
    k_desk: "Galda lampa",
    k_spot: "Dārza prožektors",
    k_tree: "Ziemassvētku eglīte",
    k_garland: "LED virtene",
    k_strip: "LED lente",
    ed_entity: "Gaisma",
    ed_entity_helper: "Gaisma, gaismu grupa vai lampas slēdzis",
    ed_entities: "Grupas gaismas",
    ed_entities_helper: "Vairākas gaismas parādītas kā viena, katra ar savu flīzi",
    ed_kind: "Gaismeklis",
    ed_scenes: "Ainas",
    ed_scenes_helper: "Ainas, ko izsaukt no kartītes",
    ed_colors: "Iecienītās krāsas (YAML)",
    ed_colors_helper: "Krāsu saraksts kā #rrggbb vai [r, g, b]",
    ed_show_colors: "Krāsas un baltās nokrāsas",
    ed_show_effects: "Efekti",
    ed_show_members: "Grupas gaismas",
    ed_animations: "Animācijas",
    ed_show_controls: "Vadība",
    ed_title_helper: "Tukšs: gaismas nosaukums",
    ed_illustration: "Ilustrēta galvene",
    ed_illustration_theme: "Galvenes tēma",
    ed_theme_auto: "Automātiski (atbilstoši tēmai)",
    ed_theme_day: "Diena",
    ed_theme_night: "Nakts",
  },
  el: {
    title: "Φως",
    st_on: "Αναμμένο",
    st_off: "Σβηστό",
    st_offline: "Εκτός σύνδεσης",
    group_on: "{n} από {t} αναμμένα",
    brightness: "Φωτεινότητα",
    color: "Χρώμα",
    color_temp: "Θερμοκρασία χρώματος",
    effects: "Εφέ",
    scenes: "Σκηνές",
    lights: "Φώτα",
    warm: "Θερμό λευκό",
    neutral: "Ουδέτερο λευκό",
    cool: "Ψυχρό λευκό",
    full: "Πλήρης",
    night: "Φως νυκτός",
    more: "Περισσότερα χρώματα",
    turn_on: "Άναμμα",
    turn_off: "Σβήσιμο",
    no_light: "Δεν βρέθηκε φως",
    k_auto: "Αυτόματα (από το όνομα)",
    k_bulb: "Λάμπα",
    k_filament: "Λάμπα νήματος",
    k_pendant: "Κρεμαστό φωτιστικό",
    k_cluster: "Σύνολο κρεμαστών",
    k_chandelier: "Πολυέλαιος",
    k_ceiling: "Φωτιστικό οροφής",
    k_floor: "Φωτιστικό δαπέδου",
    k_desk: "Φωτιστικό γραφείου",
    k_spot: "Προβολέας κήπου",
    k_tree: "Χριστουγεννιάτικο δέντρο",
    k_garland: "Γιρλάντα LED",
    k_strip: "Ταινία LED",
    ed_entity: "Φως",
    ed_entity_helper: "Ένα φως, μια ομάδα φώτων ή ο διακόπτης ενός φωτιστικού",
    ed_entities: "Φώτα της ομάδας",
    ed_entities_helper: "Πολλά φώτα που εμφανίζονται ως ένα, το καθένα με το πλακίδιό του",
    ed_kind: "Φωτιστικό",
    ed_scenes: "Σκηνές",
    ed_scenes_helper: "Σκηνές για ενεργοποίηση από την κάρτα",
    ed_colors: "Αγαπημένα χρώματα (YAML)",
    ed_colors_helper: "Μια λίστα χρωμάτων, ως #rrggbb ή [r, g, b]",
    ed_show_colors: "Χρώματα και τόνοι λευκού",
    ed_show_effects: "Εφέ",
    ed_show_members: "Φώτα της ομάδας",
    ed_animations: "Κινούμενα σχέδια",
    ed_show_controls: "Χειρισμός",
    ed_title_helper: "Κενό: το όνομα του φωτός",
    ed_illustration: "Εικονογραφημένη κεφαλίδα",
    ed_illustration_theme: "Θέμα κεφαλίδας",
    ed_theme_auto: "Αυτόματο (ακολουθεί το θέμα)",
    ed_theme_day: "Ημέρα",
    ed_theme_night: "Νύχτα",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const rcLang = (i18n, hass, config) => {
  // The full tag when the card has it (sr-Latn), else its base language (fr-FR → fr, pt-BR → pt), else English.
  const l = config?.language || hass?.locale?.language || hass?.language || "en";
  const base = l.split("-")[0];
  return i18n[l] ? l : i18n[base] ? base : "en";
};

const rcT = (i18n, lang, key, vars = {}) => {
  const s = i18n[lang]?.[key] ?? RC_I18N[lang]?.[key] ?? i18n.en[key] ?? RC_I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};

// Plural key for `n` items: `<base>_one`, `<base>_few` or `<base>_many` (the "other" form), from the CLDR category of
// `n` in `lang` (Serbian 1 / 2-4 / 5+, 21 / 22…). `_few` is optional: without it, `_many` is used. A `_one` text without
// {n} ("Turn this plug off?") only means exactly one.
const rcPluralKey = (i18n, lang, base, n) => {
  let cat;
  try {
    cat = new Intl.PluralRules(lang).select(n);
  } catch {
    cat = n === 1 ? "one" : "other";
  }
  const text = (k) => i18n[lang]?.[k] ?? RC_I18N[lang]?.[k];
  if (cat === "one" && (n === 1 || text(`${base}_one`)?.includes("{n}"))) return `${base}_one`;
  if (cat === "few" && text(`${base}_few`) != null) return `${base}_few`;
  return `${base}_many`;
};

const rcEsc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const rcEscRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A power in the card's language (*1,2 kW* in French), from `lang` (defaults to the browser's).
const rcWatts = (w, lang) => {
  const kw = w >= 1000;
  const digits = kw && w < 10000 ? 1 : 0;
  let text;
  try {
    text = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(kw ? w / 1000 : w);
  } catch {
    text = (kw ? w / 1000 : w).toFixed(digits);
  }
  return `${text} ${kw ? "kW" : "W"}`;
};

// Strips a prefix, a suffix and the area name from an entity name, then capitalises it.
const rcCleanName = (name, areaName, prefix, suffix) => {
  let n = (name || "").replace(prefix, "").replace(suffix, "").trim();
  if (areaName && n.toLowerCase() !== areaName.toLowerCase()) {
    n = n.replace(new RegExp(`(^${rcEscRe(areaName)}\\s+|\\s+${rcEscRe(areaName)}$)`, "i"), "");
  }
  return n.charAt(0).toUpperCase() + n.slice(1);
};

const rcMoreInfo = (node, entityId) => {
  const ev = new Event("hass-more-info", { bubbles: true, composed: true });
  ev.detail = { entityId };
  node.dispatchEvent(ev);
};

const rcNavigate = (path) => {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
};

// Wires a card header to its `navigation_path`: click, and Enter on the header itself.
const rcBindNav = (head, path) => {
  head.addEventListener("click", () => rcNavigate(path));
  head.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target === head) rcNavigate(path);
  });
};

const rcUnavailable = (st) => ["unavailable", "unknown"].includes(st.state);

// HA's callService already shows a toast when the call fails, then rejects: the rejection is only swallowed here
// so that it does not end up as "Uncaught (in promise)".
const rcCall = (hass, domain, service, data) => Promise.resolve(hass.callService(domain, service, data)).catch(() => {});

// A click inside a dialog (more-info opened from the card, say) is not a click outside the card.
const rcInDialog = (ev) => ev.composedPath().some((n) => ["ha-more-info-dialog", "ha-dialog", "dialog"].includes(n.localName));

// `fn()`, computed again only when one of `deps` is no longer the same object (or value) as last time.
const rcMemo = (store, key, deps, fn) => {
  const hit = store[key];
  if (hit && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.value;
  const value = fn();
  store[key] = { deps, value };
  return value;
};

// ── Base card ────────────────────────────────────────────────────────────────
class RcCard extends HTMLElement {
  static getStubConfig(hass) {
    const areas = Object.keys(hass?.areas ?? {});
    return { area: areas[0] ?? "" };
  }

  // Subclasses set: static i18n, static defaults, static tag, static styles.
  static getConfigElement() {
    // biome-ignore lint/complexity/noThisInStatic: each subclass opens its own editor.
    return document.createElement(`${this.tag}-editor`);
  }

  setConfig(config) {
    if (this.constructor.needsArea && !config.area && !config.entities?.length && !config.include?.length) {
      throw new Error(rcT(this.constructor.i18n, rcLang(this.constructor.i18n, this._hass, config), "err_config"));
    }
    this._config = { ...this.constructor.defaults, ...config };
    // show_title: the header's title, hidden by the stylesheet
    this.toggleAttribute?.("hide-title", config.show_title === false);
    if (!this.shadowRoot) this._attach();
    this._sig = null;
    this._render();
  }

  // The shadow root, and no rewrite of the card between a press anywhere in it and the end of the click: Home
  // Assistant updates the card several times a second, and a rewrite under the pointer replaces the element pressed,
  // so that the click lands on the card itself and does nothing (the tiles already hold it, see _bindPress; this
  // covers the rest: header button, detail button, rows, popup). The pending update is rendered once released.
  _attach() {
    const root = this.attachShadow({ mode: "open" });
    this._onPressEnd = () => {
      window.removeEventListener("pointerup", this._onPressEnd, true);
      window.removeEventListener("pointercancel", this._onPressEnd, true);
      // After the click, which comes in the same task as the release.
      setTimeout(() => {
        if (this._pressing) this._released();
      }, 0);
    };
    root.addEventListener("pointerdown", (ev) => {
      this._byPointer = true;
      if (ev.button !== 0) return;
      this._pressing = true;
      window.addEventListener("pointerup", this._onPressEnd, true);
      window.addEventListener("pointercancel", this._onPressEnd, true);
    });
    // The focus is kept across rewrites for the keyboard only (no focus ring after a mouse click or a tap).
    root.addEventListener("keydown", () => {
      this._byPointer = false;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    window.removeEventListener("pointerup", this._onPressEnd, true);
    window.removeEventListener("pointercancel", this._onPressEnd, true);
    // A press cut short by the detach never gets its release: rendered now, and the next updates too.
    if (this._pressing) this._released();
  }

  set hass(hass) {
    this._hass = hass;
    // No re-render during a drag or a press: it would replace the tile under the finger.
    if (this._dragging || this._pressing) this._deferred = true;
    else this._render();
  }

  // The tiles actually shown (`only_on` / `only_alerts` applied), nothing when the card is hidden.
  getCardSize() {
    if (this.style.display === "none") return 0;
    const n = this._shown ?? this._items?.length ?? 0;
    if (!n || !this._config) return 1;
    // A row of large tiles (`layout: tiles`) is about one and a half rows of compact ones.
    const rows = Math.ceil(n / this._cols());
    return 1 + (this._tiles() ? Math.ceil(rows * 1.5) : rows);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _lang() {
    return rcLang(this.constructor.i18n, this._hass, this._config);
  }

  _t(key, vars) {
    return rcT(this.constructor.i18n, this._lang(), key, vars);
  }

  // `<base>_one` / `_few` / `_many` for `n`, with {n} filled in.
  _tn(base, n, vars) {
    return this._t(rcPluralKey(this.constructor.i18n, this._lang(), base, n), { ...vars, n });
  }

  _areaOf(id) {
    const e = this._hass.entities?.[id];
    if (!e) return undefined;
    return e.area_id ?? this._hass.devices?.[e.device_id]?.area_id;
  }

  _areaName() {
    const c = this._config;
    return c.area ? (this._hass.areas?.[c.area]?.name ?? c.area) : "";
  }

  // The configured `entities`; otherwise the entities of the area accepted by `_candidate`, minus `exclude`,
  // plus `include` (entities from another room or without one).
  _entries() {
    const h = this._hass;
    const c = this._config;
    const list = (l) => (l || []).map((e) => (typeof e === "string" ? { entity: e } : e)).filter((e) => h.states[e.entity]);
    if (c.entities?.length) return list(c.entities);
    this._prepare();
    const found = c.area ? this._areaIds().filter((id) => h.states[id] && this._candidate(id)).map((entity) => ({ entity })) : [];
    const ids = new Set(found.map((e) => e.entity));
    return [...found, ...list(c.include).filter((e) => !ids.has(e.entity))];
  }

  // Visible entities of the area, minus `exclude`: the registries are scanned again only when they or the config
  // change (an entity outside the entity registry has no area anyway).
  _areaIds() {
    const h = this._hass;
    const c = this._config;
    return rcMemo((this._memo ||= {}), "area", [c, h.entities, h.devices], () => {
      const exclude = new Set(c.exclude || []);
      return Object.keys(h.entities || {}).filter((id) => !exclude.has(id) && !h.entities[id].hidden && this._areaOf(id) === c.area);
    });
  }

  // Hook run before the discovery, for what `_candidate` needs.
  _prepare() {}

  // Re-render only when something visible changed.
  _changed(parts) {
    const sig = JSON.stringify([this._config, this._lang(), parts]);
    if (sig === this._sig) return false;
    this._sig = sig;
    return true;
  }

  _hide(hidden) {
    this.style.display = hidden ? "none" : "";
    return hidden;
  }

  // Status of a set of opening and safety sensors: an alarm (`leaks` active ones, the most serious being `alert`: leak,
  // smoke, co or gas), then the open ones, then the unavailable ones (`unavail`: a sensor that cannot report is no
  // all-clear), then "All closed" when there are door or window sensors (`closable`), `idle` otherwise.
  _openingStatus(leaks, open, closable, idle = "all_quiet", unavail = 0, alert = "leak") {
    if (leaks) return this._t(alert);
    if (open) return this._tn("open", open);
    if (unavail) return this._tn("unavail", unavail);
    return this._t(closable ? "all_closed" : idle);
  }

  // Subclasses implement `_collect()` (the tiles) and `_draw(items)`.
  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    this._items = this._collect();
    this._draw(this._items);
  }

  _cols() {
    return Math.min(4, Math.max(1, Number(this._config.columns) || 2));
  }

  // `layout: tiles`: one large tile per entity, the size of Home Assistant's Tile card (easier to tap on a phone).
  _tiles() {
    return this._config?.layout === "tiles";
  }

  // Overviews: the grid of room tiles (`tile(room)`), its columns, the empty and idle states, then the open room's
  // details kept in step with the rooms shown.
  _roomGrid(grid, rooms, tile) {
    const cols = Number(this._config.columns);
    // A `columns` of 1 or 2 holds on a narrow card; 3 and more go down to two under 340 px, one under 260 px.
    grid.classList.toggle("fixed", cols >= 1 && cols <= 2);
    grid.style.setProperty("--cols", String(Math.min(6, Math.max(1, cols || 3))));
    // Every room idle with the "hide idle rooms" option: the header alone says it all.
    const idle = !rooms.length && this._total > 0;
    grid.hidden = idle;
    if (idle) grid.innerHTML = "";
    else grid.innerHTML = rooms.length ? rooms.map(tile).join("") : `<div class="empty">${rcEsc(this._t("no_rooms"))}</div>`;
    if (this._openArea && !rooms.some((x) => x.id === this._openArea)) this._toggle(null);
    else if (this._openArea) this._fillPanel();
  }

  _head({ icon, title, status, chips = "", allOff = false }) {
    const c = this._config;
    return `
      <div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
        <div class="title">${rcEsc(title)}</div>
        ${chips}
        <button class="pill${allOff ? " action" : ""}" title="${rcEsc(allOff ? this._t("turn_all_off") : status)}"${allOff ? "" : " disabled"}>
          ${allOff ? '<ha-icon icon="mdi:power"></ha-icon>' : ""}<span class="pt">${rcEsc(status)}</span>
        </button>
      </div>`;
  }

  _tile(i, { cls = "", style = "", extra = "", state = i.state, title = `${i.name} — ${i.state}` }) {
    return `
      <button class="tile ${i.unavailable ? "na" : i.on ? "on" : "off"}${cls}" data-id="${rcEsc(i.id)}"
              ${style ? `style="${rcEsc(style)}"` : ""} title="${rcEsc(title)}">
        ${extra}
        <span class="ic"><ha-icon icon="${rcEsc(i.icon)}"></ha-icon></span>
        <span class="txt">
          <span class="name">${rcEsc(i.name)}</span>
          <span class="state">${state}</span>
        </span>
      </button>`;
  }

  _paint(level, head, tiles, extraClass = "") {
    // The tile or control with the keyboard focus keeps it through the redraw (a toggle, a step or a two-tap
    // confirmation from the keyboard): tiles by their data-id, controls by their data-k.
    const active = this._byPointer ? null : this.shadowRoot.activeElement;
    const focused = active?.dataset?.id;
    const focusKey = active?.dataset?.k;
    this.shadowRoot.innerHTML = `
      <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${level}${extraClass}${this._tiles() ? " layout-tiles" : ""}">
        ${head}
        ${tiles ? `<div class="grid" style="--cols:${this._cols()}">${tiles}</div>` : ""}
        ${this._afterGrid()}
      </ha-card>`;
    const root = this.shadowRoot;
    root.querySelector(".pill.action")?.addEventListener("click", (ev) => this._allOff(ev));
    if (this._config.navigation_path) rcBindNav(root.querySelector(".head"), this._config.navigation_path);
    for (const el of root.querySelectorAll(".tile")) {
      this._bindTile(el, (this._items || []).find((i) => i.id === el.dataset.id));
      if (focused && el.dataset.id === focused) el.focus({ preventScroll: true });
    }
    this._bindAfter(root);
    if (focusKey) root.querySelector(`[data-k="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  // What a card adds under its tiles (the Lights card's scenes), and its event wiring.
  _afterGrid() {
    return "";
  }

  _bindAfter() {}

  // The "turn everything off" button of the header (full card) or of the status (mini card).
  _allOff(ev) {
    ev.stopPropagation();
    const ids = (this._items || []).filter((i) => i.on).map((i) => i.id);
    if (!ids.length) return;
    // A host card may ask first (the Overview confirms before turning plugs off); otherwise off at once.
    if (this._confirmOff) this._confirmOff(ids);
    else rcCall(this._hass, "homeassistant", "turn_off", { entity_id: ids });
  }

  // Tap, hold for more-info, and an optional horizontal drag ({ move(x), end(x), step(delta), flush() }). From the
  // keyboard: Enter / Space tap, Shift+Enter or the context-menu key open the details, ←/→ step the drag by ∓/±10
  // (a held key at most every RC_REPEAT_MS), and releasing the arrow calls `flush`.
  _bindPress(el, { onTap, onHold, drag }) {
    let start = null;
    let mode = null; // null | "hold" | "drag"
    let timer = null;
    let lastStep = 0;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      start = { x: ev.clientX, y: ev.clientY };
      mode = null;
      this._pressing = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        // The card may have been detached mid-press (nothing else clears this timer): no hold on a dead node.
        if (mode || !this.isConnected) return;
        mode = "hold";
        // The press is settled (no tap): the details may open over the tile, so its pointerup may never come.
        this._released();
        onHold();
      }, RC_HOLD_MS);
    });
    el.addEventListener("pointermove", (ev) => {
      if (!start || mode === "hold") return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!mode && drag && Math.abs(dx) > RC_MOVE_PX && Math.abs(dx) > Math.abs(dy)) {
        mode = "drag";
        clearTimeout(timer);
        this._dragging = true;
        el.setPointerCapture(ev.pointerId);
        el.classList.add("dragging");
      } else if (!mode && (Math.abs(dx) > RC_MOVE_PX || Math.abs(dy) > RC_MOVE_PX)) {
        clearTimeout(timer); // scrolling, or dragging what cannot be dragged: not a tap
        start = null;
        this._released();
      }
      if (mode === "drag") drag.move(ev.clientX);
    });
    const end = (ev, cancelled) => {
      clearTimeout(timer);
      if (!start) return;
      const wasDrag = mode === "drag";
      if (wasDrag) {
        this._dragging = false;
        el.classList.remove("dragging");
        if (!cancelled) drag.end(ev.clientX);
        this._sig = null;
      } else if (!mode && !cancelled) {
        onTap();
      }
      start = null;
      mode = null;
      // After a drag, the next update redraws (the bar keeps the new level until the light reports it).
      this._released(!wasDrag);
    };
    // The mouse leaving the tile mid-press (no capture outside a drag) cancels it: neither a tap nor a hold.
    el.addEventListener("pointerleave", () => {
      if (!start || mode) return;
      clearTimeout(timer);
      start = null;
      this._released();
    });
    el.addEventListener("pointerup", (ev) => end(ev, false));
    el.addEventListener("pointercancel", (ev) => end(ev, true));
    el.addEventListener("contextmenu", (ev) => ev.preventDefault());
    el.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" && ev.shiftKey) || ev.key === "ContextMenu") {
        ev.preventDefault();
        if (!ev.repeat) onHold();
      } else if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (!ev.repeat) onTap();
      } else if (drag?.step && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
        ev.preventDefault();
        if (ev.repeat && ev.timeStamp - lastStep < RC_REPEAT_MS) return;
        lastStep = ev.timeStamp;
        drag.step(ev.key === "ArrowRight" ? 10 : -10);
      }
    });
    // The arrow released: the stepped level goes out now rather than after the pause.
    el.addEventListener("keyup", (ev) => {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") drag?.flush?.();
    });
  }

  // End of a press: renders now what an update brought during it.
  _released(flush = true) {
    this._pressing = false;
    if (!this._deferred || this._dragging) return;
    this._deferred = false;
    if (flush) this._render();
  }

  // Default tile: tap toggles, hold opens the details.
  _bindTile(el, item) {
    this._bindPress(el, {
      onTap: () => !item?.unavailable && rcCall(this._hass, "homeassistant", "toggle", { entity_id: el.dataset.id }),
      onHold: () => rcMoreInfo(this, el.dataset.id),
    });
  }
}

// Lights and plugs: entities that are on or off, a status counting the ones on, an optional "turn everything off".
// Subclasses set `static headIcons` ([on, off]) and `static emptyKey`, and implement `_sigOf(item)` (what a tile
// shows) and `_tileOf(item)`; `_statusExtra(lit)` adds to the status.
class RcToggleCard extends RcCard {
  _statusExtra() {
    return "";
  }

  // What the header shows, on the full card and the mini card: level, icon, status (`ofTotal`: *2/5 on*) and whether
  // the "turn everything off" button is there. Null when nothing changed, or when the card hides itself.
  _summary(items, ofTotal = false) {
    const c = this._config;
    const lit = items.filter((i) => i.on);
    const level = lit.length ? "on" : "off";
    if (!this._changed([ofTotal, items.map((i) => this._sigOf(i))])) return null;
    if (this._hide(c.hide_when_off && level === "off")) return null;

    const shown = c.only_on ? items.filter((i) => i.on || i.unavailable) : items;
    this._shown = shown.length;
    const [onIcon, offIcon] = this.constructor.headIcons;
    const n = ofTotal ? `${lit.length}/${items.length}` : lit.length;
    const status = lit.length
      ? this._t(rcPluralKey(this.constructor.i18n, this._lang(), "on", lit.length), { n })
      : this._t(items.length ? "all_off" : this.constructor.emptyKey);
    return {
      level,
      shown,
      icon: lit.length ? onIcon : offIcon,
      status: status + this._statusExtra(lit),
      allOff: c.all_off_button && lit.length > 0,
    };
  }

  _draw(items) {
    const s = this._summary(items);
    if (!s) return;
    const head = this._head({ ...s, title: this._config.title || this._areaName() || this._t("title") });
    this._paint(s.level, head, s.shown.map((i) => this._tileOf(i)).join(""));
  }
}

// ── Mini cards ───────────────────────────────────────────────────────────────
// A mini card shows what its full card (`Base`) shows on two lines: the room badge, title and status, then one chip
// per entity. Its zoom button (top right, `zoom: false` removes it) switches it to the full card and back; a click
// anywhere else brings it back too.
// The subclass implements `_drawMini(items)`, which builds the chips and calls `_paintMini`.
// Zoomed in, everything is shown (`only_alerts` and `hide_when_clear` only apply to the compact view). With
// `alertsOnly`, the compact view always shows only what needs a look (no `only_alerts` option then): quiet entities
// show once zoomed in.
const rcMini = (Base, tag, styles, { alertsOnly = false } = {}) =>
  class extends Base {
    static tag = tag;
    static defaults = (({ only_alerts, ...rest }) => ({ ...rest, ...(alertsOnly ? {} : { only_alerts }), zoom: true }))(
      Base.defaults,
    );
    static styles = `${Base.styles}${RC_MINI_STYLES}${styles}`;

    constructor() {
      super();
      // A click anywhere else brings the card back to its compact view.
      this._onUnzoom = (ev) => {
        if (rcOutside(this, ev)) rcUnzoom(this);
      };
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._unzoom ??= watchOutside(this, this._onUnzoom);
      this._unzoom.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._unzoom?.off();
      // Left (another dashboard view, a conditional card hidden): back to the compact view.
      rcUnzoom(this);
    }

    getCardSize() {
      if (this._zoomed) return super.getCardSize();
      return this.style.display === "none" ? 0 : 1;
    }

    getGridOptions() {
      return { columns: 12, min_columns: 6, rows: "auto" };
    }

    _draw(items) {
      const config = this._config;
      // The base card's own filter does the work: off zoomed in, always on in an `alertsOnly` compact view.
      if (this._zoomed) this._config = { ...config, only_alerts: false, hide_when_clear: false };
      else if (alertsOnly) this._config = { ...config, only_alerts: true };
      try {
        if (this._zoomed) super._draw(items);
        else this._drawMini(items);
      } finally {
        this._config = config;
      }
      this._addZoom();
    }

    _paintMini({ level, icon, status, chips, cls = "", allOff = false }) {
      const c = this._config;
      const nav = c.navigation_path;
      // With `allOff` the status is the "turn everything off" button, like the full card's pill.
      const st = allOff
        ? `<button class="st action" title="${rcEsc(this._t("turn_all_off"))}"><ha-icon icon="mdi:power"></ha-icon><span class="pt">${rcEsc(status)}</span></button>`
        : `<span class="st" title="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></span>`;
      this.shadowRoot.innerHTML = `
        <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${level}${cls}">
          <div class="mini">
            <div class="badge" title="${rcEsc(status)}"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
            <div class="body">
              <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
                <div class="title">${rcEsc(c.title || this._areaName() || this._t("title"))}</div>
                ${st}
              </div>
              <div class="rs">${chips}</div>
            </div>
          </div>
        </ha-card>`;
      const root = this.shadowRoot;
      if (nav) rcBindNav(root.querySelector(".head"), nav);
      root.querySelector(".st.action")?.addEventListener("click", (ev) => this._allOff(ev));
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    }

    // Zoom button at the end of the header, top right in both views, added once per render.
    // Its click is the overviews' (rcZoomClick): stop the tap on the title (navigation_path), toggle, keep the
    // keyboard focus (Enter / Space: no click count) on the button that replaced this one.
    _addZoom() {
      const head = this._config.zoom && this.shadowRoot.querySelector(".head");
      if (!head || head.querySelector(".zoom")) return;
      const button = document.createElement("button");
      button.className = "zoom";
      button.title = this._t(this._zoomed ? "zoom_out" : "zoom_in");
      button.innerHTML = `<ha-icon icon="${rcZoomIcon(this)}"></ha-icon>`;
      button.addEventListener("click", (ev) => rcZoomClick(this, ev));
      head.appendChild(button);
    }
  };

// Lights and plugs mini cards: the status counts what is on out of the total (*2/5 on*), with the full card's
// "turn everything off" button; then a tinted pill (icon and name) for each entity on, its icon alone for the others.
// The subclass may implement `_chipExtra(item)`, shown after the name (a plug's power draw).
const rcToggleMini = (Base, tag, styles) =>
  class extends rcMini(Base, tag, `${RC_TOGGLE_MINI_STYLES}${styles}`) {
    _chipExtra() {
      return "";
    }

    _drawMini(items) {
      const s = this._summary(items, true);
      if (!s) return;
      const chips = s.shown
        .map((i) => {
          const cls = i.unavailable ? " na" : i.on ? " on pill" : " off";
          const style = i.on && i.color ? ` style="--t:${rcEsc(i.color)}"` : "";
          return `
          <button class="r${cls}" data-id="${rcEsc(i.id)}"${style} title="${rcEsc(i.name)} — ${rcEsc(i.state)}">
            <ha-icon icon="${rcEsc(i.icon)}"></ha-icon>${i.on ? `<span>${rcEsc(i.name)}</span>${this._chipExtra(i)}` : ""}
          </button>`;
        })
        .join("");
      this._paintMini({ level: s.level, icon: s.icon, status: s.status, chips, allOff: s.allOff });
    }
  };

// ── Overviews: the open room ─────────────────────────────────────────────────
// What both overviews share around their room tiles: a tap follows the room's `navigation_path` or unfolds its
// details in the `.panel` (filled by the subclass's `_fillPanel`, from `_roomGrid`), a click anywhere else folds it
// back and returns to the rooms needing a look. The subclass implements `_shownRooms()` (the tiles shown) and
// `_clearPanel()` (drops its detail cards); `_beforeFold()` (optional) runs first on an outside click.
const rcRoomsPanel = (Base) =>
  class extends Base {
    constructor() {
      super();
      this._onOutside = (ev) => {
        if (!rcOutside(this, ev)) return;
        this._beforeFold?.();
        if (this._openArea) this._toggle(null);
        rcUnzoom(this);
      };
    }

    // A new config rebuilds the room details, which take part of it (language, exclude, thresholds…).
    setConfig(config) {
      this._panelArea = null;
      super.setConfig(config);
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._outside ??= watchOutside(this, this._onOutside);
      this._outside.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._outside?.off();
      // Left (another dashboard view, a conditional card hidden): folded back as by a click elsewhere, so that the
      // card does not come back with a room open, zoomed or its popup open.
      this._beforeFold?.();
      if (this._openArea) this._toggle(null);
      rcUnzoom(this);
    }

    _tap(aid) {
      const x = this._shownRooms().find((r) => r.id === aid);
      if (x?.navigation_path) rcNavigate(x.navigation_path);
      else this._toggle(this._openArea === aid ? null : aid);
    }

    // Opens a room's details (the render fills the panel), or folds them back.
    _toggle(aid) {
      this._openArea = aid;
      this._panelArea = null;
      this._sig = null;
      this._render();
      if (aid) return;
      const panel = this.shadowRoot.querySelector(".panel");
      panel.hidden = true;
      panel.innerHTML = "";
      this._clearPanel();
    }
  };

// ── Editor ───────────────────────────────────────────────────────────────────
// Fields shared by the room cards' editors.
const rcAreaFields = (navigation) => [
  { name: "area", selector: { area: {} } },
  { name: "title", selector: { text: {} } },
  ...(navigation ? [{ name: "navigation_path", selector: { navigation: {} } }] : []),
  { name: "columns", selector: { number: { min: 1, max: 4, mode: "box" } } },
];
// Compact tiles (default) or large ones, the size of Home Assistant's Tile card.
const rcLayoutField = (i18n, lang) => ({
  name: "layout",
  selector: {
    select: {
      mode: "dropdown",
      options: ["compact", "tiles"].map((value) => ({ value, label: rcT(i18n, lang, `ed_layout_${value}`) })),
    },
  },
});
const rcBooleans = (...names) => names.map((name) => ({ name, selector: { boolean: {} } }));

// "Advanced" section, folded, with the options that are lists or maps (edited as YAML) and the language. Its fields
// sit at the root of the config (`flatten`).
const RC_ADVANCED_HELPERS = ["language", "entities", "thresholds", "rooms"];
const rcAdvanced = (i18n, lang, ...names) => [
  {
    name: "advanced",
    type: "expandable",
    flatten: true,
    schema: names.map((name) =>
      name === "language"
        ? {
            name,
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "", label: rcT(i18n, lang, "ed_language_auto") },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                  { value: "de", label: "Deutsch" },
                  { value: "es", label: "Español" },
                  { value: "sr", label: "Српски" },
                  { value: "sr-Latn", label: "Srpski (latinica)" },
                  { value: "it", label: "Italiano" },
                  { value: "nl", label: "Nederlands" },
                  { value: "pt", label: "Português (Portugal)" },
                  { value: "pl", label: "Polski" },
                  { value: "ro", label: "Română" },
                  { value: "da", label: "Dansk" },
                  { value: "sv", label: "Svenska" },
                  { value: "bg", label: "Български" },
                  { value: "ru", label: "Русский" },
                  { value: "uk", label: "Українська" },
                  { value: "hu", label: "Magyar" },
                  { value: "sk", label: "Slovenčina" },
                  { value: "cs", label: "Čeština" },
                  { value: "sl", label: "Slovenščina" },
                  { value: "lv", label: "Latviešu" },
                  { value: "el", label: "Ελληνικά" },
                ],
              },
            },
          }
        : { name, selector: { object: {} } },
    ),
  },
];
// Entity picker limited to `ids`, left out when there is none.
const rcEntitiesField = (name, ids) =>
  ids.length ? [{ name, selector: { entity: { multiple: true, include_entities: ids } } }] : [];

// Include list: the entities of the card's domains (narrowed by `card.includeMatch` when set), anywhere in the home,
// that the card does not show yet (entities already included stay in the list).
const rcIncludeField = (card, hass, config) => {
  if (!hass) return [];
  const shown = new Set(
    rcProbe(card, hass, { ...config, entities: undefined, include: [] })
      ._entries()
      .map((e) => e.entity),
  );
  const ids = Object.keys(hass.states).filter(
    (id) =>
      card.includeDomains.includes(id.split(".")[0]) &&
      (!card.includeMatch || card.includeMatch(hass, id)) &&
      !shown.has(id) &&
      !hass.entities?.[id]?.hidden &&
      !hass.entities?.[id]?.entity_category,
  );
  for (const e of config?.include || []) {
    const id = typeof e === "string" ? e : e.entity;
    if (!ids.includes(id)) ids.push(id);
  }
  return rcEntitiesField("include", ids);
};

// A detached card of class `card`, with `config` over its defaults, to run its discovery from the editor.
const rcProbe = (card, hass, config) => {
  const probe = document.createElement(card.tag);
  probe._hass = hass;
  probe._config = { ...card.defaults, ...config };
  return probe;
};

// Exclude list limited to what the card finds in the chosen room, with the card's own rules
// (entities already excluded stay in the list).
const rcExcludeField = (card, hass, config) => {
  const ids =
    hass && config?.area
      ? rcProbe(card, hass, { ...config, entities: undefined, exclude: [] })
          ._entries()
          .map((e) => e.entity)
      : [];
  return rcEntitiesField("exclude", ids);
};

// `schema(lang, hass, config)` lists the fields; options left at the card's default are not written to the YAML
// (list defaults such as `exclude: []` are not shown in the form: an empty list is never written anyway).
// `autos` maps an option to its default worked out from the config (`(hass, config) => value`): shown in the form
// while unset, and kept out of the YAML when left at it.
// Entity lists the form edits with an entity picker (ids only): an item written `{ entity, name, icon }` in YAML shows as its entity,
// and gets its name and icon back when the form changes the list (ha-room-card#77).
const RC_ENTITY_LISTS = ["include"];
const rcListIds = (list) => (Array.isArray(list) ? list.map((e) => (typeof e === "string" ? e : e?.entity)).filter(Boolean) : list);
const rcListKeep = (ids, before) =>
  Array.isArray(ids) ? ids.map((id) => (Array.isArray(before) ? before.find((e) => typeof e === "object" && e?.entity === id) : undefined) ?? id) : ids;

const rcEditor = ({ card, helpers, schema, autos = {} }) => {
  const i18n = card.i18n;
  const defaults = { show_title: true, ...Object.fromEntries(Object.entries(card.defaults).filter(([, v]) => !Array.isArray(v))) };
  return class extends HTMLElement {
    setConfig(config) {
      this._config = config;
      this._update();
    }

    set hass(hass) {
      this._hass = hass;
      this._update();
    }

    _update() {
      if (!this._hass || !this._config) return;
      const lang = rcLang(i18n, this._hass, this._config);
      // Read by the label and helper callbacks, set once on the form: a language change must reach them too.
      this._lang = lang;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => rcT(i18n, this._lang, `ed_${s.name}`);
        this._form.computeHelper = (s) =>
          helpers.includes(s.name) ? rcT(i18n, this._lang, `ed_${s.name}_helper`) : undefined;
        this._form.addEventListener("value-changed", (ev) => {
          const config = { ...ev.detail.value };
          for (const k of RC_ENTITY_LISTS) if (k in config) config[k] = rcListKeep(config[k], this._config[k]);
          for (const k of Object.keys(config)) {
            const v = config[k];
            if (v === "" || v == null || (Array.isArray(v) && !v.length) || defaults[k] === v) delete config[k];
          }
          for (const [k, auto] of Object.entries(autos)) {
            const untouched = this._config[k] === undefined && config[k] === auto(this._hass, this._config);
            if (untouched || config[k] === auto(this._hass, config)) delete config[k];
          }
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      // A new data or schema object re-renders the whole form, and the schema runs the card's discovery:
      // both only change with the config, the language or the registries.
      const memo = (this._memo ||= {});
      const h = this._hass;
      this._form.data = rcMemo(memo, "data", [this._config, h.areas], () => {
        const data = { ...defaults, ...this._config };
        for (const k of RC_ENTITY_LISTS) if (k in data) data[k] = rcListIds(data[k]);
        for (const [k, auto] of Object.entries(autos)) data[k] ??= auto(h, this._config);
        return data;
      });
      this._form.schema = rcMemo(memo, "schema", [lang, this._config, h.entities, h.devices, h.areas], () =>
        schema(lang, h, this._config),
      );
    }
  };
};

const rcRegister = (card, editor, name, description) => {
  if (customElements.get(card.tag)) return;
  customElements.define(card.tag, card);
  customElements.define(`${card.tag}-editor`, editor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: card.tag,
    name,
    description,
    preview: true,
    documentationURL: "https://github.com/juju35/ha-light-card",
  });
};

if (!customElements.get("light-card")) {
  console.info(`%c HA-LIGHT-CARD %c v${RC_VERSION} `, "background:#f59f00;color:#fff;font-weight:700", "");
}

// ── Common styles ────────────────────────────────────────────────────────────
const RC_BASE_STYLES = `
  :host {
    --rc-ok: var(--success-color, #43a047);
    --rc-warn: var(--warning-color, #ffa600);
    --rc-alert: var(--error-color, #db4437);
    --rc-info: var(--info-color, #039be5);
    --rc-light: var(--state-light-active-color, #ffb300);
    --rc-plug: var(--state-switch-on-color, var(--primary-color, #03a9f4));
    --rc-idle: var(--secondary-text-color, #9e9e9e);
    --rc-na: var(--disabled-color, #9e9e9e);
    display: block;
    min-width: 0;
  }
  /* The card answers its own width (container queries). That containment drops its content from its natural width: in
     a wrapper sized by its content (inline-block, a grid's auto column, a flex row: layout-card, button-card…) it would
     shrink to its padding. The empty grid below (no height) gives the host a natural width of 344 px there, as a
     preferred width only: its column is minmax(0, …), so the card still shrinks to its column in a grid card, a
     horizontal stack or a 1fr column, even wrapped in a <div> (hui-card in layout-card). contain-intrinsic-inline-size
     or a min-width in px would be a minimum there, and the card would overflow. */
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, 344px); height: 0; }
  ha-card { padding: 12px; overflow: hidden; container-type: inline-size; }
  ha-card.lvl-alert { box-shadow: 0 0 0 1px color-mix(in srgb, var(--rc-alert) 45%, transparent), var(--ha-card-box-shadow, none); }

  .head { display: flex; align-items: center; gap: 10px; }
  .head.nav { cursor: pointer; }
  .head.nav:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
           background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
  .badge ha-icon { --mdc-icon-size: 24px; }
  .lvl-alert .badge { animation: rc-pulse 1.6s ease-in-out infinite; }
  /* Narrow header: the title keeps a few letters (never 0 px), the status pill shrinks and ellipsises, the icon buttons
     (zoom, power) never shrink; under 200 px the pill is only its coloured dot, its text kept for screen readers. */
  .title { flex: 1 1 0; min-width: 5ch; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
           /* show_title: false keeps the title's room (the pill and buttons stay in place) */
  :host([hide-title]) .head > .title { visibility: hidden; }
  .pill { all: unset; flex: 0 1 auto; min-width: 0; box-sizing: border-box; position: relative;
          display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 500;
          padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent);
          /* Coloured text is half the accent, half the text colour: 4.5:1 on its tint in light and dark themes, where
             the bare accent (amber above all) is not. */
          color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); }
  .pt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill ha-icon { flex: none; }
  /* A card this narrow (6 columns of the Sections view on a phone): the title is at its few letters already, so the
     status pill goes to a line of its own under it, where its whole label fits, rather than end with "…". */
  @container (max-width: 260px) {
    .head { flex-wrap: wrap; row-gap: 4px; }
    .head::after { content: ""; order: 1; flex: 1 0 100%; }
    .head > .pill { order: 2; margin-left: 50px; max-width: calc(100% - 50px); }
  }
  @container (max-width: 200px) {
    /* Under 200 px the pill is only its dot again: back on the title's line. */
    .head { flex-wrap: nowrap; }
    .head::after { content: none; }
    .head > .pill { order: 0; margin-left: 0; max-width: none; }
    .head > .pill .pt, .st .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .head > .pill:not(.action), .st { flex: none; padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    .head > .pill:not(.action)::before, .st::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    .head > .pill.action { padding: 1px 4px; }
    /* A full card this narrow (6 columns of the Sections view on a phone): a smaller badge, no side chip in the header. */
    .head { gap: 6px; }
    .head > .badge { width: 32px; height: 32px; }
    .head > .badge ha-icon { --mdc-icon-size: 20px; }
    .head > .chip { display: none; }
  }
  .pill.action { cursor: pointer; }
  .pill.action:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
  .pill.action:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .pill ha-icon { --mdc-icon-size: 12px; margin-left: -2px; }

  .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  .tile { all: unset; position: relative; overflow: hidden; box-sizing: border-box; cursor: pointer; min-width: 0;
          display: flex; align-items: center; gap: 8px; padding: 5px 8px 5px 5px; border-radius: 10px;
          touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
          background: color-mix(in srgb, var(--t) 9%, var(--secondary-background-color, transparent));
          border: 1px solid color-mix(in srgb, var(--t) 22%, transparent); transition: background .2s, border-color .2s; }
  .tile.off, .tile.na { background: var(--secondary-background-color, transparent); border-color: transparent; }
  .tile.na { --t: var(--rc-na); opacity: .7; }
  .tile:hover { background: color-mix(in srgb, var(--t) 15%, var(--secondary-background-color, transparent)); }
  .tile:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .ic, .txt { position: relative; }
  .ic { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
        color: var(--t); background: color-mix(in srgb, var(--t) 20%, transparent); }
  .ic ha-icon { --mdc-icon-size: 16px; }
  .txt { display: flex; flex-direction: column; min-width: 0; }
  .name { font-size: 13px; font-weight: 500; line-height: 1.2; color: var(--primary-text-color);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* A reading is never cut: on a narrow tile it goes on to a second line (the name, a label, keeps its ellipsis). */
  .state { font-size: 11px; line-height: 1.2; color: var(--secondary-text-color); overflow-wrap: break-word; }
  /* A card this narrow (a phone, 6 columns of the Sections view): one tile per row, whatever the columns option. */
  @container (max-width: 260px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  /* layout: tiles — the size of Home Assistant's Tile card — 56 px high, a 40 px icon, the name over the state. */
  .layout-tiles .grid { gap: 8px; }
  .layout-tiles .tile { min-height: 56px; gap: 10px; padding: 8px 10px 8px 8px; border-radius: 12px; }
  .layout-tiles .ic { width: 40px; height: 40px; }
  .layout-tiles .ic ha-icon { --mdc-icon-size: 24px; }
  .layout-tiles .txt { gap: 2px; }
  .layout-tiles .name { font-size: 14px; line-height: 1.25; }
  .layout-tiles .state { font-size: 12px; line-height: 1.25; }

  @keyframes rc-blink { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
  @keyframes rc-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 45%, transparent) }
                        50% { box-shadow: 0 0 0 7px transparent } }
  @media (prefers-reduced-motion: reduce) { .tile, .lvl-alert .badge { animation: none; transition: none; } }
`;

// Mini cards: layout, chips and zoom button. A chip is plain (icon and text) until it needs a look: then a tinted pill.
// The zoom / detail button of the mini cards and the overviews.
const RC_ZOOM_STYLES = `
  /* 40 px to tap, laid out as the 24 px it looks (the negative margins). */
  .zoom { all: unset; flex: none; cursor: pointer; width: 40px; height: 40px; margin: -12px -12px -12px -8px; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom ha-icon { --mdc-icon-size: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--rc-idle) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
`;

// Lights and plugs mini cards: the "turn everything off" status (not filled: tinted on hover, like the zoom button)
// and the chips of the entities that are off (icon alone, grey).
const RC_TOGGLE_MINI_STYLES = `
  .st.action { all: unset; flex: 0 1 auto; min-width: 0; box-sizing: border-box; position: relative; cursor: pointer;
               display: inline-flex; align-items: center; gap: 3px; margin-left: auto; padding: 1px 6px; border-radius: 999px;
               font-size: 11px; font-weight: 500; color: var(--c); }
  .st.action ha-icon { --mdc-icon-size: 12px; flex: none; }
  .st.action:hover { background: color-mix(in srgb, var(--c) 14%, transparent); }
  .st.action:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  @container (max-width: 200px) {
    .st.action { width: auto; height: auto; padding: 1px 4px; }
    .st.action::before { content: none; }
  }
  .r.off, .r.na { padding: 0 3px; }
  .r.off ha-icon, .r.na ha-icon { margin-right: 0; }
  .r.off { --t: var(--rc-idle); }
  .r.na  { --t: var(--rc-na); opacity: .7; }
  .r small { flex: none; font-size: 10px; font-weight: 400; opacity: .8; margin-left: 4px; }
`;

// The overviews' room grid: the tiles, their icon, chips row, empty state and details panel. Each overview sets the
// tile's default tint and its own levels (`.room { --t: … }`, `.room.lvl-…`), the chips' spacing and the panel extras.
const RC_ROOM_GRID_STYLES = `
  .grid { display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  @container (max-width: 340px) { .grid:not(.fixed) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  /* A card this narrow (6 columns of the Sections view on a phone): one room per row, whatever the columns option. Two
     left the name a letter or two ("B…") and pushed a chip out of its tile. */
  @container (max-width: 260px) { .grid.grid { grid-template-columns: minmax(0, 1fr); } }
  .grid[hidden] { display: none; }
  .room { all: unset; box-sizing: border-box; cursor: pointer; min-width: 0;
          display: grid; grid-template-columns: 26px minmax(0, 1fr); grid-template-areas: "ic name" "ic state" "chips chips";
          column-gap: 7px; align-items: center; align-content: start; padding: 6px 7px; border-radius: 10px;
          background: var(--secondary-background-color, transparent); border: 1px solid transparent;
          transition: background .2s, border-color .2s; }
  .room.lvl-warn, .room.lvl-alert {
    background: color-mix(in srgb, var(--t) 9%, var(--secondary-background-color, transparent));
    border-color: color-mix(in srgb, var(--t) 22%, transparent); }
  .room:hover { background: color-mix(in srgb, var(--t) 13%, var(--secondary-background-color, transparent)); }
  .room:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .room.sel { border-color: color-mix(in srgb, var(--primary-color) 55%, transparent); }
  .room .ic { grid-area: ic; align-self: start; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
              color: var(--t); background: color-mix(in srgb, var(--t) 16%, transparent); }
  .room.lvl-ok .ic { color: var(--primary-text-color); background: color-mix(in srgb, var(--rc-idle) 14%, transparent); }
  .room .ic ha-icon { --mdc-icon-size: 15px; }
  .room .name { grid-area: name; }
  /* The state (a sentence: "Water leak", "Too humid +1") wraps between its words only; a word too long for its line
     ends with "…" rather than being broken ("Pr|es|en|ce"). */
  .room .state { grid-area: state; overflow-wrap: normal; overflow: hidden; text-overflow: ellipsis; }
  .room:not(.lvl-ok) .state { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); }
  .chips { grid-area: chips; display: flex; flex-wrap: wrap; }
  .chips:empty { display: none; }
  .empty { grid-column: 1 / -1; padding: 12px; text-align: center; font-size: 13px; color: var(--secondary-text-color); }
  .panel { margin-top: 8px; border-radius: 12px; overflow: hidden; background: var(--secondary-background-color, transparent);
           --ha-card-background: transparent; --card-background-color: transparent;
           --ha-card-box-shadow: none; --ha-card-border-width: 0; }
  .panel[hidden] { display: none; }
  /* The unfolded room cards are custom elements with no display of their own: inline, the separator between them
     (border-top) would only paint on an empty first line box around their block <ha-card>. */
  .panel > * { display: block; }
  @media (prefers-reduced-motion: reduce) { .room { animation: none; transition: none; } }
`;

const RC_MINI_STYLES = `${RC_ZOOM_STYLES}
  /* The badge sits 12px from the card's top-left corner, like the other ha-* cards, beside the title and the readings. */
  ha-card:has(.mini) { padding: 12px; }
  .mini { display: flex; align-items: flex-start; gap: 10px; }
  /* The badge keeps the full card's size (40 px, icon 24 px): the body is at least as tall, a lone title line centred
     beside it. */
  .body { flex: 1; min-width: 0; min-height: 40px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .mini .head { gap: 8px; }
  .mini .title { line-height: 1.25; }
  .st { flex: 0 1 auto; min-width: 0; position: relative; display: inline-flex; align-items: center;
        margin-left: auto; font-size: 11px; font-weight: 500; color: var(--c); }
  .rs { display: flex; flex-wrap: wrap; gap: 2px 4px; margin-left: -4px; }
  .rs:empty { display: none; }
  /* A chip never runs past the card: a long name ends with an ellipsis. */
  .r { all: unset; cursor: pointer; display: inline-flex; align-items: baseline; gap: 1px; padding: 0 5px 0 4px;
       box-sizing: border-box; min-width: 0; max-width: 100%; overflow: hidden;
       border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 24px; white-space: nowrap; --t: var(--rc-ok);
       color: var(--primary-text-color); }
  .r ha-icon { --mdc-icon-size: 13px; flex: none; color: var(--t); align-self: center; margin-right: 2px; }
  .r > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .r.pill { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--t) 14%, transparent); }
  .r:hover { background: color-mix(in srgb, var(--t) 20%, var(--secondary-background-color, transparent)); }
  .r:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
`;
