# Asset sources and licenses

All game art and sounds come from the challenge repository ([challenge/assets/](../challenge/assets/)), provided by Jungle Gaming for this test. No external art, sound or font was added.

| Asset                                                                                                         | Source                                                                                                          | License / terms                                                                          | Used for                                                                |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Ships, ship parts, effects (`png/*/ships`, `ship_parts`, `effects`, `spritesheet/ships_miscellaneous_sheet*`) | Provided with the challenge. The art matches **Kenney's "Pirate Pack"** (https://kenney.nl/assets/pirate-pack). | Kenney assets are published under **CC0 1.0** (public domain).                           | Player and enemy ships, damage states, cannonballs, explosions, flames. |
| Tiles (`tilesheet/tiles_sheet*`, `png/*/tiles`)                                                               | Provided with the challenge; same Kenney "Pirate Pack".                                                         | CC0 1.0                                                                                  | Water, shallow water, sand and grass islands, rocks.                    |
| UI atlas (`spritesheet/ui_sheet*`, `png/*/ui`) — "Pirate Battle UI asset pack"                                | Provided with the challenge by Jungle Gaming.                                                                   | No license file included; used only for this evaluation, as instructed by the challenge. | Panels, buttons, HUD frames, health bars, icons, title.                 |
| Scene background, reference screenshots, Jungle Gaming logo                                                   | Provided with the challenge by Jungle Gaming.                                                                   | Same as above.                                                                           | Menu background, logo.                                                  |
| Sounds (`sounds/*.wav`)                                                                                       | Provided with the challenge by Jungle Gaming.                                                                   | No license file included; used only for this evaluation.                                 | All sound effects and loops.                                            |
| Fonts                                                                                                         | System font stack (`system-ui`, Segoe UI, Roboto…).                                                             | Fonts of the user's operating system; nothing is bundled.                                | All text.                                                               |

## Derived files

`npm run sync-assets` ([scripts/sync-assets.mjs](../scripts/sync-assets.mjs)) copies the used files into `public/assets/` and produces two derived files. No new art was drawn:

- `public/assets/sheets/ships.json`: the provided Starling XML atlas converted to the PixiJS JSON format (same frames).
- `public/assets/sheets/tiles.png` / `tiles.json`: the provided 2× tile sheet rebuilt with 2 px extruded borders around each tile (edge pixels repeated) to avoid seams when the arena is scaled.

If the license of the Jungle Gaming UI pack or sounds should be stated differently, update this file.
