import { describe, expect, it } from 'vitest';

import { DEFAULT_BALANCE } from '../../src/game/config';
import { DEFAULT_ARENA } from '../../src/game/simulation/arena';
import { distance, distanceToRoundedRect } from '../../src/game/simulation/geometry';
import { SeededRng } from '../../src/game/simulation/rng';
import { findSpawnPoint, nextEnemyKind } from '../../src/game/simulation/systems/spawn';
import { makeMatch, ofType, run, stepsFor } from './helpers';

describe('spawning', () => {
  it('spawns exactly at each configured interval (R22)', () => {
    const match = makeMatch({ options: { spawnIntervalSeconds: 2.5 } });
    match.state.player.health = 100000;
    const beforeFirst = run(match, stepsFor(match, 2500) - 1);
    expect(ofType(beforeFirst, 'enemySpawned')).toHaveLength(0);
    expect(ofType(run(match, 1), 'enemySpawned')).toHaveLength(1);
    expect(ofType(run(match, stepsFor(match, 2500)), 'enemySpawned')).toHaveLength(1);
  });

  it('spawns one of each type first, so both always appear (R21)', () => {
    const rng = new SeededRng(1);
    const config = makeMatch().config;
    expect(nextEnemyKind(0, config, rng)).toBe('chaser');
    expect(nextEnemyKind(1, config, rng)).toBe('shooter');
  });

  it('follows the configured Chaser ratio afterwards', () => {
    const rng = new SeededRng(99);
    const config = makeMatch().config;
    let chasers = 0;
    for (let i = 0; i < 5000; i++) if (nextEnemyKind(2 + i, config, rng) === 'chaser') chasers++;
    expect(chasers / 5000).toBeCloseTo(config.spawn.chaserRatio, 1);
  });

  it('only spawns in open water, far from the player (R23)', () => {
    const match = makeMatch({
      map: DEFAULT_ARENA,
      options: { spawnIntervalSeconds: 1 },
      seed: 7,
    });
    match.state.player.health = 100000;
    const { minDistanceFromPlayerPx, clearancePx } = match.config.spawn;
    for (let i = 0; i < stepsFor(match, 60000); i++) {
      match.step({
        forward: i % 200 < 120,
        turnLeft: i % 300 < 40,
        turnRight: false,
        fireFront: false,
        fireLeft: false,
        fireRight: false,
      });
      for (const event of ofType(match.drainEvents(), 'enemySpawned')) {
        expect(distance(event, match.state.player)).toBeGreaterThanOrEqual(minDistanceFromPlayerPx);
        for (const obstacle of match.world.obstacles) {
          expect(distanceToRoundedRect(event, obstacle)).toBeGreaterThanOrEqual(clearancePx);
        }
      }
    }
  });

  it('never exceeds the enemy cap (A17)', () => {
    const match = makeMatch({
      options: { spawnIntervalSeconds: 1 },
      balance: { spawn: { ...DEFAULT_BALANCE.spawn, maxEnemies: 3, chaserRatio: 0 } },
    });
    match.state.player.health = 100000;
    for (let i = 0; i < stepsFor(match, 30000); i++) {
      run(match, 1);
      expect(match.state.enemies.length).toBeLessThanOrEqual(3);
    }
  });

  it('returns no point when none is safe, so the spawn is skipped (A18)', () => {
    const match = makeMatch({
      balance: { spawn: { ...DEFAULT_BALANCE.spawn, minDistanceFromPlayerPx: 5000 } },
    });
    const point = findSpawnPoint(match.config, match.state, match.world, new SeededRng(1), 24);
    expect(point).toBeNull();
    const events = run(match, stepsFor(match, 3000));
    expect(ofType(events, 'enemySpawned')).toHaveLength(0);
  });
});
