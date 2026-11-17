/**
 * light-card / light-mini-card: a light, illustrated by its fixture — a bulb, a pendant, a chandelier, a floor lamp,
 * a garland… — glowing in its own colour and brightness. The fixture is the brightness slider; the colour temperature,
 * the colours, the effects, the scenes and the lights of a group below it.
 * https://github.com/juju35/ha-light-card
 */

const LC_KIND_ICONS = {
  bulb: "mdi:lightbulb",
  filament: "mdi:lightbulb-on-outline",
  pendant: "mdi:ceiling-light",
  cluster: "mdi:ceiling-light-multiple",
  chandelier: "mdi:chandelier",
  ceiling: "mdi:ceiling-light",
  floor: "mdi:floor-lamp",
  desk: "mdi:desk-lamp",
  spot: "mdi:outdoor-lamp",
  tree: "mdi:pine-tree",
  garland: "mdi:string-lights",
  strip: "mdi:led-strip-variant",
};
// The colours of a garland or a tree that has no single colour (or plays an effect).
const LC_FESTIVE = ["#ff5a5f", "#ffd166", "#4cc9f0", "#b388ff", "#7bd389"];
const LC_SWATCHES = ["#ef5350", "#ffa726", "#ffee58", "#66bb6a", "#42a5f5", "#ab47bc"];
// One loop of the illustrations' animations (s): bulbs twinkle, flames flicker.
const LC_LOOP = 2.4;
// A brightness stepped from the keyboard goes out after this pause (ms).
const LC_SEND_MS = 400;

const lcClamp = (v, a, b) => Math.min(b, Math.max(a, v));
// `a` mixed with `b` (hex colours, p of a).
const lcMix = (a, b, p) => {
  const n = (h, i) => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) * p + n(b, i) * (1 - p)).toString(16).padStart(2, "0")).join("")}`;
};
// A colour from the config: "#rrggbb", "#rgb" or [r, g, b].
const lcParse = (c) => {
  if (Array.isArray(c) && c.length === 3) return lcHex(c);
  if (typeof c !== "string") return null;
  const m = c.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
  return `#${h.toLowerCase()}`;
};
const lcRgb = (hex) => [0, 1, 2].map((i) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16));

// The status pill's place (the same rule on every ha-* card): beside the title when the whole title and the pill's
// whole label fit there, else under the subtitle, else its dot alone on the title row.
const lcPlacePill = (head, row, ground) => {
  if (!head) return;
  head.removeAttribute("data-wrap");
  head.removeAttribute("data-dot");
  const pill = row.querySelector(":scope > .bpill, :scope > .pill");
  const text = pill?.querySelector(".bpt, .pt");
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  const name = row.querySelector(".title");
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const title = name ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute("data-wrap", "");
  const box = row.parentElement.getBoundingClientRect();
  const frame = head.getBoundingClientRect();
  const out = ground && (box.bottom > ground.getBoundingClientRect().top + 0.5 || box.top < frame.top - 0.5);
  if (text.scrollWidth > text.clientWidth + 0.5 || out) {
    head.removeAttribute("data-wrap");
    head.setAttribute("data-dot", "");
  }
};

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Each fixture is drawn in a 100 × 100 box, hanging from its top (y = 0) or standing on its bottom (y = 100). `parts`:
// one { on, color, level } per light it shows (a cluster's pendants, a garland's bulbs take them in turn). Its glows
// carry the class `glow` and the variable --lv (the brightness, 0 to 1), so that the slider lights them up live.
const lcGlow = (cx, cy, r, i, uid, part) =>
  part.on ? `<circle class="glow" cx="${cx}" cy="${cy}" r="${r}" fill="url(#lg${uid}-${i})" style="--lv:${part.level.toFixed(2)}"/>` : "";
const lcDefs = (parts, uid) =>
  `<defs>${parts
    .map(
      (p, i) =>
        `<radialGradient id="lg${uid}-${i}"><stop offset="0" stop-color="${p.color}" stop-opacity=".9"/><stop offset=".45" stop-color="${p.color}" stop-opacity=".35"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></radialGradient><linearGradient id="lc${uid}-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.color}" stop-opacity=".55"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></linearGradient>`,
    )
    .join("")}</defs>`;
// A twinkle: the opacity of an element going down and up once per loop, from its own phase.
const lcTwinkle = (moving, phase) =>
  moving ? `<animate attributeName="opacity" values="1;.35;1" dur="${LC_LOOP}s" begin="${phase.toFixed(2)}s" repeatCount="indefinite"/>` : "";

