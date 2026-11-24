// ── Editor ───────────────────────────────────────────────────────────────────
import { LightCard } from "./card.js";

export const lcSchema = (booleans) => (lang) => [
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

export const LC_HELPERS = ["entity", "entities", "title", "scenes", "colors", "zoom", "language"];

export const LightCardEditor = rcEditor({
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
