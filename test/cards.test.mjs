import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const lc = load();
const { cards } = lc;
const json = (v) => JSON.parse(JSON.stringify(v));

// A card whose shadow root answers every selector with nodes recording their listeners.
const make = (tag, config, hass = makeHass()) => {
  const card = new cards[tag]();
  card.attachShadow();
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (nodes[s] ||= fakeNode());
  card._nodes = nodes;
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  return card;
};
const click = (card, sel) => card._nodes[sel].listeners.click({ stopPropagation() {} });
const LAMP = { entity: "light.floor_lamp" };

test("both cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["light-card", "light-mini-card"]) {
    assert.ok(lc.customElements.get(tag), tag);
    assert.ok(lc.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual(json(lc.window.customCards.map((c) => c.type)), ["light-card", "light-mini-card"]);
});

test("discovery: dimmable lights first, groups last, hidden ones never", () => {
  const found = json(lc.lcLights(makeHass()));
  assert.equal(found[0], "light.floor_lamp");
  assert.equal(found.at(-1), "light.dining_pendants");
  assert.ok(!found.includes("light.hidden"));
  assert.deepEqual(json(cards["light-card"].getStubConfig(makeHass())), LAMP);
});

test("fixtures from the name, in several languages", () => {
  const cases = {
    "Floor lamp": "floor",
    Lampadaire: "floor",
    Lustre: "chandelier",
    "Suspensions salle à manger": "cluster",
    "Suspension cuisine": "pendant",
    Plafonnier: "ceiling",
    "Lampe de bureau": "desk",
    "Lampe de chevet": "desk",
    "Spot jardin": "spot",
    "Sapin de Noël": "tree",
    "Guirlande fenêtre": "garland",
    "Ruban LED TV": "strip",
    "Ampoule Edison": "filament",
    "Ampoule salon": "bulb",
    Weihnachtsbaum: "tree",
    Stehlampe: "floor",
  };
  for (const [name, kind] of Object.entries(cases)) assert.equal(lc.lcKindOf(name), kind, name);
  for (const k of lc.LC_KINDS) assert.ok(lc.LC_I18N.en[`k_${k}`], `k_${k}`);
});

test("colours: the colour temperature as RGB, the light's own colour, its capabilities", () => {
  assert.deepEqual(json(lc.lcKelvin(6600)), [255, 255, 255]);
  const warm = lc.lcKelvin(2700);
  assert.ok(warm[0] === 255 && warm[2] < 200, String(warm));
  const h = makeHass();
  assert.equal(lc.lcColorOf(h.states["light.floor_lamp"]).slice(0, 3), "#ff");
  assert.equal(lc.lcColorOf(makeHass({ mode: "hs" }).states["light.floor_lamp"]), "#ab47bc");
  assert.deepEqual(json(lc.lcCaps(h.states["light.floor_lamp"])), { dim: true, ct: true, color: true, effects: ["None", "Candle", "Fireplace"] });
  assert.deepEqual(json(lc.lcCaps(h.states["light.window_garland"])), { dim: false, ct: false, color: false, effects: [] });
});

test("full card: the fixture as the slider, the brightness, the tone, colour temperature and colours", () => {
  const hass = makeHass();
  const card = make("light-card", { ...LAMP, scenes: ["scene.relax"] }, hass);
  const m = card._items;
  assert.equal(m.state, "on");
  assert.equal(m.kind, "floor");
  assert.equal(Math.round(m.level * 100), 70);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /class="banner r-living"/);
  assert.match(html, /<span class="bpt">On · 70 %<\/span>/);
  assert.match(html, /<div class="fx dim" tabindex="0" role="slider"[^>]*aria-valuenow="70"/);
  assert.match(html, /<span class="big">70<\/span>/);
  assert.match(html, /2,700 K · Warm white/);
  assert.match(html, /class="ct"/);
  assert.match(html, /data-kelvin="2700"/);
  assert.match(html, /data-rgb="#ef5350"/);
  assert.match(html, /data-effect="Candle"/);
  assert.doesNotMatch(html, /data-effect="None"/);
  assert.match(html, /data-scene="scene.relax"/);
  // The power button and the presets.
  click(card, ".pw");
  assert.deepEqual(json(hass.calls.at(-1)), ["light", "turn_off", { entity_id: "light.floor_lamp" }]);
  click(card, '[data-k="night"]');
  assert.deepEqual(json(hass.calls.at(-1)), ["light", "turn_on", { entity_id: "light.floor_lamp", brightness_pct: 10 }]);
});