const lcFixture = (kind, { parts, uid, night, moving, framed = false }) => {
  const p = (i) => parts[i % parts.length];
  const lit = (i, off = "#d9dde2") => (p(i).on ? p(i).color : off);
  const metal = night ? "#8c96a3" : "#6b6560";
  const shade = night ? "#2c2a28" : "#3f3a35";
  const cone = (i, d) => (p(i).on ? `<path class="glow" d="${d}" fill="url(#lc${uid}-${i})" style="--lv:${p(i).level.toFixed(2)}"/>` : "");
  switch (kind) {
    case "filament":
      return `${lcGlow(50, 62, 48, 0, uid, p(0))}<path d="M50 0V36" stroke="${metal}" stroke-width="1.6"/><rect x="44" y="34" width="12" height="10" rx="2" fill="#b08a4a"/>
        <circle cx="50" cy="62" r="17" fill="${p(0).on ? lcMix(p(0).color, "#ffffff", 0.35) : "#eef1f4"}" fill-opacity=".85" stroke="#c9b48a" stroke-width="1.4"/>
        <path d="M44 66l2-9 2 9 2-9 2 9 2-9 2 9" stroke="${p(0).on ? "#ffb347" : "#b9a07a"}" stroke-width="1.4" fill="none"/>`;
    case "pendant":
      return `${cone(0, "M28 52L6 100H94L72 52Z")}${lcGlow(50, 54, 30, 0, uid, p(0))}<path d="M50 0V30" stroke="${metal}" stroke-width="1.6"/>
        <path d="M24 52Q24 28 50 28Q76 28 76 52Z" fill="${shade}"/><ellipse cx="50" cy="52" rx="12" ry="4" fill="${lit(0)}"/>`;
    case "cluster":
      return [
        [24, 44, 0],
        [50, 62, 1],
        [76, 36, 2],
      ]
        .map(
          ([x, y, i]) =>
            `${lcGlow(x, y + 6, 22, i % parts.length, uid, p(i))}<path d="M${x} 0V${y - 8}" stroke="${metal}" stroke-width="1.4"/><path d="M${x - 11} ${y + 4}a11 11 0 0 1 22 0z" fill="${shade}"/><circle cx="${x}" cy="${y + 5}" r="5" fill="${lit(i)}"/>`,
        )
        .join("");
    case "chandelier": {
      const arms = [18, 34, 66, 82]
        .map((x) => `<path d="M50 32Q${x} 52 ${x} 42" stroke="${night ? "#b9a07a" : "#a8874f"}" stroke-width="2" fill="none"/>`)
        .join("");
      const candles = [18, 34, 50, 66, 82]
        .map((x, k) => {
          const y = x === 50 ? 26 : 34;
          const flame = p(0).on ? `<ellipse cx="${x}" cy="${y - 4}" rx="2.6" ry="4.2" fill="${lcMix(p(0).color, "#ffffff", 0.7)}">${lcTwinkle(moving, (k * LC_LOOP) / 5)}</ellipse>` : "";
          return `<rect x="${x - 2.5}" y="${y}" width="5" height="9" rx="1" fill="#f6f1e6"/>${flame}`;
        })
        .join("");
      const drops = [26, 42, 58, 74].map((x) => `<path d="M${x} 50l2 4-2 4-2-4z" fill="${p(0).on ? lcMix(p(0).color, "#ffffff", 0.5) : "#d9e2ea"}" opacity=".9"/>`).join("");
      return `${lcGlow(50, 36, 50, 0, uid, p(0))}<path d="M50 0V24" stroke="${metal}" stroke-width="2"/><circle cx="50" cy="30" r="5" fill="#a8874f"/>${arms}${candles}${drops}`;
    }
    case "ceiling":
      return `${cone(0, "M22 12L2 100H98L78 12Z")}${lcGlow(50, 14, 40, 0, uid, p(0))}<path d="M18 0h64v4q0 12-32 12T18 4z" fill="${night ? "#d5dbe1" : "#f6f7f9"}" stroke="#c9d1d8"/>
        <path d="M24 6q26 12 52 0" stroke="${lit(0, "#e3e7ec")}" stroke-width="3" fill="none"/>`;
    case "floor":
      return `${lcGlow(50, 24, 46, 0, uid, p(0))}<ellipse cx="50" cy="98" rx="14" ry="3" fill="${shade}"/><path d="M50 98V34" stroke="${shade}" stroke-width="2.6"/>
        <path d="M32 8h36l9 28H23z" fill="${p(0).on ? lcMix(p(0).color, "#fff8ec", 0.45) : "#f3ede2"}" stroke="#d9cbb5"/><path d="M28 34h44" stroke="${lit(0, "#d9cbb5")}" stroke-width="2"/>`;
    case "desk":
      return `${cone(0, "M70 56L56 100H100L94 54Z")}${lcGlow(78, 54, 30, 0, uid, p(0))}<ellipse cx="26" cy="98" rx="15" ry="3" fill="${shade}"/>
        <path d="M26 96L38 58L66 40" stroke="${shade}" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="38" cy="58" r="3.4" fill="${metal}"/>
        <path d="M62 34L88 46L80 60L56 46Z" fill="${shade}"/><path d="M70 56L86 52" stroke="${lit(0, "#59616b")}" stroke-width="3" stroke-linecap="round"/>`;
    case "spot":
      return `${cone(0, "M44 62L0 0H52L58 58Z")}${lcGlow(48, 60, 22, 0, uid, p(0))}<path d="M46 100V78h8v22" fill="${shade}"/>
        <rect x="38" y="58" width="22" height="14" rx="3" fill="${shade}" transform="rotate(-35 49 65)"/><ellipse cx="42" cy="58" rx="4" ry="7" fill="${lit(0, "#59616b")}" transform="rotate(-35 42 58)"/>
        <path d="M20 100q4-12 8 0M30 100q3-9 6 0M62 100q4-12 8 0M74 100q3-8 6 0" stroke="#5f9e55" stroke-width="2.4" fill="none"/>`;
    case "tree": {
      const spots = [
        [50, 18],
        [42, 34],
        [58, 38],
        [34, 54],
        [50, 50],
        [66, 56],
        [26, 74],
        [42, 70],
        [58, 74],
        [74, 70],
      ];
      const multi = parts.length > 1 || p(0).festive;
      const bulbs = spots
        .map(([x, y], k) => {
          const on = p(k).on;
          const c = multi ? LC_FESTIVE[k % LC_FESTIVE.length] : p(k).color;
          return `<circle cx="${x}" cy="${y}" r="3" fill="${on ? c : "#c9d1d8"}">${on ? lcTwinkle(moving, (k * LC_LOOP) / spots.length) : ""}</circle>`;
        })
        .join("");
      return `${lcGlow(50, 50, 50, 0, uid, p(0))}<path d="M50 6L74 40H64L84 64H72L92 84H8L28 64H16L36 40H26Z" fill="#2f7d4f" stroke="#256b42"/>
        <path d="M36 40q14 8 28 0M28 64q22 10 44 0" stroke="#e8c96a" stroke-width="1" fill="none" opacity=".7"/>${bulbs}
        <path d="M50 0l2.4 4.6h5l-4 3.4 1.6 5-5-3-5 3 1.6-5-4-3.4h5z" fill="${p(0).on ? "#ffc83d" : "#c9b48a"}"/><rect x="44" y="84" width="12" height="16" rx="2" fill="#a0522d"/>`;
    }
    case "garland": {
      const xs = [4, 15, 26, 37, 48, 59, 70, 81, 92];
      const y = (x) => 14 + 12 * Math.sin((x / 100) * Math.PI * 2) ** 2;
      const multi = parts.length > 1 || p(0).festive;
      const bulbs = xs
        .map((x, k) => {
          const on = p(k).on;
          const c = multi ? LC_FESTIVE[k % LC_FESTIVE.length] : p(k).color;
          const glow = on ? `<circle class="glow" cx="${x}" cy="${y(x) + 4}" r="9" fill="${c}" fill-opacity=".22" style="--lv:${p(k).level.toFixed(2)}"/>` : "";
          return `${glow}<path d="M${x} ${y(x)}v2" stroke="#4a4440" stroke-width="1.2"/><ellipse cx="${x}" cy="${y(x) + 5}" rx="2.6" ry="3.6" fill="${on ? c : "#c9d1d8"}">${on ? lcTwinkle(moving, (k * LC_LOOP) / xs.length) : ""}</ellipse>`;
        })
        .join("");
      // On its own (the big fixture, a group's tile), the garland hangs across a window; the banner has its own.
      const pane = night ? "#0d1a30" : "#cfe3f5";
      const win = framed ? `<rect x="2" y="6" width="96" height="90" rx="2" fill="${pane}" stroke="${night ? "#3a3632" : "#ffffff"}" stroke-width="3"/><path d="M50 6v90M2 51h96" stroke="${night ? "#3a3632" : "#ffffff"}" stroke-width="2"/>` : "";
      return `${win}<path d="${xs.map((x, k) => `${k ? "L" : "M"}${x} ${y(x).toFixed(1)}`).join("")}" stroke="#4a4440" stroke-width="1.2" fill="none"/>${bulbs}`;
    }
    case "strip":
      return `${p(0).on ? `<ellipse class="glow" cx="50" cy="64" rx="52" ry="26" fill="url(#lg${uid}-0)" style="--lv:${p(0).level.toFixed(2)}"/>` : ""}
        <rect x="6" y="70" width="88" height="7" rx="1" fill="${night ? "#5a4636" : "#b98a5e"}"/><rect x="9" y="77" width="82" height="2.4" rx="1.2" fill="${lit(0, "#9aa3ae")}"/>
        <rect x="16" y="56" width="20" height="14" rx="1" fill="${shade}"/><rect x="62" y="60" width="10" height="10" rx="5" fill="#7fb47a"/><path d="M67 60c-6-8-2-14 0-16 2 2 6 8 0 16z" fill="#6fae6a"/>`;
    default:
      return `${lcGlow(50, 62, 48, 0, uid, p(0))}<path d="M50 0V34" stroke="${metal}" stroke-width="1.6"/><rect x="44" y="34" width="12" height="9" rx="2" fill="${shade}"/>
        <path d="M45 43h10v3c7 3 11 9 11 16a16 16 0 1 1-32 0c0-7 4-13 11-16z" fill="${p(0).on ? lcMix(p(0).color, "#ffffff", 0.75) : "#eef1f4"}" stroke="#c9d1d8"/>
        ${p(0).on ? `<circle cx="50" cy="62" r="8" fill="#ffffff" opacity=".7"/>` : ""}`;
  }
};

