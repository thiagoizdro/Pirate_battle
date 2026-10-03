import type { MatchConfig } from '../../config';
import type { StepContext, World } from '../context';
import { createEnemy } from '../entities';
import { angleTo, distance, distanceToRoundedRect, type Vec2 } from '../geometry';
import type { SeededRng } from '../rng';
import type { EnemyKind, MatchState } from '../types';

/** Small tolerance so float rounding never delays a spawn by one extra step. */
const TIMER_EPSILON_MS = 1e-6;

/** Spawns one enemy every configured interval until the match ends (R22). */
export function updateSpawns(ctx: StepContext): void {
  const { state, config } = ctx;
  state.spawnTimerMs += ctx.dtMs;
  if (state.spawnTimerMs + TIMER_EPSILON_MS < config.spawnIntervalMs) return;
  state.spawnTimerMs -= config.spawnIntervalMs;

  const aliveEnemies = state.enemies.filter((e) => e.alive).length;
  if (aliveEnemies >= config.spawn.maxEnemies) return; // A17

  const kind = nextEnemyKind(state.spawnCount, config, ctx.rng);
  const radius = kind === 'chaser' ? config.chaser.radiusPx : config.shooter.radiusPx;
  const point = findSpawnPoint(config, state, ctx.world, ctx.rng, radius);
  if (!point) return; // A18: no safe point this time; try again at the next interval.

  const enemy = createEnemy(
    config,
    kind,
    state.nextId++,
    point.x,
    point.y,
    angleTo(point, state.player),
  );
  state.enemies.push(enemy);
  state.spawnCount++;
  ctx.emit({ type: 'enemySpawned', id: enemy.id, kind, x: enemy.x, y: enemy.y });
}

/** The first two spawns are one of each type, so both always appear (R21, A15). */
export function nextEnemyKind(spawnCount: number, config: MatchConfig, rng: SeededRng): EnemyKind {
  if (spawnCount === 0) return 'chaser';
  if (spawnCount === 1) return 'shooter';
  return rng.chance(config.spawn.chaserRatio) ? 'chaser' : 'shooter';
}

/**
 * Tries random points and returns the first one that is in open water, away from other ships,
 * and at least the minimum distance from the player (R23). Returns null if none is found.
 */
export function findSpawnPoint(
  config: MatchConfig,
  state: MatchState,
  world: World,
  rng: SeededRng,
  radius: number,
): Vec2 | null {
  const { clearancePx, maxAttempts } = config.spawn;
  const margin = radius + clearancePx;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const point = {
      x: rng.range(margin, world.width - margin),
      y: rng.range(margin, world.height - margin),
    };
    if (isSafeSpawnPoint(point, radius, config, state, world)) return point;
  }
  return null;
}

export function isSafeSpawnPoint(
  point: Vec2,
  radius: number,
  config: MatchConfig,
  state: MatchState,
  world: World,
): boolean {
  const { clearancePx, minDistanceFromPlayerPx } = config.spawn;
  if (distance(point, state.player) < minDistanceFromPlayerPx) return false;
  if (world.obstacles.some((o) => distanceToRoundedRect(point, o) < radius + clearancePx)) {
    return false;
  }
  return state.enemies.every(
    (e) => !e.alive || distance(point, e) >= radius + e.radius + clearancePx,
  );
}
