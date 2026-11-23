# ha-light-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-light-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-light-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-light-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-light-card/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-light-card/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-light-card/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-light-card)](https://github.com/juju35/ha-light-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-light-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/icon.svg" alt="Light Card" width="120"></p>

<p align="center">
  <a href="https://www.philips-hue.com/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/hue.png" alt="Philips Hue" width="48"></a>&nbsp;&nbsp;
  <a href="https://www.home-assistant.io/integrations/zha/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/zha.png" alt="Zigbee Home Automation" width="48"></a>&nbsp;&nbsp;
  <a href="https://kno.wled.ge/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/wled.png" alt="WLED" width="48"></a>&nbsp;&nbsp;
  <a href="https://www.govee.com/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/govee.png" alt="Govee" width="48"></a>&nbsp;&nbsp;
  <a href="https://csa-iot.org/all-solutions/matter/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/matter.png" alt="Matter" width="48"></a>&nbsp;&nbsp;
  <a href="https://www.tp-link.com/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/tplink.png" alt="TP-Link" width="48"></a>&nbsp;&nbsp;
  <a href="https://www.shelly.com/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/shelly.png" alt="Shelly" width="48"></a>&nbsp;&nbsp;
  <a href="https://www.tuya.com/"><img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/tuya.png" alt="Tuya" width="48"></a>
</p>

An illustrated Lovelace card for Home Assistant's **lights**, drawn as their fixture — a bulb, a filament bulb, a pendant, a cluster of pendants, a chandelier, a ceiling light, a floor lamp, a desk lamp, a garden spotlight, a Christmas tree, a garland, an LED strip — glowing in their own colour and brightness. **The fixture is the slider**: drag it up and down to set the brightness, tap it to switch the light. Below it, the colour temperature, white tones and colours, effects, scenes, and the lights of a group, each with its own tile.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-light-card&category=plugin)