test("states: off, a colour, an effect, offline; a switch only toggles", () => {
  const off = make("light-card", LAMP, makeHass({ lamp: "off" }));
  assert.equal(off._items.state, "off");
  assert.match(off.shadowRoot.innerHTML, /<span class="bpt">Off<\/span>/);
  const color = make("light-card", LAMP, makeHass({ mode: "hs" }));
  assert.equal(color._items.color, "#ab47bc");
  assert.match(color.shadowRoot.innerHTML, /Colour/);
  const fx = make("light-card", LAMP, makeHass({ effect: "Candle" }));
  assert.equal(fx._items.effect, "Candle");
  assert.match(fx.shadowRoot.innerHTML, /class="chip on" data-effect="Candle"/);
  const gone = make("light-card", LAMP, makeHass({ lamp: "unavailable" }));
  assert.equal(gone._items.state, "offline");
  assert.doesNotMatch(gone.shadowRoot.innerHTML, /class="pw/);
  const hass = makeHass();
  const sw = make("light-card", { entity: "switch.reading_lamp", kind: "desk" }, hass);
  assert.equal(sw._items.caps.dim, false);
  assert.match(sw.shadowRoot.innerHTML, /role="switch"/);
  click(sw, ".pw");
  assert.deepEqual(json(hass.calls.at(-1)), ["homeassistant", "turn_on", { entity_id: "switch.reading_lamp" }]);
});

test("groups: a light group's members as tiles and as the cluster's pendants; a list of lights as one", () => {
  const card = make("light-card", { entity: "light.dining_pendants" });
  const m = card._items;
  assert.equal(m.kind, "cluster");
  assert.equal(m.members.length, 3);
  assert.deepEqual(json(m.members.map((x) => x.name)), ["Left", "Center", "Right"]);
  assert.deepEqual(json(m.parts.map((p) => p.on)), [true, true, false]);
  assert.match(card.shadowRoot.innerHTML, /<span class="bpt">2 of 3 on<\/span>/);
  assert.match(card.shadowRoot.innerHTML, /data-member="light.dining_right"/);
  const hass = makeHass();
  const list = make("light-card", { entities: ["light.dining_left", "light.dining_right"], title: "Pendants", kind: "cluster" }, hass);
  assert.equal(list._items.state, "on");
  click(list, ".pw");
  assert.deepEqual(json(hass.calls.at(-1)), ["light", "turn_off", { entity_id: ["light.dining_left", "light.dining_right"] }]);
});

test("no light: says so", () => {
  const card = make("light-card", {}, makeHass({ states: {}, entities: {} }));
  assert.match(card.shadowRoot.innerHTML, /No light found/);
});

test("mini card: the banner with the state and the tone", () => {
  const card = make("light-mini-card", LAMP);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /class="lvl-on bn"/);
  assert.match(html, /<span class="bpt">On · 70 %<\/span>/);
  assert.match(html, /<span>2,700 K · Warm white<\/span>/);
});

