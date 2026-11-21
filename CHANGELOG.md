# Changelog

## 1.0.3 - 2026-11-22

### Fixes
- Light mini card: a tap on the compact view now switches the light (or the plug), a hold opens its dialog, Enter / Space from the keyboard — it could only be switched once zoomed in, so not at all with `zoom: false` (#9). The tone chip and the zoom button keep their own click; with `navigation_path` the header still opens the path and the badge switches the light.

## 1.0.2 - 2026-11-20

### Fixes
- Colour temperature slider from the keyboard: the arrow keys' steps add up and are sent in one call once the keys rest (each key sent its own call, from the same starting value).
- The frosted status pill gets the `-webkit-backdrop-filter` prefix for older Safari and the iOS companion app.

### Performance
- The bundle no longer carries the room cards' code it never used: 134.7 KB → 113.4 KB.
- The shared translations no longer carry the room cards' labels this card never asks for (sensors, rooms, layouts, sorting) nor the ones its own table already has: 113.4 KB → 112.8 KB, and smaller language files. A test keeps it so.

### Maintenance
- README: a row of the main brands' logos (Philips Hue, ZHA, WLED, Govee, Matter, TP-Link, Shelly, Tuya), and the options table gets a *Card* column (both / mini) like the other ha-* cards.

## 1.0.1 - 2026-11-18

### Fixes
- Illustrated header: `auto` now follows the Home Assistant theme alone — a light theme keeps the day picture after sunset, a dark theme still shows the night one.

## 1.0.0 - 2026-11-17

### Features
- **Light card** (`custom:light-card`): a light drawn as its fixture, glowing in its own colour (RGB, else its colour temperature) and brightness. **The fixture is the brightness slider** — drag it up and down (shown at once, sent when released), tap it to switch the light; ↑ / ↓ and Enter / Space from the keyboard.
- Beside the fixture: the brightness, the tone (*2,700 K · Warm white*, colour, effect), the power button, **Full** and **Night light** presets.
- **Colour temperature** slider over the light's own range; **white tones** and **colours** (six, or your own `colors`) as swatches, a last one opening the light's dialog; **effects** and **scenes** (`scenes`) as chips.
- **Groups**: a light group or `entities` show their lights as tiles (fixture, name, brightness; tap to switch, hold for the dialog); a cluster of pendants, a garland or a tree light up light by light.
- **Illustrated header**: a 90 px banner with the fixture in its room (living room, dining room, desk, garden, window) on a ground strip, the badge's icon in the state's colour and the status pill (*On · 70 %*, *2 of 3 on*) placed by measurement; 12 fixtures found from the name in 22 languages or set with `kind` (bulb, filament bulb, pendant, pendant cluster, chandelier, ceiling light, floor lamp, desk lamp, garden spotlight, Christmas tree, LED garland, LED strip). Twinkling bulbs and flickering flames; night mode with the sun below the horizon or the dark theme (`illustration_theme`); `illustration: false` for the classic header.
- **Light mini card** (`custom:light-mini-card`): the banner with the state and the tone, and a zoom to the full card.
- Visual editor for every option; labels in 22 languages, English in the bundle and the others loaded on demand.
