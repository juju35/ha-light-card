// ── Card ─────────────────────────────────────────────────────────────────────
import { LC_KIND_ICONS, LC_SEND_MS, LC_SWATCHES, lcClamp, lcParse, lcPlacePill, lcRgb } from "./core.js";
import { lcDefs, lcFixture } from "./fixtures.js";
import { LC_SVG, lcIcon, lcRoom, lcScene } from "./rooms.js";

export class LightCard extends RcCard {
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

  // Night picture: forced by illustration_theme, else Home Assistant's dark theme alone (a light theme keeps the day
  // picture after sunset).
  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._dark();
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
    clearTimeout(this._ctTimer);
    this._asked = this._askedK = null;
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
      // Steps add up until the light answers, and are sent once the keys rest (one call, as for the brightness).
      const from = this._askedK ?? m.kelvin ?? (m.minK + m.maxK) / 2;
      this._askedK = lcClamp(from + step, m.minK, m.maxK);
      show(this._askedK);
      clearTimeout(this._ctTimer);
      this._ctTimer = setTimeout(() => {
        this._call("turn_on", { color_temp_kelvin: Math.round(this._askedK) });
        this._askedK = null;
      }, LC_SEND_MS);
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
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
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