test("translations: every language has every key of English, with the same placeholders", () => {
  const LANGS = ["en", "fr", "de", "es", "sr", "sr-Latn", "it", "nl", "pt", "pl", "ro", "da", "sv", "bg", "ru", "uk", "hu", "sk", "cs", "sl", "lv", "el"];
  const vars = (s) => s.match(/\{\w+\}/g)?.sort() ?? [];
  for (const [name, table] of [["shared", lc.RC_I18N], ["lc", lc.LC_I18N]]) {
    assert.deepEqual(json(Object.keys(table)), LANGS, name);
    const ref = json(Object.keys(table.en)).sort();
    for (const lang of LANGS) {
      const keys = json(Object.keys(table[lang])).filter((k) => !["open_f", "closed_f"].includes(k) && !k.endsWith("_few"));
      assert.deepEqual(keys.sort(), ref, `${name}.${lang}`);
      for (const k of ref) assert.deepEqual(json(vars(table[lang][k])), json(vars(table.en[k])), `${name}.${lang}.${k}`);
    }
  }
  const fr = make("light-card", { ...LAMP, language: "fr" });
  assert.match(fr.shadowRoot.innerHTML, /Allumée · 70 %/);
});

test("editors: defaults stay out of the YAML, every field has a label", () => {
  const flat = (schema) => schema.flatMap((f) => (f.schema ? flat(f.schema) : [f]));
  for (const tag of ["light-card", "light-mini-card"]) {
    const ed = new (lc.customElements.get(`${tag}-editor`))();
    ed.appendChild = () => {};
    ed.setConfig({ type: `custom:${tag}`, ...LAMP });
    ed.hass = makeHass();
    const names = flat(ed._form.schema).map((f) => f.name);
    for (const n of ["entity", "entities", "kind", "scenes", "colors", "show_colors", "show_effects", "show_members", "illustration_theme", "language"]) assert.ok(names.includes(n), `${tag}: ${n}`);
    for (const f of flat(ed._form.schema)) {
      assert.notEqual(ed._form.computeLabel(f), `ed_${f.name}`, `${tag}: no label for ${f.name}`);
      const helper = ed._form.computeHelper(f);
      if (helper !== undefined) assert.notEqual(helper, `ed_${f.name}_helper`, `${tag}: no helper for ${f.name}`);
    }
    let out;
    ed.dispatchEvent = (e) => (out = e.detail.config);
    ed._form.listeners["value-changed"]({ detail: { value: { type: `custom:${tag}`, ...LAMP, kind: "auto", show_colors: true } } });
    assert.deepEqual(json(out), { type: `custom:${tag}`, ...LAMP });
  }
});

test("a Christmas tree on a switch: switched by a tap, its bulbs in many colours", () => {
  const hass = makeHass();
  hass.states["switch.christmas_tree"] = { entity_id: "switch.christmas_tree", state: "on", attributes: { friendly_name: "Christmas tree" }, last_changed: "" };
  const card = make("light-card", { entity: "switch.christmas_tree" }, hass);
  const m = card._items;
  assert.equal(m.kind, "tree");
  assert.equal(m.state, "on");
  assert.equal(m.parts[0].festive, true);
  assert.match(card.shadowRoot.innerHTML, /role="switch"/);
  assert.match(card.shadowRoot.innerHTML, /fill="#ff5a5f"/);
  click(card, ".pw");
  assert.deepEqual(json(hass.calls.at(-1)), ["homeassistant", "turn_off", { entity_id: "switch.christmas_tree" }]);
});

test("colour temperature from the keyboard: the steps add up and are sent once, when the keys rest", async () => {
  const hass = makeHass();
  const card = make("light-card", LAMP, hass);
  const bar = card._nodes[".ct"];
  bar.querySelector = () => fakeNode();
  const before = hass.calls.length;
  for (let i = 0; i < 3; i++) bar.listeners.keydown({ key: "ArrowRight", preventDefault() {} });
  assert.equal(hass.calls.length, before);
  await new Promise((r) => setTimeout(r, 450));
  assert.equal(hass.calls.length, before + 1);
  assert.deepEqual(json(hass.calls.at(-1)), ["light", "turn_on", { entity_id: "light.floor_lamp", color_temp_kelvin: 3450 }]);
});
