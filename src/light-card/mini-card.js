// ── Mini card ────────────────────────────────────────────────────────────────
// The light on its banner: the state as the status pill, the brightness and the tone as chips; the zoom button opens
// the full card in place.
import { LightCard } from "./card.js";
import { LC_HELPERS, lcSchema } from "./editor.js";

export class LightMiniCard extends rcMini(
  LightCard,
  "light-mini-card",
  `.r { --t: var(--c); } .r.dim { --t: var(--rc-idle); }
  .tap { cursor: pointer; touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }`,
) {
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
      this._bindToggle(root.querySelector(c.navigation_path ? ".banner .badge" : ".banner"), m);
      this._fitPill();
      return;
    }
    const chips = [status, ...rest].map((t, i) => chip(t, i > 0)).join("");
    this._paintMini({ level: m.state, icon: this._icon(m), status: "", chips });
    const title = this.shadowRoot.querySelector(".mini .title");
    if (title) title.textContent = m.name;
    this._bindToggle(this.shadowRoot.querySelector(this._config.navigation_path ? ".mini .badge" : ".mini"), m);
  }

  // A tap on the compact view switches the light, a hold opens its dialog, like the full card's fixture; its buttons
  // (the tone chip, the zoom) keep their own click. With `navigation_path` the header opens the path, so only the
  // badge switches the light (its click does not reach the header).
  _bindToggle(zone, m) {
    if (!zone || m.none || m.state === "offline") return;
    zone.classList.add("tap");
    zone.setAttribute("role", "switch");
    zone.setAttribute("tabindex", "0");
    zone.setAttribute("aria-checked", String(m.state === "on"));
    zone.setAttribute("aria-label", m.name);
    if (this._config.navigation_path) zone.addEventListener("click", (ev) => ev.stopPropagation());
    this._bindPress(zone, {
      onTap: () => this._call("toggle"),
      onHold: () => rcMoreInfo(this, m.id),
      skip: (ev) => ev.target !== zone && !!ev.target.closest?.("button"),
    });
  }
}

export const LightMiniCardEditor = rcEditor({
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
