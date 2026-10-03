import { describe, expect, it } from 'vitest';

import { DEFAULT_BALANCE } from '../../src/game/config';
import { buildObstacles, DEFAULT_ARENA, islandSize } from '../../src/game/simulation/arena';
import { circleHitsRoundedRect } from '../../src/game/simulation/geometry';

const { widthPx, heightPx, tileSizePx } = DEFAULT_BALANCE.arena;

describe('DEFAULT_ARENA', () => {
  it('matches the arena size in the config', () => {
    expect(DEFAULT_ARENA.cols * tileSizePx).toBe(widthPx);
    expect(DEFAULT_ARENA.rows * tileSizePx).toBe(heightPx);
  });

  it('has at least one island (R24)', () => {
    expect(DEFAULT_ARENA.islands.length).toBeGreaterThan(0);
  });

  it('keeps islands and their shallow-water ring inside the arena', () => {
    for (const island of DEFAULT_ARENA.islands) {
      const { cols, rows } = islandSize(island);
      expect(island.col - 1).toBeGreaterThanOrEqual(0);
      expect(island.row - 1).toBeGreaterThanOrEqual(0);
      expect(island.col + cols + 1).toBeLessThanOrEqual(DEFAULT_ARENA.cols);
      expect(island.row + rows + 1).toBeLessThanOrEqual(DEFAULT_ARENA.rows);
    }
  });

  it('starts the player in open water', () => {
    const obstacles = buildObstacles(DEFAULT_ARENA, tileSizePx);
    const start = DEFAULT_ARENA.playerStart;
    const radius = DEFAULT_BALANCE.player.radiusPx;
    expect(obstacles.some((o) => circleHitsRoundedRect(start, radius, o))).toBe(false);
  });
});
