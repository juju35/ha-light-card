// Renders the light cards with mock lights and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/light.mjs
import { pair, shoot } from "./harness.mjs";
import { setup } from "./mock.mjs";

// Stills: animations: false keeps the twinkles and flames at a fixed moment, so a capture only changes when the card does.
const still = (file, s) => pair(file, { ...s, config: { animations: false, ...s.config } });
const scenes = ["floor", "pendants", "chandelier", "color", "tree", "desk", "strip", "garland", "off", "offline"].flatMap((scene) => still(scene, { scene }));
await shoot({
  prefix: "lc",
  tag: "light-card",
  shots: [...scenes, ...still("garden-night", { scene: "garden", night: true }), ...still("pendants-night", { scene: "pendants", night: true })],
  setup,
});
await shoot({
  prefix: "lc-mini",
  tag: "light-mini-card",
  shots: [...still("floor", { scene: "floor" }), ...still("tree", { scene: "tree", night: true }), ...still("zoom", { scene: "floor", open: ".zoom" })],
  setup,
});
