import type { RoundedRect, Vec2 } from './geometry';

/**
 * Arena layout in tile units (one tile = config.arena.tileSizePx). The simulation only needs
 * geometry; which tile images to draw for each island is decided by the renderer.
 */

/** Sand islands stretch to any size of at least 2x2 tiles (the art is a 9-slice). */
export interface SandIsland {
  kind: 'sand';
  col: number;
  row: number;
  cols: number;
  rows: number;
}

/** Grass islands are drawn from a fixed 4x4 block of tiles, so their size is fixed. */
export interface GrassIsland {
  kind: 'grass';
  col: number;
  row: number;
}

export type IslandDef = SandIsland | GrassIsland;

export const GRASS_ISLAND_TILES = 4;

/** A rock in the water, centred on a tile. */
export interface RockDef {
  col: number;
  row: number;
}

export interface ArenaMap {
  cols: number;
  rows: number;
  islands: readonly IslandDef[];
  rocks: readonly RockDef[];
  playerStart: Vec2 & { rotation: number };
}

/** Collision tuning so the blocking shape follows the drawn coastline (A20). */
const ISLAND_INSET_PX = 6;
const ISLAND_CORNER_RADIUS_PX = 44;
const ROCK_RADIUS_PX = 22;

/** 30x17 tiles = 1920x1088 px (A19). The player starts in open water at the centre, facing right. */
export const DEFAULT_ARENA: ArenaMap = {
  cols: 30,
  rows: 17,
  islands: [
    { kind: 'grass', col: 3, row: 2 },
    { kind: 'sand', col: 23, row: 2, cols: 3, rows: 3 },
    { kind: 'grass', col: 7, row: 11 },
    { kind: 'sand', col: 19, row: 12, cols: 6, rows: 3 },
  ],
  rocks: [
    { col: 13, row: 3 },
    { col: 25, row: 8 },
  ],
  playerStart: { x: 960, y: 544, rotation: 0 },
};

export function islandSize(island: IslandDef): { cols: number; rows: number } {
  return island.kind === 'grass'
    ? { cols: GRASS_ISLAND_TILES, rows: GRASS_ISLAND_TILES }
    : { cols: island.cols, rows: island.rows };
}

/** Converts the map into the shapes that block ships and projectiles (R24). */
export function buildObstacles(map: ArenaMap, tileSizePx: number): RoundedRect[] {
  const islands = map.islands.map((island): RoundedRect => {
    const { cols, rows } = islandSize(island);
    return {
      x: island.col * tileSizePx + ISLAND_INSET_PX,
      y: island.row * tileSizePx + ISLAND_INSET_PX,
      width: cols * tileSizePx - ISLAND_INSET_PX * 2,
      height: rows * tileSizePx - ISLAND_INSET_PX * 2,
      cornerRadius: ISLAND_CORNER_RADIUS_PX,
    };
  });
  const rocks = map.rocks.map((rock): RoundedRect => ({
    x: (rock.col + 0.5) * tileSizePx - ROCK_RADIUS_PX,
    y: (rock.row + 0.5) * tileSizePx - ROCK_RADIUS_PX,
    width: ROCK_RADIUS_PX * 2,
    height: ROCK_RADIUS_PX * 2,
    cornerRadius: ROCK_RADIUS_PX,
  }));
  return [...islands, ...rocks];
}
