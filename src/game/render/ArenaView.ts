import { Container, Graphics, Sprite } from 'pixi.js';

import { islandSize, type ArenaMap, type IslandDef } from '../simulation/arena';
import type { RoundedRect } from '../simulation/geometry';
import { frameTexture, type GameAssets } from './assets';

// Tile numbers in tiles_sheet (see scripts/sync-assets.mjs for the grid layout).
const WATER_TILE = 73;
const ROCK_TILE = 50;
/** 3x3 nine-slice blocks: [top row, middle row, bottom row], each [left, centre, right]. */
const SAND_SLICES = [
  [1, 2, 3],
  [17, 18, 19],
  [33, 34, 35],
] as const;
const SHALLOW_SLICES = [
  [10, 11, 12],
  [26, 27, 28],
  [42, 43, 44],
] as const;
const GRASS_BLOCK = [
  [6, 7, 8, 9],
  [22, 23, 24, 25],
  [38, 39, 40, 41],
  [54, 55, 56, 57],
] as const;

/** Picks the nine-slice tile for a cell of a block of `size` cells: first, middle or last. */
function sliceIndex(index: number, size: number): 0 | 1 | 2 {
  if (index === 0) return 0;
  return index === size - 1 ? 2 : 1;
}

function islandTile(island: IslandDef, col: number, row: number): number {
  if (island.kind === 'grass') {
    const tile = GRASS_BLOCK[row]?.[col];
    if (tile === undefined) throw new Error('Grass island cell out of range');
    return tile;
  }
  return SAND_SLICES[sliceIndex(row, island.rows)][sliceIndex(col, island.cols)];
}

/**
 * Builds the static arena: water, a shallow-water ring around each island, the islands and
 * the rocks. It never changes during a match, so it is built once per match.
 */
export function createArenaView(
  map: ArenaMap,
  assets: GameAssets,
  tileSize: number,
  debugObstacles?: readonly RoundedRect[],
): Container {
  const root = new Container({ label: 'arena' });
  const tile = (n: number, col: number, row: number): Sprite => {
    const sprite = new Sprite(frameTexture(assets.tiles, `tile_${n}`));
    sprite.position.set(col * tileSize, row * tileSize);
    sprite.setSize(tileSize, tileSize);
    return sprite;
  };

  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) root.addChild(tile(WATER_TILE, col, row));
  }

  for (const island of map.islands) {
    const { cols, rows } = islandSize(island);
    // Shallow water: one tile wider than the island on every side.
    for (let r = 0; r < rows + 2; r++) {
      for (let c = 0; c < cols + 2; c++) {
        const n = SHALLOW_SLICES[sliceIndex(r, rows + 2)][sliceIndex(c, cols + 2)];
        root.addChild(tile(n, island.col - 1 + c, island.row - 1 + r));
      }
    }
  }

  for (const island of map.islands) {
    const { cols, rows } = islandSize(island);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        root.addChild(tile(islandTile(island, c, r), island.col + c, island.row + r));
      }
    }
  }

  for (const rock of map.rocks) root.addChild(tile(ROCK_TILE, rock.col, rock.row));

  if (debugObstacles) {
    const outline = new Graphics({ label: 'debug-obstacles' });
    for (const o of debugObstacles) outline.roundRect(o.x, o.y, o.width, o.height, o.cornerRadius);
    outline.stroke({ width: 2, color: 0xff00ff });
    root.addChild(outline);
  }

  return root;
}
