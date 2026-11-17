# Changelog

## 1.0.0 - 2026-11-17

### Features
- **Light card** (`custom:light-card`): a light drawn as its fixture, glowing in its own colour (RGB, else its colour temperature) and brightness. **The fixture is the brightness slider** — drag it up and down (shown at once, sent when released), tap it to switch the light; ↑ / ↓ and Enter / Space from the keyboard.
- Beside the fixture: the brightness, the tone (*2,700 K · Warm white*, colour, effect), the power button, **Full** and **Night light** presets.
- **Colour temperature** slider over the light's own range; **white tones** and **colours** (six, or your own `colors`) as swatches, a last one opening the light's dialog; **effects** and **scenes** (`scenes`) as chips.
- **Groups**: a light group or `entities` show their lights as tiles (fixture, name, brightness; tap to switch, hold for the dialog); a cluster of pendants, a garland or a tree light up light by light.
- **Illustrated header**: a 90 px banner with the fixture in its room (living room, dining room, desk, garden, window) on a ground strip, the badge's icon in the state's colour and the status pill (*On · 70 %*, *2 of 3 on*) placed by measurement; 12 fixtures found from the name in 22 languages or set with `kind` (bulb, filament bulb, pendant, pendant cluster, chandelier, ceiling light, floor lamp, desk lamp, garden spotlight, Christmas tree, LED garland, LED strip). Twinkling bulbs and flickering flames; night mode with the sun below the horizon or the dark theme (`illustration_theme`); `illustration: false` for the classic header.
- **Light mini card** (`custom:light-mini-card`): the banner with the state and the tone, and a zoom to the full card.
- Visual editor for every option; labels in 22 languages, English in the bundle and the others loaded on demand.