| Card | Type | What it shows |
|---|---|---|
| [Light](#light) | `custom:light-card` | The fixture illustrated and its slider, the brightness and tone, colour temperature, colours, effects, scenes and the lights of a group. |
| [Light mini](#light-mini) | `custom:light-mini-card` | The same light on its illustrated banner: the state and the tone, a zoom to the full card. |

| Floor lamp | Pendant cluster (group) | Christmas tree | Mini |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-floor.png" alt="Floor lamp" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-pendants.png" alt="Pendant cluster" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-tree.gif" alt="Christmas tree" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-mini-floor.png" alt="Mini" width="400"> |

The cards share the look of the other ha-* cards (illustrated header with a status pill, tinted tiles), a visual editor covering every option (the favourite colours as YAML in its folded **Advanced** section), labels in 22 languages following the Home Assistant language, light and dark themes, and come in a single Marketplace install with no dependency.

## Features

### Light

`custom:light-card` — The light of `entity` (the first light of the home that dims when none is set), a light group, or several lights listed in `entities` and shown as one.

- **The fixture is the slider**: drawn big, lit in the light's own colour (its RGB, else its colour temperature) and as bright as the light, with a rail and its knob at its right. Drag it up and down for the brightness (shown at once, sent when released), tap it to switch the light on or off; from the keyboard, ↑ / ↓ step by 10 % and Enter / Space switch. A light that does not dim (an on/off light, a lamp on a switch) is switched only
- **Beside it**: the brightness in big, the tone (*2,700 K · Warm white*, *Colour*, the effect playing), the power button and two presets, **Full** and **Night light** (10 %)
- **Colour temperature**: a slider over the light's own range, its gradient the colours of white from warm to cool (shown when the light has a colour temperature)
- **Colours**: warm, neutral and cool white (with a colour temperature), six colours or your own (`colors`, with colour), and a last swatch opening the light's dialog for any colour
- **Effects**: the light's own effects as chips (WLED, Hue, Govee, Tuya…), the playing one tinted
- **Scenes**: the scenes of `scenes` as chips, recalled with a tap
- **Groups**: a light group or `entities` show their lights as tiles — their fixture lit or not, their name and brightness — and a tap switches one (a hold opens its dialog); a cluster of pendants, a garland or a tree light up light by light
- **Illustrated header**: a 90 px banner with the fixture in its room — a living room, a dining room with its table, a desk, a garden, a window — on a ground strip; the name, the area and the state (*On · 70 %*, *2 of 3 on*) on the wall at the left, beside a round badge whose icon (the fixture's) takes the state's colour. The fixture glows in the light's colour; a tree's and a garland's bulbs twinkle while an effect plays (or with several colours), a chandelier's flames flicker. By night (with Home Assistant's dark theme; `illustration_theme: day | night` forces it) the room is dark and the light shines in it. `illustration: false` brings back the classic header
- `show_colors: false`, `show_effects: false`, `show_members: false` hide those parts; `show_controls: false` leaves the card read-only; `animations: false` stops the twinkles and flames (also when the system asks for reduced motion)

The fixture is found from the name (in any of the card's languages: *Floor lamp*, *Lampadaire*, *Lustre*, *Sapin de Noël*, *Stehlampe*…), else set with `kind`:

| `kind` | Fixture | Room |
|---|---|---|
| `bulb` | Bulb (a colour bulb glows in its colour) | Living room |
| `filament` | Filament bulb | Dining room |
| `pendant` | Pendant | Dining room |
| `cluster` | Cluster of pendants (a group lights them one by one) | Dining room |
| `chandelier` | Chandelier | Dining room |
| `ceiling` | Ceiling light | Living room |
| `floor` | Floor lamp | Living room |
| `desk` | Desk or bedside lamp | Desk |
| `spot` | Garden spotlight | Garden |
| `tree` | Christmas tree | Living room |
| `garland` | LED garland | Window |
| `strip` | LED strip | Living room |

### Light mini

`custom:light-mini-card` — The light on the same 90 px illustrated banner (two lines with `illustration: false`): the state as the status pill after the name, then the tone (*2,700 K · Warm white*, the effect) as a chip. **Tap** the banner to switch the light, **hold** it for its dialog (with `navigation_path`, the header opens the path and the badge switches the light). The **zoom** button (top right) opens the full card in place, a click anywhere else folds it back (`zoom: false` removes the button).

## Supported integrations

Any integration with `light` entities works: the card reads their brightness, colour modes, colour temperature range, colour and effects, as Home Assistant reports them. Among them:

| Integration | Lights |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/hue.png" alt="" width="16"> [Philips Hue](https://www.home-assistant.io/integrations/hue/) (built in) | Hue bulbs, filament bulbs, pendants, strips and outdoor spots |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/zha.png" alt="" width="16"> [Zigbee Home Automation](https://www.home-assistant.io/integrations/zha/) (built in) | IKEA, Innr, LIDL and other Zigbee lights |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/zigbee2mqtt.png" alt="" width="16"> [Zigbee2MQTT](https://www.zigbee2mqtt.io/guide/usage/integrations/home_assistant.html) (MQTT) | The same Zigbee lights |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/wled.png" alt="" width="16"> [WLED](https://www.home-assistant.io/integrations/wled/) (built in) | LED strips, garlands and trees, with their effects |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/govee.png" alt="" width="16"> [Govee](https://www.home-assistant.io/integrations/govee_light_local/) (built in) | Govee strips and lamps |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/matter.png" alt="" width="16"> [Matter](https://www.home-assistant.io/integrations/matter/) (built in) | Matter lights |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/tplink.png" alt="" width="16"> [TP-Link Smart Home](https://www.home-assistant.io/integrations/tplink/), <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/shelly.png" alt="" width="16"> [Shelly](https://www.home-assistant.io/integrations/shelly/), <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/tuya.png" alt="" width="16"> [Tuya](https://www.home-assistant.io/integrations/tuya/), <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/yeelight.png" alt="" width="16"> [Yeelight](https://www.home-assistant.io/integrations/yeelight/), <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/lifx.png" alt="" width="16"> [LIFX](https://www.home-assistant.io/integrations/lifx/), <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/nanoleaf.png" alt="" width="16"> [Nanoleaf](https://www.home-assistant.io/integrations/nanoleaf/) (built in) | Their lights |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/home_assistant.png" alt="" width="16"> [Group](https://www.home-assistant.io/integrations/group/) (built in) | Light groups, shown with their lights as tiles |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/images/home_assistant.png" alt="" width="16"> [Switch as X](https://www.home-assistant.io/integrations/switch_as_x/) (built in), or a `switch` | A lamp on a smart plug |

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-light-card&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-light-card` — Type: **Dashboard**
3. Open **Light Card** and click **Install**
4. Clear your browser cache and refresh

The Marketplace registers the dashboard resource for you.

### Manual

1. Download `ha-light-card.js` and the `ha-light-card.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-light-card/releases/latest)
2. Copy them all to `/config/www/` (without the translation files, the cards show in English)
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/ha-light-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

Every option is in the visual editor. In YAML:

```yaml
type: custom:light-card
entity: light.floor_lamp

# A light group, as a cluster of pendants, with two scenes
type: custom:light-card
entity: light.dining_pendants
kind: cluster
scenes:
  - scene.dinner
  - scene.relax

# Three lights shown as one
type: custom:light-card
title: Garden
kind: spot
entities:
  - light.garden_spot_1
  - light.garden_spot_2
  - light.garden_spot_3

# Your favourite colours
type: custom:light-card
entity: light.tv_strip
colors:
  - "#ff7a45"
  - "#7c4dff"
  - [0, 200, 180]

# On a phone dashboard
type: custom:light-mini-card
entity: light.christmas_tree
```

| Option | Card | Type | Default | Description |
|---|---|---|---|---|
| `entity` | both | string | the first light found | A light, a light group, or the switch of a lamp |
| `entities` | both | list | | Several lights shown as one (instead of `entity`), each with its tile |
| `title` | both | string | the light's name | Card title |
| `show_title` | both | boolean | `true` | Show the title |
| `navigation_path` | both | string | | A tap on the header opens this dashboard path |
| `kind` | both | string | `auto` | The fixture (see the table above); `auto` finds it from the name |
| `scenes` | both | list | | Scenes recalled from the card |
| `colors` | both | list | six colours | Advanced (YAML): favourite colours, as `#rrggbb` or `[r, g, b]` (up to 8) |
| `illustration` | both | boolean | `true` | The illustrated header (`false`: the classic header) |
| `illustration_theme` | both | string | `auto` | `auto` (follows the Home Assistant theme: night with a dark theme, day with a light theme), `day` or `night` |
| `show_colors` | both | boolean | `true` | Colour temperature, white tones and colours |
| `show_effects` | both | boolean | `true` | The light's effects |
| `show_members` | both | boolean | `true` | The lights of a group |
| `animations` | both | boolean | `true` | Twinkling bulbs and flickering flames |
| `show_controls` | both | boolean | `true` | Every control (the fixture then only shows the light) |
| `zoom` | mini | boolean | `true` | The zoom button |
| `language` | both | string | Home Assistant's | Advanced: one of the [languages](#translations) |

## Screenshots

| Floor lamp | Pendant cluster (a light group) | Chandelier |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-floor.png" alt="Floor lamp" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-pendants.png" alt="Pendant cluster (a light group)" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-chandelier.png" alt="Chandelier" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-floor-dark.png" alt="Floor lamp, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-pendants-dark.png" alt="Pendant cluster (a light group), dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-chandelier-dark.png" alt="Chandelier, dark" width="400"> |

| Colour bulb with effects | Christmas tree (effect) | Desk lamp |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-color.png" alt="Colour bulb with effects" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-tree.png" alt="Christmas tree (effect)" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-desk.png" alt="Desk lamp" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-color-dark.png" alt="Colour bulb with effects, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-tree-dark.png" alt="Christmas tree (effect), dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-desk-dark.png" alt="Desk lamp, dark" width="400"> |

| LED strip | Garland (on / off) | Off |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-strip.png" alt="LED strip" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-garland.png" alt="Garland (on / off)" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-off.png" alt="Off" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-strip-dark.png" alt="LED strip, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-garland-dark.png" alt="Garland (on / off), dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-off-dark.png" alt="Off, dark" width="400"> |

| Garden spotlight by night | Pendants by night | Offline |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-garden-night.png" alt="Garden spotlight by night" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-pendants-night.png" alt="Pendants by night" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-offline.png" alt="Offline" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-garden-night-dark.png" alt="Garden spotlight by night, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-pendants-night-dark.png" alt="Pendants by night, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-offline-dark.png" alt="Offline, dark" width="400"> |

**Animations**: a tree's and a garland's bulbs twinkle while an effect plays, a chandelier's flames flicker (still with `animations: false`, or when the system asks for reduced motion).

| Christmas tree | Chandelier | Garland |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-tree.gif" alt="Tree animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-chandelier.gif" alt="Chandelier animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-garland.gif" alt="Garland animation" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-tree-dark.gif" alt="Tree animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-chandelier-dark.gif" alt="Chandelier animation, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-garland-dark.gif" alt="Garland animation, dark" width="400"> |

### Light mini

| Floor lamp | Christmas tree by night | Zoomed in |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-mini-floor.png" alt="Mini, floor lamp" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-mini-tree.png" alt="Mini, tree" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-mini-zoom.png" alt="Mini, zoomed in" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-mini-floor-dark.png" alt="Mini, floor lamp, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-mini-tree-dark.png" alt="Mini, tree, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-light-card/main/screenshots/lc-mini-zoom-dark.png" alt="Mini, zoomed in, dark" width="400"> |

## How it works

- **Light**: `entity`, else the first light of the home that dims (groups and hidden lights last), or the lights of `entities`
- **What it can do**, from its supported colour modes: dimming (any mode but on/off), a colour temperature (`color_temp`, within its `min_color_temp_kelvin` – `max_color_temp_kelvin`), colours (`hs`, `xy`, `rgb`, `rgbw`, `rgbww`), and its `effect_list`
- **Its colour**: the RGB it reports, else the colour of its colour temperature (black body), else a warm white
- **Actions**: `light.turn_on` with `brightness_pct`, `color_temp_kelvin`, `rgb_color` or `effect`, `light.turn_off`, `light.toggle` (on every light of `entities` at once), `homeassistant.toggle` for a group's tile or a lamp on a switch, `scene.turn_on`; nothing else

## Development

```bash
npm install
npm run build        # stamps the version of package.json into dist/ha-light-card.js
npm run check        # builds and checks the bundle (run in CI)
npm test             # unit tests
npm run screenshots  # renders the cards with mock lights into screenshots/ (and the GIFs, needs ffmpeg)
```

`dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built files to the release, which is where the Marketplace installs them from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-light-card/blob/main/CHANGELOG.md)
3. Push to `main`: the **Release** workflow builds the card, creates the tag and the GitHub release with the changelog section as notes, and attaches `ha-light-card.js` and its translation files

## Translations

The card auto-detects the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |
| Deutsch | `de` |
| Español | `es` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português (Portugal) | `pt` |
| Polski | `pl` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-light-card/blob/main/LICENSE)