// ── Rooms ────────────────────────────────────────────────────────────────────
// The banner's room, 200 × 80, drawn to its right edge; the fixture hangs from its ceiling or stands on its ground
// strip at x = 140. By night darker, the sky dark, and the light fills the room.
const LC_WALLS = {
  living: ["#f3ece2", "#272320"],
  dining: ["#efe6da", "#26221f"],
  desk: ["#eceef5", "#1d2333"],
  garden: ["#d6ebfa", "#132443"],
  window: ["#efe9e1", "#24211e"],
};
const lcRoom = (room, night) => {
  const wall = LC_WALLS[room][night ? 1 : 0];
  const pale = night ? "#3a3632" : "#ffffff";
  const sky = night ? "#0d1a30" : "#cfe3f5";
  const moon = night ? '<circle cx="34" cy="16" r="5" fill="#e9e4c9"/><circle cx="36.5" cy="14.5" r="5" fill="#0d1a30"/>' : '<circle cx="34" cy="16" r="4" fill="#ffd166"/>';
  const back = {
    living: `<rect x="8" y="6" width="38" height="46" rx="2" fill="${sky}" stroke="${pale}" stroke-width="3"/><path d="M27 6v46M8 29h38" stroke="${pale}" stroke-width="2"/>${moon}
      <rect x="54" y="52" width="40" height="22" rx="8" fill="${night ? "#4a5a50" : "#8fae9a"}"/><rect x="50" y="46" width="10" height="28" rx="5" fill="${night ? "#3f4d44" : "#7f9c8a"}"/>`,
    dining: `<rect x="10" y="10" width="30" height="24" rx="2" fill="${pale}" stroke="${night ? "#4a4540" : "#d9cbb5"}"/><path d="M14 30l7-9 5 5 4-3 6 7z" fill="${night ? "#5a5248" : "#d8c3a0"}"/>
      <rect x="106" y="58" width="68" height="4" rx="1" fill="${night ? "#5a4636" : "#b98a5e"}"/><path d="M112 62v18M168 62v18" stroke="${night ? "#5a4636" : "#a57650"}" stroke-width="3"/>
      <path d="M94 80V52h10v28M186 80V52h-10v28" stroke="${night ? "#4a3a2c" : "#c49a6c"}" stroke-width="3" fill="none"/>`,
    desk: `<rect x="12" y="8" width="34" height="26" rx="2" fill="${pale}" stroke="${night ? "#3a4256" : "#c4ccd3"}"/><path d="M16 30l9-11 6 6 5-4 7 9z" fill="${night ? "#4b5a78" : "#b9c6d8"}"/>
      <rect x="40" y="58" width="44" height="22" rx="2" fill="${night ? "#2a3040" : "#d5dbe6"}"/><rect x="44" y="62" width="36" height="14" rx="1" fill="${night ? "#1a2030" : "#eef1f6"}"/>`,
    garden: `${night ? [12, 40, 70, 96, 30, 58].map((x, i) => `<circle cx="${x}" cy="${6 + (i % 3) * 7}" r="1" fill="#fff" opacity=".8"/>`).join("") : '<circle cx="24" cy="14" r="7" fill="#ffd166"/>'}
      <path d="M0 80V56q20-16 40 0q16-14 34 0q12-10 26 2V80z" fill="${night ? "#1f3a2a" : "#7fb47a"}"/>
      <path d="M150 80V48h4v32M170 80V48h4v32M146 56h32M146 70h32" stroke="${night ? "#3a3530" : "#c49a6c"}" stroke-width="3"/>`,
    window: `<rect x="70" y="4" width="120" height="68" rx="2" fill="${sky}" stroke="${pale}" stroke-width="3"/><path d="M130 4v68M70 38h120" stroke="${pale}" stroke-width="2"/>
      ${night ? '<circle cx="176" cy="18" r="5" fill="#e9e4c9"/><circle cx="178.5" cy="16.5" r="5" fill="#0d1a30"/>' : '<circle cx="176" cy="18" r="4" fill="#ffd166"/>'}
      <rect x="8" y="58" width="22" height="22" rx="3" fill="${night ? "#6b4c3a" : "#d8b48a"}"/><path d="M19 58c-10-10-3-20 0-22 3 2 10 12 0 22z" fill="#7fb47a"/>`,
  }[room];
  return `<rect width="200" height="80" fill="${wall}"/>${back}`;
};

// The banner's scene: the room, the light filling it (by night, as much as the light gives), the fixture at x = 140.
const lcScene = ({ kind, parts, night, uid, animate, dx = 0 }) => {
  const room = LC_ROOM[kind] || "living";
  const on = parts.some((p) => p.on);
  const box = kind === "garland" ? `x="${70 - dx}" y="0" width="120" height="60"` : `x="${95 - dx}" y="0" width="90" height="80"`;
  const align = LC_HANGING.has(kind) || kind === "garland" ? "xMidYMin" : "xMidYMax";
  return `${lcRoom(room, night)}<svg ${box} viewBox="0 0 100 100" preserveAspectRatio="${align} meet" overflow="visible">${lcDefs(parts, uid)}${lcFixture(kind, { parts, uid, night, moving: animate && on })}</svg>`;
};

const lcIcon = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const LC_SVG = {
  power: '<path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0"/>',
  full: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  night: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  temp: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  scene: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lights: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
};

// ── Card ─────────────────────────────────────────────────────────────────────
class LightCard extends RcCard {
  static tag = "light-card";
  static i18n = LC_I18N;
  static defaults = { illustration: true, illustration_theme: "auto", kind: "auto", show_colors: true, show_effects: true, show_members: true, animations: true, show_controls: true };

  // The most likely light of the home: a light that dims.
  static getStubConfig(hass) {
    const entity = hass ? lcLights(hass)[0] : undefined;
    return entity ? { entity } : {};
  }

  getCardSize() {
    return 6;
  }

  _cols() {
    return 3;
  }

  _entityId() {
    const c = this._config;
    if (c.entity) return c.entity;
    if (c.entities?.length) return null;
    const h = this._hass;
    return rcMemo((this._memo ||= {}), "lights", [h.entities], () => lcLights(h))[0];
  }

