/**
 * light-card / light-mini-card: a light, illustrated by its fixture — a bulb, a pendant, a chandelier, a floor lamp,
 * a garland… — glowing in its own colour and brightness. The fixture is the brightness slider; the colour temperature,
 * the colours, the effects, the scenes and the lights of a group below it.
 * https://github.com/juju35/ha-light-card
 */

export const LC_KIND_ICONS = {
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
export const LC_FESTIVE = ["#ff5a5f", "#ffd166", "#4cc9f0", "#b388ff", "#7bd389"];
export const LC_SWATCHES = ["#ef5350", "#ffa726", "#ffee58", "#66bb6a", "#42a5f5", "#ab47bc"];
// One loop of the illustrations' animations (s): bulbs twinkle, flames flicker.
export const LC_LOOP = 2.4;
// A brightness stepped from the keyboard goes out after this pause (ms).
export const LC_SEND_MS = 400;

export const lcClamp = (v, a, b) => Math.min(b, Math.max(a, v));
// `a` mixed with `b` (hex colours, p of a).
export const lcMix = (a, b, p) => {
  const n = (h, i) => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) * p + n(b, i) * (1 - p)).toString(16).padStart(2, "0")).join("")}`;
};
// A colour from the config: "#rrggbb", "#rgb" or [r, g, b].
export const lcParse = (c) => {
  if (Array.isArray(c) && c.length === 3) return lcHex(c);
  if (typeof c !== "string") return null;
  const m = c.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
  return `#${h.toLowerCase()}`;
};
export const lcRgb = (hex) => [0, 1, 2].map((i) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16));

// The status pill's place (the same rule on every ha-* card): beside the title when the whole title and the pill's
// whole label fit there, else under the subtitle, else its dot alone on the title row.
export const lcPlacePill = (head, row, ground) => {
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
