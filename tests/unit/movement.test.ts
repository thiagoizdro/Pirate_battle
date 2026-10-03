import { describe, expect, it } from 'vitest';

import { distanceToRoundedRect } from '../../src/game/simulation/geometry';
import { turnTowards } from '../../src/game/simulation/systems/movement';
import { makeMatch, NO_SPAWNS, OPEN_MAP, run, stepsFor } from './helpers';

describe('player movement', () => {
  it('moves forward along its heading at the configured speed', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const { player } = match.state;
    run(match, stepsFor(match, 1000), { forward: true });
    expect(player.x).toBeCloseTo(960 + match.config.player.moveSpeedPx, 3);
    expect(player.y).toBeCloseTo(544, 6);
  });

  it('rotates both ways at the configured rotation speed', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const speed = match.config.player.rotationSpeedRad;
    run(match, stepsFor(match, 500), { turnRight: true });
    expect(match.state.player.rotation).toBeCloseTo(speed * 0.5, 6);
    run(match, stepsFor(match, 1000), { turnLeft: true });
    expect(match.state.player.rotation).toBeCloseTo(-speed * 0.5, 6);
  });

  it('does not rotate when both turn buttons are held', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 30, { turnLeft: true, turnRight: true });
    expect(match.state.player.rotation).toBe(0);
  });

  it('can move and turn at the same time', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 30, { forward: true, turnRight: true });
    expect(match.state.player.x).toBeGreaterThan(960);
    expect(match.state.player.y).toBeGreaterThan(544);
  });

  it('stays inside the visible arena (R14)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, stepsFor(match, 8000), { forward: true });
    const { player } = match.state;
    expect(player.x).toBe(match.config.arena.widthPx - player.radius);
  });

  it('cannot pass through an island and slides along it (R14, R24)', () => {
    const map = {
      ...OPEN_MAP,
      islands: [{ kind: 'sand' as const, col: 18, row: 6, cols: 3, rows: 6 }],
    };
    const match = makeMatch({ balance: NO_SPAWNS, map });
    const island = match.world.obstacles[0];
    if (!island) throw new Error('missing island');
    // Head right and slightly down into the island for 4 seconds.
    match.state.player.rotation = 0.3;
    run(match, stepsFor(match, 4000), { forward: true });
    const { player } = match.state;
    expect(distanceToRoundedRect(player, island)).toBeGreaterThanOrEqual(player.radius - 1e-6);
    expect(player.x).toBeLessThan(island.x);
    // It slid down along the coast instead of stopping dead.
    expect(player.y).toBeGreaterThan(700);
  });
});

describe('turnTowards', () => {
  it('turns the short way and never overshoots', () => {
    const step = 1000 / 60;
    expect(turnTowards(0, 1, 2, step)).toBe(1);
    expect(turnTowards(0, -1, 2, step)).toBe(-1);
    const small = turnTowards(0, 0.01, 2, step);
    expect(small).toBeGreaterThan(0);
    expect(small).toBeLessThan(1);
    expect(turnTowards(3, -3, 2, step)).toBe(1); // across the PI boundary
  });
});
