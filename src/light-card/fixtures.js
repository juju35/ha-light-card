// ── Fixtures ─────────────────────────────────────────────────────────────────
// Each fixture is drawn in a 100 × 100 box, hanging from its top (y = 0) or standing on its bottom (y = 100). `parts`:
// one { on, color, level } per light it shows (a cluster's pendants, a garland's bulbs take them in turn). Its glows
// carry the class `glow` and the variable --lv (the brightness, 0 to 1), so that the slider lights them up live.
import { LC_FESTIVE, LC_LOOP, lcMix } from "./core.js";

export const lcGlow = (cx, cy, r, i, uid, part) =>
  part.on ? `<circle class="glow" cx="${cx}" cy="${cy}" r="${r}" fill="url(#lg${uid}-${i})" style="--lv:${part.level.toFixed(2)}"/>` : "";
export const lcDefs = (parts, uid) =>
  `<defs>${parts
    .map(
      (p, i) =>
        `<radialGradient id="lg${uid}-${i}"><stop offset="0" stop-color="${p.color}" stop-opacity=".9"/><stop offset=".45" stop-color="${p.color}" stop-opacity=".35"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></radialGradient><linearGradient id="lc${uid}-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.color}" stop-opacity=".55"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></linearGradient>`,
    )
    .join("")}</defs>`;
// A twinkle: the opacity of an element going down and up once per loop, from its own phase.
export const lcTwinkle = (moving, phase) =>
  moving ? `<animate attributeName="opacity" values="1;.35;1" dur="${LC_LOOP}s" begin="${phase.toFixed(2)}s" repeatCount="indefinite"/>` : "";

export const lcFixture = (kind, { parts, uid, night, moving, framed = false }) => {
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
