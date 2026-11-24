// ── Rooms ────────────────────────────────────────────────────────────────────
// The banner's room, 200 × 80, drawn to its right edge; the fixture hangs from its ceiling or stands on its ground
// strip at x = 140. By night darker, the sky dark, and the light fills the room.
import { lcDefs, lcFixture } from "./fixtures.js";

export const LC_WALLS = {
  living: ["#f3ece2", "#272320"],
  dining: ["#efe6da", "#26221f"],
  desk: ["#eceef5", "#1d2333"],
  garden: ["#d6ebfa", "#132443"],
  window: ["#efe9e1", "#24211e"],
};
export const lcRoom = (room, night) => {
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
export const lcScene = ({ kind, parts, night, uid, animate, dx = 0 }) => {
  const room = LC_ROOM[kind] || "living";
  const on = parts.some((p) => p.on);
  const box = kind === "garland" ? `x="${70 - dx}" y="0" width="120" height="60"` : `x="${95 - dx}" y="0" width="90" height="80"`;
  const align = LC_HANGING.has(kind) || kind === "garland" ? "xMidYMin" : "xMidYMax";
  return `${lcRoom(room, night)}<svg ${box} viewBox="0 0 100 100" preserveAspectRatio="${align} meet" overflow="visible">${lcDefs(parts, uid)}${lcFixture(kind, { parts, uid, night, moving: animate && on })}</svg>`;
};

export const lcIcon = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const LC_SVG = {
  power: '<path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0"/>',
  full: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  night: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  temp: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  scene: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lights: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
};