  // A member of the group as a { id, name, on, level, color } for its tile and its part of the fixture.
  _member(id, group = "") {
    const h = this._hass;
    const st = h.states[id];
    const caps = lcCaps(st);
    const on = st?.state === "on";
    return {
      id,
      name: rcCleanName(st?.attributes.friendly_name || id, "", group ? `${group} ` : "", "") || st?.attributes.friendly_name || id,
      on,
      unavailable: !st || rcUnavailable(st),
      level: on ? (caps.dim && st.attributes.brightness != null ? st.attributes.brightness / 255 : 1) : 0,
      color: lcColorOf(st),
    };
  }

  // The light's state and what it can do.
  _collect() {
    const h = this._hass;
    const c = this._config;
    const id = this._entityId();
    const st = id ? h.states[id] : undefined;
    const listed = (c.entities || []).map((e) => (typeof e === "string" ? e : e?.entity)).filter((e) => h.states[e]);
    const groupIds = listed.length ? listed : Array.isArray(st?.attributes.entity_id) ? st.attributes.entity_id.filter((e) => h.states[e]) : [];
    const members = groupIds.map((e) => this._member(e, st?.attributes.friendly_name || c.title || ""));
    const lead = st || (listed[0] ? h.states[listed[0]] : undefined);
    const caps = lcCaps(lead);
    const dev = id && h.devices?.[h.entities?.[id]?.device_id];
    const name = c.title || st?.attributes.friendly_name || dev?.name || this._t("title");
    const kind = c.kind && c.kind !== "auto" && LC_KINDS.includes(c.kind) ? c.kind : lcKindOf([name, id, ...groupIds].filter(Boolean).join(" "));
    const on = st ? st.state === "on" : members.some((m) => m.on);
    const level = on ? (st && caps.dim && st.attributes.brightness != null ? st.attributes.brightness / 255 : members.length && !st ? Math.max(...members.filter((m) => m.on).map((m) => m.level)) : 1) : 0;
    const a = lead?.attributes || {};
    const effect = a.effect && !/^(none|off|solid|static)$/i.test(a.effect) ? a.effect : null;
    const color = lcColorOf(lead);
    // The parts of the fixture: the members when the fixture shows several lights, else the light itself.
    const many = members.length && ["cluster", "garland", "tree"].includes(kind);
    // A tree or a garland that plays an effect, or has no colour of its own (an on/off light, a switch), is multicoloured.
    const festive = (kind === "tree" || kind === "garland") && (!!effect || (!caps.color && !caps.ct));
    const parts = many ? members.map((m) => ({ on: m.on, color: m.color, level: m.level })) : [{ on, color, level, festive }];
    const area = h.areas?.[h.entities?.[id || listed[0]]?.area_id ?? dev?.area_id]?.name;
    const offline = st ? rcUnavailable(st) : listed.length ? members.every((m) => m.unavailable) : true;
    return {
      id: id || listed[0],
      none: !st && !listed.length,
      single: !!st && !listed.length,
      state: offline ? "offline" : on ? "on" : "off",
      domain: (id || listed[0] || "").split(".")[0],
      name,
      kind,
      sub: [area, this._t(`k_${kind}`)].filter(Boolean).join(" · "),
      raw: st ? h.formatEntityState?.(st) || st.state : "",
      caps,
      level,
      color,
      kelvin: a.color_mode === "color_temp" || (!a.color_mode && a.color_temp_kelvin) ? a.color_temp_kelvin : null,
      minK: a.min_color_temp_kelvin || 2000,
      maxK: a.max_color_temp_kelvin || 6500,
      colorMode: a.color_mode,
      effect,
      members,
      parts,
      lit: members.filter((m) => m.on).length,
    };
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._hass.states["sun.sun"]?.state === "below_horizon" || this._dark();
  }

  _animate() {
    if (this._config.animations === false) return false;
    try {
      return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }

  _id() {
    this._uid ||= Math.random().toString(36).slice(2, 8);
    return this._uid;
  }

  _icon(m) {
    if (m.state === "offline") return "mdi:lightbulb-off-outline";
    if (m.state === "off" && (m.kind === "bulb" || m.kind === "filament")) return "mdi:lightbulb-outline";
    return LC_KIND_ICONS[m.kind] || "mdi:lightbulb";
  }

  _pct(level) {
    return `${Math.round(level * 100)} %`;
  }

  // The status pill: On · 70 %, 2 of 3 on, Off, Offline.
  _status(m) {
    if (m.state === "offline") return this._t("st_offline");
    if (m.members.length) return m.lit ? this._t("group_on", { n: m.lit, t: m.members.length }) : this._t("st_off");
    if (m.state === "on") return m.caps.dim ? `${this._t("st_on")} · ${this._pct(m.level)}` : this._t("st_on");
    return this._t("st_off");
  }

  // The tone of the light: its effect, its colour temperature and white, or its colour.
  _tone(m) {
    if (m.state !== "on") return "";
    if (m.effect) return m.effect;
    if (m.kelvin) {
      const white = m.kelvin < 3300 ? "warm" : m.kelvin < 5000 ? "neutral" : "cool";
      return `${new Intl.NumberFormat(this._lang()).format(Math.round(m.kelvin / 100) * 100)} K · ${this._t(white)}`;
    }
    return m.caps.color ? this._t("color") : "";
  }

  _banner(m, sub, night, pill = "") {
    const c = this._config;
    const nav = c.navigation_path;
    const dx = this._addZoom && c.zoom ? 16 : 0;
    const room = LC_ROOM[m.kind] || "living";
    const chip = pill ? `<span class="bpill" title="${rcEsc(m.raw || pill)}" aria-label="${rcEsc(pill)}"><span class="bdot"></span><span class="bpt">${rcEsc(pill)}</span></span>` : "";
    const scene = m.none ? lcRoom(room, night) : lcScene({ kind: m.kind, parts: m.parts, night, uid: `b${this._id()}`, animate: this._animate(), dx });
    return `
      <div class="banner r-${room}${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}${m.sub ? ` title="${rcEsc(m.sub)}"` : ""}>
          <div class="badge"><ha-icon icon="${this._icon(m)}"></ha-icon></div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${chip}</div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice" role="img" aria-label="${rcEsc(`${m.name} · ${pill}`)}">${scene}</svg>
        <div class="ground"></div>
      </div>`;
  }

  _fitPill() {
    for (const row of this.shadowRoot?.querySelectorAll?.(".trow") || []) {
      const banner = row.closest(".banner");
      lcPlacePill(banner || row.closest(".head"), row, banner?.querySelector(".ground"));
    }
  }

  connectedCallback() {
    super.connectedCallback?.();
    if (typeof ResizeObserver !== "function") return;
    this._resize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._fitWidth) return;
      this._fitWidth = w;
      cancelAnimationFrame(this._fitFrame);
      this._fitFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._resize.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
    clearTimeout(this._sendTimer);
  }

