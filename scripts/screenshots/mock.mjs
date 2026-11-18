// The mock home of the screenshots and animations: lights of every kind of fixture, with their colour modes, effects
// and groups, and a few scenes.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: new Date().toISOString() });

const CT = { supported_color_modes: ["color_temp"], min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 };
const COLOR = { supported_color_modes: ["color_temp", "hs"], min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500 };
const warm = (bri, k = 2700) => ({ brightness: Math.round(bri * 2.55), color_mode: "color_temp", color_temp_kelvin: k });
const rgb = (bri, c, effect) => ({ brightness: Math.round(bri * 2.55), color_mode: "hs", rgb_color: c, ...(effect ? { effect } : {}) });

// Each scene: the light(s) and the card's options.
const SCENES = {
  floor: { area: "Living room", lights: { "light.floor_lamp": ["on", "Floor lamp", { ...COLOR, ...warm(70) }] }, config: { scenes: ["scene.relax", "scene.reading"] } },
  pendants: {
    area: "Dining room",
    lights: {
      "light.dining_pendants": ["on", "Dining pendants", { ...CT, ...warm(45, 2200), entity_id: ["light.dining_pendant_left", "light.dining_pendant_center", "light.dining_pendant_right"] }],
      "light.dining_pendant_left": ["on", "Dining pendants Left", { ...CT, ...warm(45, 2200) }],
      "light.dining_pendant_center": ["on", "Dining pendants Center", { ...CT, ...warm(45, 2200) }],
      "light.dining_pendant_right": ["off", "Dining pendants Right", { ...CT }],
    },
    config: { kind: "cluster" },
  },
  chandelier: { area: "Hall", lights: { "light.chandelier": ["on", "Chandelier", { ...CT, ...warm(55, 2400) }] }, config: {} },
  color: {
    area: "Bedroom",
    lights: { "light.bedroom_bulb": ["on", "Bedside bulb", { ...COLOR, ...rgb(60, [171, 71, 188]), effect_list: ["None", "Candle", "Breathe", "Rainbow"] }] },
    config: { kind: "bulb" },
  },
  tree: {
    area: "Living room",
    lights: { "light.christmas_tree": ["on", "Christmas tree", { supported_color_modes: ["hs"], ...rgb(80, [255, 200, 120], "Twinkle"), effect_list: ["Solid", "Twinkle", "Rainbow", "Fireworks"] }] },
    config: {},
  },
  garden: { area: "Garden", lights: { "light.garden_spot": ["on", "Garden spot", { ...CT, ...warm(90, 3000) }] }, config: {} },
  desk: { area: "Office", lights: { "light.desk_lamp": ["on", "Desk lamp", { ...CT, ...warm(100, 4200) }] }, config: {} },
  strip: {
    area: "Living room",
    lights: { "light.tv_strip": ["on", "TV LED strip", { ...COLOR, ...rgb(65, [66, 165, 245]), effect_list: ["None", "Aurora", "Ocean", "Sunset"] }] },
    config: {},
  },
  garland: { area: "Living room", lights: { "light.window_garland": ["on", "Window garland", { supported_color_modes: ["onoff"], color_mode: "onoff" }] }, config: {} },
  off: { area: "Living room", lights: { "light.floor_lamp": ["off", "Floor lamp", { ...COLOR }] }, config: {} },
  offline: { area: "Bedroom", lights: { "light.bedroom_bulb": ["unavailable", "Bedside bulb", { ...COLOR }] }, config: { kind: "filament" } },
};

export const setup = (s) => {
  const v = SCENES[s.scene];
  const states = Object.fromEntries(Object.entries(v.lights).map(([id, [state, name, attrs]]) => [id, st(id, state, { friendly_name: name, ...attrs })]));
  states["scene.relax"] = st("scene.relax", "unknown", { friendly_name: "Relax" });
  states["scene.reading"] = st("scene.reading", "unknown", { friendly_name: "Reading" });
  const area = v.area.toLowerCase().replace(/\W/g, "_");
  const entities = Object.fromEntries(Object.keys(v.lights).map((id) => [id, { entity_id: id, area_id: area, platform: "hue" }]));
  return {
    hass: {
      language: "en",
      locale: { language: "en" },
      config: { unit_system: { temperature: "°C" } },
      themes: { darkMode: s.theme === "dark" },
      areas: { [area]: { area_id: area, name: v.area } },
      devices: {},
      entities,
      states,
    },
    // Night shots force the night picture in both twins: auto follows the theme alone.
    config: { entity: Object.keys(v.lights)[0], ...(s.night ? { illustration_theme: "night" } : {}), ...v.config, ...s.config },
    open: s.open,
  };
};
