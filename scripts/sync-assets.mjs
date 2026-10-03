// Copies the assets the game uses from challenge/assets (left untouched) into public/assets,
// and generates PixiJS spritesheet JSON for the sheets that ship without one.
// Run with `npm run sync-assets`. The output is committed, so the build never depends on this script.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePng, encodePng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'challenge', 'assets');
const out = join(root, 'public', 'assets');

rmSync(out, { recursive: true, force: true });

function copy(from, to) {
  mkdirSync(dirname(join(out, to)), { recursive: true });
  copyFileSync(join(src, from), join(out, to));
}

function writeJson(to, data) {
  mkdirSync(dirname(join(out, to)), { recursive: true });
  writeFileSync(join(out, to), `${JSON.stringify(data, null, 2)}\n`);
}

function frame(x, y, w, h) {
  return {
    frame: { x, y, w, h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w, h },
    sourceSize: { w, h },
  };
}

// Ships and effects: Starling XML -> TexturePacker JSON. The "retina" ship sheet is not 2x, so we use the default one.
const xml = readFileSync(join(src, 'spritesheet', 'ships_miscellaneous_sheet.xml'), 'utf8');
const shipFrames = {};
for (const match of xml.matchAll(
  /<SubTexture name="([^"]+)\.png" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"\/>/g,
)) {
  const [, name, x, y, w, h] = match;
  shipFrames[name] = frame(Number(x), Number(y), Number(w), Number(h));
}
copy('spritesheet/ships_miscellaneous_sheet.png', 'sheets/ships.png');
writeJson('sheets/ships.json', {
  frames: shipFrames,
  meta: { image: 'ships.png', format: 'RGBA8888', size: { w: 1024, h: 512 }, scale: '1' },
});

// Tiles: 16x6 grid of 64x64 logical tiles, row-major (tile_N is at col (N-1)%16, row floor((N-1)/16)).
// We use the 2x sheet, so frame coordinates are in physical pixels and meta.scale is 2.
//
// The original sheet has no gap between tiles. When the arena is scaled, the GPU samples a pixel
// of the neighbouring tile at each edge, which shows thin lines between tiles ("texture bleeding").
// We rebuild the sheet with EXTRUDE pixels around every tile, filled by repeating its edge pixels.
const TILE = 128;
const EXTRUDE = 2;
const CELL = TILE + EXTRUDE * 2;
const COLS = 16;
const ROWS = 6;
const tilesIn = decodePng(readFileSync(join(src, 'tilesheet', 'tiles_sheet_retina.png')));
const tilesOut = {
  width: COLS * CELL,
  height: ROWS * CELL,
  data: Buffer.alloc(COLS * CELL * ROWS * CELL * 4),
};
const tileFrames = {};
for (let n = 1; n <= COLS * ROWS; n++) {
  const col = (n - 1) % COLS;
  const row = Math.floor((n - 1) / COLS);
  for (let y = -EXTRUDE; y < TILE + EXTRUDE; y++) {
    for (let x = -EXTRUDE; x < TILE + EXTRUDE; x++) {
      // Clamp to the tile so the padding repeats the nearest edge pixel.
      const sx = col * TILE + Math.min(Math.max(x, 0), TILE - 1);
      const sy = row * TILE + Math.min(Math.max(y, 0), TILE - 1);
      const dx = col * CELL + EXTRUDE + x;
      const dy = row * CELL + EXTRUDE + y;
      tilesIn.data.copy(
        tilesOut.data,
        (dy * tilesOut.width + dx) * 4,
        (sy * tilesIn.width + sx) * 4,
        (sy * tilesIn.width + sx) * 4 + 4,
      );
    }
  }
  tileFrames[`tile_${n}`] = frame(col * CELL + EXTRUDE, row * CELL + EXTRUDE, TILE, TILE);
}
mkdirSync(join(out, 'sheets'), { recursive: true });
writeFileSync(join(out, 'sheets', 'tiles.png'), encodePng(tilesOut));
writeJson('sheets/tiles.json', {
  frames: tileFrames,
  meta: {
    image: 'tiles.png',
    format: 'RGBA8888',
    size: { w: tilesOut.width, h: tilesOut.height },
    scale: '2',
  },
});

// UI atlas (2x): already in TexturePacker format; only the image name changes.
const uiSheet = JSON.parse(readFileSync(join(src, 'spritesheet', 'ui_sheet_retina.json'), 'utf8'));
uiSheet.meta.image = 'ui.png';
copy('spritesheet/ui_sheet_retina.png', 'sheets/ui.png');
writeJson('sheets/ui.json', uiSheet);

// Individual 2x UI images for React (CSS backgrounds).
for (const group of ['controls', 'hud', 'menu']) {
  for (const file of readdirSync(join(src, 'png', 'retina', 'ui', group))) {
    copy(`png/retina/ui/${group}/${file}`, `ui/${group}/${file}`);
  }
}

for (const file of readdirSync(join(src, 'sounds'))) copy(`sounds/${file}`, `sounds/${file}`);

copy('ui_scene_background.png', 'ui/scene_background.png');
copy('logo_jungle_gaming.svg', 'ui/logo_jungle_gaming.svg');

console.log(`Assets synced to ${out}`);
