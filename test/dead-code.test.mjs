// The room cards' shared translations (RC_I18N in the bundled card source (test/source.mjs), which came from ha-room-card) hold only what this card
// asks for and its own table lacks: the room cards' other labels (sensors, rooms, layouts, sorting…) are left out of
// the bundle.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { load } from "./load.mjs";
import { sources } from "./source.mjs";

const [shared, card] = ["shared", "light-card"].map((f) => (sources[`${f}.js`] ?? readFileSync(new URL(`../src/${f}.js`, import.meta.url), "utf8")));

test("the shared translations hold only what the card asks for and its own table lacks", () => {
  const { RC_I18N, LC_I18N } = load();
  const start = shared.indexOf("const RC_I18N = {");
  const code = shared.slice(0, start) + shared.slice(shared.indexOf("\n};\n", start)) + card;
  const quoted = new Set([...code.matchAll(/["'`]([A-Za-z_][\w-]*)["'`]/g)].map((m) => m[1]));
  const plural = [...code.matchAll(/_tn\(\s*["'`](\w+)["'`]/g)].map((m) => m[1]);
  // Literal keys, editor labels / helpers built from a field name (ed_<name>[_helper]), plural forms of a _tn base.
  const requested = (k) =>
    quoted.has(k) || (k.startsWith("ed_") && quoted.has(k.slice(3).replace(/_helper$/, ""))) || plural.some((b) => k.startsWith(`${b}_`));
  const extra = [];
  for (const [lang, table] of Object.entries(RC_I18N))
    for (const k of Object.keys(table)) if (!requested(k) || k in (LC_I18N[lang] ?? {})) extra.push(`${lang}.${k}`);
  assert.deepEqual(extra, []);
});