  // The fixture, big: the brightness slider. Drag it up and down (or ↑ / ↓), tap it to switch the light.
  _fixture(m) {
    const dim = m.caps.dim && m.state !== "offline";
    const pct = Math.round(m.level * 100);
    const label = `${m.name} · ${this._t("brightness")}`;
    const rail = dim ? `<span class="rail" aria-hidden="true"><span class="fill" style="height:${pct}%"></span><span class="knob" style="bottom:${pct}%"></span></span>` : "";
    const attrs = dim
      ? `role="slider" aria-label="${rcEsc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${rcEsc(m.state === "on" ? `${pct} %` : this._t("st_off"))}"`
      : `role="switch" aria-label="${rcEsc(m.name)}" aria-checked="${m.state === "on"}"`;
    const align = LC_HANGING.has(m.kind) || m.kind === "garland" ? "xMidYMin" : "xMidYMax";
    return `<div class="fx${dim ? " dim" : ""}" tabindex="0" ${attrs}>
        <svg class="big" viewBox="-6 -4 112 112" preserveAspectRatio="${align} meet" aria-hidden="true">${lcDefs(m.parts, `f${this._id()}`)}${lcFixture(m.kind, { parts: m.parts, uid: `f${this._id()}`, night: this._dark(), moving: this._animate() && m.state === "on", framed: true })}</svg>
        ${rail}
      </div>`;
  }

  // The side of the fixture: the brightness in big, the tone, the power button and two presets.
  _side(m) {
    const c = this._config;
    const on = m.state === "on";
    const big = m.state === "offline" ? ["—", ""] : m.caps.dim ? (on ? [String(Math.round(m.level * 100)), "%"] : ["0", "%"]) : [this._t(on ? "st_on" : "st_off"), ""];
    const tone = this._tone(m);
    const ctl = c.show_controls !== false && m.state !== "offline";
    const power = ctl
      ? `<button class="pw${on ? " on" : ""}" data-k="power" aria-pressed="${on}" aria-label="${rcEsc(this._t(on ? "turn_off" : "turn_on"))}" title="${rcEsc(this._t(on ? "turn_off" : "turn_on"))}">${lcIcon(LC_SVG.power)}</button>`
      : "";
    const presets =
      ctl && m.caps.dim
        ? `<button class="gb${on && m.level > 0.98 ? " on" : ""}" data-k="full">${lcIcon(LC_SVG.full)}<span>${rcEsc(this._t("full"))}</span></button><button class="gb${on && m.level <= 0.12 ? " on" : ""}" data-k="night">${lcIcon(LC_SVG.night)}<span>${rcEsc(this._t("night"))}</span></button>`
        : "";
    return `<div class="side">
        <button class="rv" title="${rcEsc(m.raw || this._status(m))}"><span class="big">${rcEsc(big[0])}</span><span class="u">${rcEsc(big[1])}</span></button>
        ${tone ? `<div class="tone"><span class="sw0" style="background:${m.color}"></span><span>${rcEsc(tone)}</span></div>` : ""}
        <div class="acts">${power}${presets}</div>
      </div>`;
  }

  // Colour temperature, white tones and colours, effects, scenes.
  _below(m) {
    const c = this._config;
    if (c.show_controls === false || m.state === "offline") return "";
    const out = [];
    if (c.show_colors !== false && m.caps.ct) {
      const k = m.kelvin ?? (m.minK + m.maxK) / 2;
      const at = lcClamp((k - m.minK) / (m.maxK - m.minK || 1), 0, 1) * 100;
      const stops = [0, 0.25, 0.5, 0.75, 1].map((f) => `${lcHex(lcKelvin(m.minK + f * (m.maxK - m.minK)))} ${f * 100}%`).join(", ");
      out.push(`<div class="sec"><div class="sh">${lcIcon(LC_SVG.temp)}<span>${rcEsc(this._t("color_temp"))}</span></div>
        <div class="ct" role="slider" tabindex="0" aria-label="${rcEsc(this._t("color_temp"))}" aria-valuemin="${m.minK}" aria-valuemax="${m.maxK}" aria-valuenow="${Math.round(k)}" style="background:linear-gradient(90deg, ${stops})"><span class="mk" style="left:${at.toFixed(1)}%;background:${lcHex(lcKelvin(k))}"></span></div>
        <div class="ctl2"><span>${new Intl.NumberFormat(this._lang()).format(m.minK)} K</span><span>${new Intl.NumberFormat(this._lang()).format(m.maxK)} K</span></div></div>`);
    }
    if (c.show_colors !== false && (m.caps.ct || m.caps.color)) {
      const whites = m.caps.ct
        ? [
            ["warm", 2700],
            ["neutral", 4000],
            ["cool", 6000],
          ].map(([key, k]) => {
            const kk = lcClamp(k, m.minK, m.maxK);
            const sel = m.state === "on" && m.kelvin && Math.abs(m.kelvin - kk) < 250;
            return `<button class="sw${sel ? " sel" : ""}" data-kelvin="${kk}" data-k="k${kk}" style="background:${lcHex(lcKelvin(kk))}" aria-label="${rcEsc(this._t(key))}" title="${rcEsc(this._t(key))}"></button>`;
          })
        : [];
      const favs = (Array.isArray(c.colors) ? c.colors.map(lcParse).filter(Boolean) : LC_SWATCHES).slice(0, 8);
      const colors = m.caps.color
        ? favs.map((hex) => {
            const sel = m.state === "on" && !m.kelvin && m.colorMode !== "color_temp" && m.color === hex;
            return `<button class="sw${sel ? " sel" : ""}" data-rgb="${hex}" data-k="c${hex.slice(1)}" style="background:${hex}" aria-label="${hex}" title="${hex}"></button>`;
          })
        : [];
      const more = `<button class="sw more" data-k="more" aria-label="${rcEsc(this._t("more"))}" title="${rcEsc(this._t("more"))}">${lcIcon(LC_SVG.plus)}</button>`;
      out.push(`<div class="sws">${[...whites, ...colors, more].join("")}</div>`);
    }
    const chips = [];
    if (c.show_effects !== false && m.caps.effects.length)
      for (const e of m.caps.effects.filter((x) => !/^(none|off)$/i.test(x)).slice(0, 8))
        chips.push(`<button class="chip${m.effect === e ? " on" : ""}" data-effect="${rcEsc(e)}" data-k="e-${rcEsc(e)}">${lcIcon(LC_SVG.sparkle)}<span>${rcEsc(e)}</span></button>`);
    for (const s of (c.scenes || []).map((x) => (typeof x === "string" ? x : x?.entity)).filter((x) => this._hass.states[x]))
      chips.push(`<button class="chip" data-scene="${rcEsc(s)}" data-k="s-${rcEsc(s)}">${lcIcon(LC_SVG.scene)}<span>${rcEsc(this._hass.states[s].attributes.friendly_name || s)}</span></button>`);
    if (chips.length) out.push(`<div class="chips">${chips.join("")}</div>`);
    return out.join("");
  }

  // The lights of a group, one tile each: their fixture lit or not, their name and brightness; a tap switches one.
  _memberTile(x, kind) {
    const k = kind === "cluster" ? "pendant" : kind === "garland" || kind === "tree" ? "bulb" : kind;
    const part = [{ on: x.on, color: x.color, level: x.level }];
    const uid = `m${this._id()}${x.id.replace(/\W/g, "")}`;
    const align = LC_HANGING.has(k) ? "xMidYMin" : "xMidYMax";
    return `<button class="mt${x.on ? " on" : ""}${x.unavailable ? " na" : ""}" data-member="${rcEsc(x.id)}" data-k="m-${rcEsc(x.id)}" title="${rcEsc(x.name)}">
        <svg viewBox="0 0 100 100" preserveAspectRatio="${align} meet" aria-hidden="true">${lcDefs(part, uid)}${lcFixture(k, { parts: part, uid, night: this._dark(), moving: false })}</svg>
        <span class="mn">${rcEsc(x.name)}</span><span class="ms">${rcEsc(x.unavailable ? this._t("st_offline") : x.on ? this._pct(x.level) : this._t("st_off"))}</span></button>`;
  }

