// A mock Home Assistant with lights: a colour floor lamp (colour temperature and HS, effects) in the living room, a
// light group of three pendants (two on) in the dining room, a plain on/off garland, a lamp on a switch, and scenes.
export const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-01-01T00:00:00Z" });

const CT = { supported_color_modes: ["color_temp"], min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 };

export const makeHass = ({ lamp = "on", brightness = 178, mode = "color_temp", kelvin = 2700, effect = null, ...overrides } = {}) => {
  const calls = [];
  return {
    language: "en",
    locale: { language: "en" },
    config: { unit_system: { temperature: "°C" } },
    themes: { darkMode: false },
    areas: { living: { area_id: "living", name: "Living room" }, dining: { area_id: "dining", name: "Dining room" } },
    devices: {},
    entities: {
      "light.floor_lamp": { area_id: "living", platform: "hue" },
      "light.dining_pendants": { area_id: "dining", platform: "group" },
      "light.dining_left": { area_id: "dining", platform: "hue" },
      "light.dining_center": { area_id: "dining", platform: "hue" },
      "light.dining_right": { area_id: "dining", platform: "hue" },
      "light.window_garland": { area_id: "living", platform: "tuya" },
      "light.hidden": { area_id: "living", platform: "hue", hidden: true },
    },
    states: {
      "light.floor_lamp": st("light.floor_lamp", lamp, {
        friendly_name: "Floor lamp",
        supported_color_modes: ["color_temp", "hs"],
        min_color_temp_kelvin: 2000,
        max_color_temp_kelvin: 6500,
        effect_list: ["None", "Candle", "Fireplace"],
        ...(lamp === "on"
          ? { brightness, color_mode: mode, ...(mode === "color_temp" ? { color_temp_kelvin: kelvin } : { rgb_color: [171, 71, 188] }), effect: effect ?? "None" }
          : {}),
      }),
      "light.dining_pendants": st("light.dining_pendants", "on", { friendly_name: "Dining pendants", ...CT, brightness: 115, color_mode: "color_temp", color_temp_kelvin: 2200, entity_id: ["light.dining_left", "light.dining_center", "light.dining_right"] }),
      "light.dining_left": st("light.dining_left", "on", { friendly_name: "Dining pendants Left", ...CT, brightness: 115, color_mode: "color_temp", color_temp_kelvin: 2200 }),
      "light.dining_center": st("light.dining_center", "on", { friendly_name: "Dining pendants Center", ...CT, brightness: 115, color_mode: "color_temp", color_temp_kelvin: 2200 }),
      "light.dining_right": st("light.dining_right", "off", { friendly_name: "Dining pendants Right", ...CT }),
      "light.window_garland": st("light.window_garland", "on", { friendly_name: "Window garland", supported_color_modes: ["onoff"], color_mode: "onoff" }),
      "light.hidden": st("light.hidden", "on", { friendly_name: "Hidden", ...CT }),
      "switch.reading_lamp": st("switch.reading_lamp", "off", { friendly_name: "Reading lamp" }),
      "scene.relax": st("scene.relax", "unknown", { friendly_name: "Relax" }),
    },
    calls,
    callService(domain, service, data) {
      calls.push([domain, service, data]);
    },
    ...overrides,
  };
};
