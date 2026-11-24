// ── Light ────────────────────────────────────────────────────────────────────
// A light is a `light` entity (its brightness, colour temperature, colour and effects), or a group of them (a light
// group, or `entities`), or a switch driving a lamp. Its fixture — a bulb, a pendant, a chandelier, a floor lamp, a
// garland… — is found from its name, else set with `kind`: it decides the illustration and its room.

// The fixtures, most specific first (a cluster of pendants is not one pendant, a Christmas tree's garland is a tree).
export const LC_KIND_NAMES = [
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
export const LC_KINDS = [...LC_KIND_NAMES.map(([k]) => k), "bulb"];
export const LC_HANGING = new Set(["bulb", "filament", "pendant", "cluster", "chandelier", "ceiling"]);
// Where each fixture is drawn.
export const LC_ROOM = { tree: "living", garland: "window", strip: "living", chandelier: "dining", cluster: "dining", pendant: "dining", ceiling: "living", floor: "living", desk: "desk", spot: "garden", filament: "dining", bulb: "living" };
export const lcKindOf = (text) => LC_KIND_NAMES.find(([, re]) => re.test(String(text || "").toLowerCase()))?.[0] || "bulb";

// A colour temperature (K) as RGB, after Tanner Helland's fit of the black body.
export const lcKelvin = (k) => {
  const t = Math.min(40000, Math.max(1000, k)) / 100;
  const c = (v) => Math.round(Math.min(255, Math.max(0, v)));
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [c(r), c(g), c(b)];
};
export const lcHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
// The light's own colour: its RGB, else its colour temperature, else a warm white.
export const lcColorOf = (st) => {
  const a = st?.attributes || {};
  if (a.color_mode && a.color_mode !== "color_temp" && Array.isArray(a.rgb_color)) return lcHex(a.rgb_color);
  if (a.color_temp_kelvin) return lcHex(lcKelvin(a.color_temp_kelvin));
  if (Array.isArray(a.rgb_color)) return lcHex(a.rgb_color);
  return "#ffc46b";
};
export const LC_COLOR_MODES = ["hs", "xy", "rgb", "rgbw", "rgbww"];
// What a light can do, from its supported colour modes (a light with no mode list is a plain switch).
export const lcCaps = (st) => {
  const modes = st?.attributes.supported_color_modes || [];
  return {
    dim: modes.some((m) => m !== "onoff"),
    ct: modes.includes("color_temp"),
    color: modes.some((m) => LC_COLOR_MODES.includes(m)),
    effects: Array.isArray(st?.attributes.effect_list) ? st.attributes.effect_list : [],
  };
};
// The lights of the home that are no group, most likely first: the ones that dim.
export const lcLights = (hass) => {
  const ids = Object.keys(hass.states || {}).filter((id) => id.startsWith("light.") && !hass.entities?.[id]?.hidden && !hass.entities?.[id]?.entity_category);
  const group = (id) => Array.isArray(hass.states[id].attributes.entity_id);
  return [...ids.filter((id) => !group(id) && lcCaps(hass.states[id]).dim), ...ids.filter((id) => !group(id) && !lcCaps(hass.states[id]).dim), ...ids.filter(group)];
};