  _draw(m) {
    const c = this._config;
    const banner = c.illustration !== false;
    const night = banner && this._night();
    const status = m.none ? "" : this._status(m);
    const parts = [m.none, m.state, m.kind, m.name, m.sub, m.level, m.color, m.kelvin, m.effect, m.members, m.parts, m.caps, banner, night, this._dark(), this._lang()];
    if (!this._changed(parts)) return;
    const sub = m.sub ? `<div class="subt">${rcEsc(m.sub)}</div>` : "";
    const head = banner
      ? this._banner(m, sub, night, status)
      : `
      <div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="${this._icon(m)}"></ha-icon></div>
        <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${m.none ? "" : `<span class="pill" title="${rcEsc(m.raw || status)}" aria-label="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></span>`}</div>${sub}</div>
      </div>`;
    if (m.none) {
      this._paint("off", `${head}<div class="none">${rcEsc(this._t("no_light"))}</div>`, "");
      this._fitPill();
      return;
    }
    const main = `<div class="main">${this._fixture(m)}${this._side(m)}</div>${this._below(m)}`;
    const members =
      c.show_members !== false && m.members.length
        ? `<div class="sh mh">${lcIcon(LC_SVG.lights)}<span>${rcEsc(this._t("lights"))}</span></div>${m.members.map((x) => this._memberTile(x, m.kind)).join("")}`
        : "";
    this._paint(m.state, head + main, members);
    this._fitPill();
  }

  // ── Actions ──
  _call(service, data = {}) {
    const m = this._items;
    const ids = m.single ? [m.id] : m.members.map((x) => x.id);
    if (m.domain !== "light" && service === "turn_on" && Object.keys(data).length) return;
    const domain = m.domain === "light" ? "light" : "homeassistant";
    rcCall(this._hass, domain, service, { entity_id: ids.length === 1 ? ids[0] : ids, ...data });
  }

  // The brightness from the slider: shown at once (rail, number, glows), sent when released.
  _preview(root, level) {
    const pct = Math.round(level * 100);
    const fx = root.querySelector(".fx");
    fx?.setAttribute("aria-valuenow", String(pct));
    const fill = root.querySelector(".rail .fill");
    const knob = root.querySelector(".rail .knob");
    if (fill) fill.style.height = `${pct}%`;
    if (knob) knob.style.bottom = `${pct}%`;
    const big = root.querySelector(".side .big");
    if (big) big.textContent = String(pct);
    for (const g of root.querySelectorAll(".fx .glow")) g.style.setProperty("--lv", String(level));
  }

  _bindFixture(root) {
    const m = this._items;
    const fx = root.querySelector(".fx");
    if (!fx || m.state === "offline") return;
    const dim = m.caps.dim;
    const levelAt = (y) => {
      const r = fx.getBoundingClientRect();
      return lcClamp(1 - (y - r.top - 10) / Math.max(1, r.height - 20), 0.01, 1);
    };
    let start = null;
    let level = null;
    fx.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      start = { y: ev.clientY };
      level = null;
      this._pressing = true;
    });
    fx.addEventListener("pointermove", (ev) => {
      if (!start || !dim) return;
      if (level == null && Math.abs(ev.clientY - start.y) < RC_MOVE_PX) return;
      if (level == null) {
        this._dragging = true;
        fx.setPointerCapture?.(ev.pointerId);
        fx.classList.add("dragging");
      }
      level = levelAt(ev.clientY);
      this._preview(root, level);
    });
    const end = (ev, cancelled) => {
      if (!start) return;
      const dragged = level != null;
      start = null;
      this._dragging = false;
      fx.classList.remove("dragging");
      if (dragged && !cancelled) this._call("turn_on", { brightness_pct: Math.round(level * 100) });
      else if (!dragged && !cancelled) this._call("toggle");
      this._sig = null;
      this._released(!dragged);
      ev?.stopPropagation?.();
    };
    fx.addEventListener("pointerup", (ev) => end(ev, false));
    fx.addEventListener("pointercancel", (ev) => end(ev, true));
    fx.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (!ev.repeat) this._call("toggle");
        return;
      }
      const step = { ArrowUp: 10, ArrowRight: 10, ArrowDown: -10, ArrowLeft: -10 }[ev.key];
      if (!step || !dim) return;
      ev.preventDefault();
      const from = this._asked ?? (m.state === "on" ? m.level : 0);
      this._asked = lcClamp(Math.round((from + step / 100) * 10) / 10, 0.1, 1);
      this._preview(root, this._asked);
      clearTimeout(this._sendTimer);
      this._sendTimer = setTimeout(() => {
        this._call("turn_on", { brightness_pct: Math.round(this._asked * 100) });
        this._asked = null;
      }, LC_SEND_MS);
    });
  }

  _bindCt(root) {
    const m = this._items;
    const bar = root.querySelector(".ct");
    if (!bar) return;
    const kAt = (x) => {
      const r = bar.getBoundingClientRect();
      return Math.round(m.minK + lcClamp((x - r.left) / Math.max(1, r.width), 0, 1) * (m.maxK - m.minK));
    };
    const show = (k) => {
      const mk = bar.querySelector(".mk");
      if (!mk) return;
      mk.style.left = `${(((k - m.minK) / (m.maxK - m.minK || 1)) * 100).toFixed(1)}%`;
      mk.style.background = lcHex(lcKelvin(k));
    };
    let k = null;
    bar.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      this._dragging = true;
      bar.setPointerCapture?.(ev.pointerId);
      k = kAt(ev.clientX);
      show(k);
    });
    bar.addEventListener("pointermove", (ev) => {
      if (k == null) return;
      k = kAt(ev.clientX);
      show(k);
    });
    const end = (cancelled) => {
      if (k == null) return;
      if (!cancelled) this._call("turn_on", { color_temp_kelvin: k });
      k = null;
      this._dragging = false;
      this._sig = null;
      this._released(false);
    };
    bar.addEventListener("pointerup", () => end(false));
    bar.addEventListener("pointercancel", () => end(true));
    bar.addEventListener("keydown", (ev) => {
      const step = { ArrowRight: 250, ArrowUp: 250, ArrowLeft: -250, ArrowDown: -250 }[ev.key];
      if (!step) return;
      ev.preventDefault();
      const kk = lcClamp((m.kelvin ?? (m.minK + m.maxK) / 2) + step, m.minK, m.maxK);
      show(kk);
      this._call("turn_on", { color_temp_kelvin: Math.round(kk) });
    });
  }

  _bindAfter(root) {
    const m = this._items;
    if (!m || m.none) return;
    const on = (sel, fn) =>
      root.querySelector(sel)?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        fn(ev);
      });
    root.querySelector(".rv")?.addEventListener("click", () => rcMoreInfo(this, m.id));
    on(".pw", () => this._call(m.state === "on" ? "turn_off" : "turn_on"));
    on('[data-k="full"]', () => this._call("turn_on", { brightness_pct: 100 }));
    on('[data-k="night"]', () => this._call("turn_on", { brightness_pct: 10 }));
    on('[data-k="more"]', () => rcMoreInfo(this, m.id));
    for (const b of root.querySelectorAll(".sw[data-kelvin]")) b.addEventListener("click", () => this._call("turn_on", { color_temp_kelvin: Number(b.dataset.kelvin) }));
    for (const b of root.querySelectorAll(".sw[data-rgb]")) b.addEventListener("click", () => this._call("turn_on", { rgb_color: lcRgb(b.dataset.rgb) }));
    for (const b of root.querySelectorAll(".chip[data-effect]")) b.addEventListener("click", () => this._call("turn_on", { effect: b.dataset.effect }));
    for (const b of root.querySelectorAll(".chip[data-scene]")) b.addEventListener("click", () => rcCall(this._hass, "scene", "turn_on", { entity_id: b.dataset.scene }));
    for (const b of root.querySelectorAll(".mt")) {
      this._bindPress(b, {
        onTap: () => rcCall(this._hass, "homeassistant", "toggle", { entity_id: b.dataset.member }),
        onHold: () => rcMoreInfo(this, b.dataset.member),
      });
    }
    this._bindFixture(root);
    this._bindCt(root);
  }

  static styles = `
    ha-card.lvl-on { --c: #f59f00; }
    ha-card.lvl-off, ha-card.lvl-offline { --c: var(--rc-idle); }
    .tt { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
    .tt .title { flex: none; }
    .subt { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host([hide-title]) .head .tt { visibility: hidden; }
    .none { margin-top: 10px; padding: 12px; border-radius: 12px; font-size: 13px; color: var(--secondary-text-color);
            background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    /* The fixture, big, beside its readings: the fixture is the brightness slider (its rail at the right). */
    .main { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
    .fx { position: relative; flex: none; width: 150px; height: 176px; border-radius: 16px; box-sizing: border-box; padding: 8px 22px 8px 6px;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; }
    .fx:not(.dim) { touch-action: auto; }
    .fx:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .fx .big { display: block; width: 100%; height: 100%; overflow: visible; }
    .fx .glow, .room .glow { opacity: calc(.25 + .75 * var(--lv, 1)); transition: opacity .15s; }
    .fx.dragging .glow { transition: none; }
    .rail { position: absolute; right: 8px; top: 12px; bottom: 12px; width: 8px; border-radius: 4px; background: color-mix(in srgb, var(--primary-text-color) 12%, transparent); }
    .rail .fill { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 4px; background: var(--c); }
    .rail .knob { position: absolute; left: 50%; width: 20px; height: 20px; margin: 0 0 -10px -10px; border-radius: 50%; box-sizing: border-box;
                  background: var(--card-background-color, #fff); border: 3px solid var(--c); }
    .lvl-off .rail .fill, .lvl-offline .rail .fill { background: var(--rc-idle); }
    .side { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
    .rv { all: unset; cursor: pointer; display: flex; align-items: baseline; gap: 4px; border-radius: 10px; }
    .rv:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .big { font-size: 40px; font-weight: 300; line-height: 1; color: var(--primary-text-color); }
    .u { font-size: 16px; color: var(--secondary-text-color); }
    .tone { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 14px; font-weight: 500;
            color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color, #212121)); }
    .tone span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sw0 { flex: none; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0,0,0,.12); }
    .acts { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .pw, .gb, .sw, .chip, .mt { all: unset; box-sizing: border-box; cursor: pointer; }
    .pw { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; color: var(--secondary-text-color);
          background: var(--secondary-background-color, rgba(127,127,127,.12)); }
    .pw.on { color: color-mix(in srgb, var(--c) 75%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--c) 18%, transparent); }
    .pw:hover { background: color-mix(in srgb, var(--c) 26%, transparent); }
    .pw svg { width: 24px; height: 24px; }
    .gb { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 500;
          color: var(--primary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .gb.on { color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--c) 16%, transparent); }
    .gb svg { width: 16px; height: 16px; }
    .pw:focus-visible, .gb:focus-visible, .sw:focus-visible, .chip:focus-visible, .mt:focus-visible, .ct:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    /* A narrow card: the fixture smaller, the presets under it. */
    @container (max-width: 330px) { .fx { width: 118px; height: 150px; } .big { font-size: 32px; } .gb span { display: none; } .gb { padding: 0 10px; } }
    .sec { margin-top: 12px; }
    .sh { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; color: var(--secondary-text-color); }
    .sh svg { width: 15px; height: 15px; flex: none; }
    .ct { position: relative; height: 16px; margin: 8px 10px 0; border-radius: 8px; cursor: pointer; touch-action: none; }
    .ct .mk { position: absolute; top: -3px; width: 22px; height: 22px; margin-left: -11px; border-radius: 50%; box-sizing: border-box;
              border: 3px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .ctl2 { display: flex; justify-content: space-between; margin: 4px 0 0; font-size: 11px; color: var(--secondary-text-color); }
    .sws { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .sw { width: 32px; height: 32px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); border: 2px solid var(--card-background-color, #fff); }
    .sw.sel { box-shadow: 0 0 0 2px var(--c); }
    .sw.more { display: grid; place-items: center; color: var(--secondary-text-color);
               background: conic-gradient(#ef5350, #ffca28, #66bb6a, #42a5f5, #ab47bc, #ef5350); }
    .sw.more svg { width: 16px; height: 16px; color: #fff; filter: drop-shadow(0 0 1px rgba(0,0,0,.6)); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; max-width: 100%; padding: 0 12px; border-radius: 16px; font-size: 13px;
            color: var(--primary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .chip.on { color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--c) 16%, transparent); }
    .chip svg { width: 14px; height: 14px; flex: none; }
    .chip span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* The lights of a group: their fixture, name and brightness. */
    .grid { margin-top: 8px; gap: 8px; }
    .mh { grid-column: 1 / -1; margin-top: 6px; }
    .mt { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 6px 10px; border-radius: 12px;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); touch-action: pan-y; user-select: none; -webkit-user-select: none; }
    .mt svg { width: 40px; height: 40px; overflow: visible; }
    .mn { max-width: 100%; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ms { font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
    .mt.on .ms { color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color, #212121)); }
    .mt.na { opacity: .6; }
    /* Illustrated header (banner): 90 px, the title on the room's wall, the fixture at the right, a 10 px ground strip. */
    .banner { position: relative; display: flex; height: 90px; margin: -12px -12px 0; overflow: hidden; background: #f3ece2;
              --bt: #0d2a45; --bs: #3b5b78; --ic: color-mix(in srgb, var(--c) 85%, #10283f); --sw: min(200px, 56%); --gr: #b98a5e; --gl: #d4ab82; }
    .banner.r-dining { background: #efe6da; }
    .banner.r-desk { background: #eceef5; --gr: #8d6748; --gl: #b08560; }
    .banner.r-garden { background: #d6ebfa; --gr: #7fb35c; --gl: #9ccc78; }
    .banner.r-window { background: #efe9e1; }
    .banner.night { background: #272320; --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); --gr: #4f3a28; --gl: #634a34; }
    .banner.night.r-dining { background: #26221f; }
    .banner.night.r-desk { background: #1d2333; --gr: #4a3626; --gl: #5d4632; }
    .banner.night.r-garden { background: #132443; --gr: #2f4a2a; --gl: #3d5c37; }
    .banner.night.r-window { background: #24211e; }
    .lvl-off .banner, .lvl-offline .banner { --ic: #6b7680; }
    .lvl-off .banner.night, .lvl-offline .banner.night { --ic: #a7b0b8; }
    .banner .head { position: relative; z-index: 1; flex: 1; min-width: 0; height: 80px; box-sizing: border-box;
                    padding: 0 calc(var(--sw) + 4px) 0 14px; flex-wrap: nowrap; }
    .banner .head::after { content: none; }
    .banner .badge { position: relative; color: var(--ic); background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(13,42,69,.12); }
    .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
    .banner .title { color: var(--bt); }
    .banner .subt { color: var(--bs); font-size: 13px; }
    .banner .tt { min-width: 0; flex: 1 1 auto; }
    .banner .room { position: absolute; right: 0; bottom: 10px; width: var(--sw); height: calc(80px * var(--sk, 1)); }
    .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: var(--gr); box-shadow: inset 0 2px 0 var(--gl); }
    .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #33506b;
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
    .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
    .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
    .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .trow > .title { flex: 0 1 auto; min-width: 0; }
    .trow > .bpill, .trow > .pill { flex: none; max-width: none; }
    :host([hide-title]) .trow .title { visibility: hidden; }
    .head:has(.trow) { flex-wrap: nowrap; }
    .head:has(.trow)::after { content: none; }
    .bpill { display: inline-flex; align-items: center; gap: 4px; min-width: 0; box-sizing: border-box; overflow: hidden;
             white-space: nowrap; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px;
             background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
    .banner.night .bpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
    .bdot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
    .bpt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    [data-wrap] .trow { display: contents; }
    [data-wrap] .trow > .bpill, [data-wrap] .trow > .pill { order: 9; align-self: flex-start; max-width: 100%; margin-top: 3px; }
    .banner[data-wrap] .trow > .bpill { max-width: calc(100cqw - 80px); }
    [data-wrap] .subt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [data-dot] .bpill { padding: 0; background: none; }
    [data-dot] .bpt, [data-dot] .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    [data-dot] .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    [data-dot] .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    @container (max-width: 200px) {
      .bpill { padding: 0; background: none; }
      .bpt, .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
      .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    }
    ha-card.bn { padding: 0; }
    ha-card.bn > .banner { margin: 0; --sw: min(200px, 46%); }
    @container (max-width: 420px) { .banner, ha-card.bn > .banner { --sw: 150px; --sk: .75; } }
    @container (max-width: 340px) { .banner, ha-card.bn > .banner { --sw: 112px; --sk: .62; } }
    @container (max-width: 260px) { .banner, ha-card.bn > .banner { --sw: 70px; --sk: .5; } }
    .banner .rs { display: flex; flex-wrap: wrap; gap: 4px; height: 20px; margin: 3px 0 0 -2px; min-width: 0; overflow: hidden; }
    .banner .r { flex: none; line-height: 20px; padding: 0 7px; color: var(--bt); background: rgba(255,255,255,.62); }
    .banner .r.pill { color: color-mix(in srgb, var(--c) 60%, #10283f); background: rgba(255,255,255,.78); }
    .banner.night .r { background: rgba(10,20,40,.4); }
    .banner.night .r.pill { color: color-mix(in srgb, var(--c) 45%, #fff); background: rgba(10,20,40,.55); }
    @media (prefers-reduced-motion: reduce) { .fx .glow { transition: none; } }
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const lcSchema = (booleans) => (lang) => [
  { name: "entity", selector: { entity: { domain: ["light", "switch"] } } },
  { name: "entities", selector: { entity: { domain: "light", multiple: true } } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "kind", selector: { select: { mode: "dropdown", options: ["auto", ...LC_KINDS].map((value) => ({ value, label: rcT(LC_I18N, lang, `k_${value}`) })) } } },
  { name: "scenes", selector: { entity: { domain: "scene", multiple: true } } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(LC_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(LC_I18N, lang, "colors", "language"),
];

const LC_HELPERS = ["entity", "entities", "title", "scenes", "colors", "zoom", "language"];

const LightCardEditor = rcEditor({
  card: LightCard,
  helpers: LC_HELPERS,
  schema: lcSchema(["show_title", "illustration", "show_colors", "show_effects", "show_members", "animations", "show_controls"]),
});

rcRegister(
  LightCard,
  LightCardEditor,
  "Light Card",
  "A light illustrated by its fixture, glowing in its colour and brightness: the fixture is the slider; colour temperature, colours, effects, scenes and the lights of a group",
);

// ── Mini card ────────────────────────────────────────────────────────────────
// The light on its banner: the state as the status pill, the brightness and the tone as chips; the zoom button opens
// the full card in place.
class LightMiniCard extends rcMini(LightCard, "light-mini-card", ".r { --t: var(--c); } .r.dim { --t: var(--rc-idle); }") {
  getCardSize() {
    return this._zoomed ? super.getCardSize() : 1;
  }

  _drawMini(m) {
    const banner = this._config.illustration !== false;
    const night = banner && this._night();
    if (!this._changed(["mini", m.state, m.level, m.color, m.kelvin, m.effect, m.parts, m.kind, m.name, m.sub, banner, night, this._dark()])) return;
    const chip = (text, dim) => `<button class="r pill${dim ? " dim" : ""}" data-id="${rcEsc(m.id || "")}" title="${rcEsc(text)}"><span>${rcEsc(text)}</span></button>`;
    const rest = m.state === "on" ? [m.members.length && m.caps.dim ? this._pct(m.level) : null, this._tone(m) || null].filter(Boolean) : [];
    const status = m.none ? "" : this._status(m);
    if (banner) {
      const c = this._config;
      this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${m.state} bn">${this._banner(m, rest.length ? `<div class="rs">${rest.map((t) => chip(t, true)).join("")}</div>` : m.sub ? `<div class="subt">${rcEsc(m.sub)}</div>` : "", night, status)}</ha-card>`;
      const root = this.shadowRoot;
      if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
      this._fitPill();
      return;
    }
    const chips = [status, ...rest].map((t, i) => chip(t, i > 0)).join("");
    this._paintMini({ level: m.state, icon: this._icon(m), status: "", chips });
    const title = this.shadowRoot.querySelector(".mini .title");
    if (title) title.textContent = m.name;
  }
}

const LightMiniCardEditor = rcEditor({
  card: LightMiniCard,
  helpers: LC_HELPERS,
  schema: lcSchema(["show_title", "illustration", "show_colors", "show_effects", "show_members", "animations", "show_controls", "zoom"]),
});

rcRegister(
  LightMiniCard,
  LightMiniCardEditor,
  "Light Mini Card",
  "The light on its illustrated banner: its state, brightness and tone, with a zoom to the full card",
);
