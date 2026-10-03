import type { StepContext } from '../context';
import type { Enemy } from '../types';

/**
 * The only places where health changes. Both functions ignore ships that are already destroyed,
 * so a second hit in the same step can never score twice (R31) or hurt from beyond the grave (R29).
 */
export function damageEnemy(
  ctx: StepContext,
  enemy: Enemy,
  amount: number,
  byPlayer: boolean,
): void {
  if (!enemy.alive) return;
  enemy.health = Math.max(0, enemy.health - amount);
  ctx.emit({ type: 'enemyDamaged', id: enemy.id, amount, health: enemy.health });
  if (enemy.health === 0) destroyEnemy(ctx, enemy, byPlayer);
}

export function destroyEnemy(ctx: StepContext, enemy: Enemy, byPlayer: boolean): void {
  if (!enemy.alive) return;
  enemy.alive = false;
  enemy.health = 0;
  ctx.emit({
    type: 'enemyDestroyed',
    id: enemy.id,
    kind: enemy.kind,
    x: enemy.x,
    y: enemy.y,
    byPlayer,
  });
  if (byPlayer) {
    ctx.state.score += 1;
    ctx.emit({ type: 'scoreChanged', score: ctx.state.score });
  }
}

export function damagePlayer(
  ctx: StepContext,
  amount: number,
  source: 'projectile' | 'chaser',
): void {
  const player = ctx.state.player;
  if (!player.alive) return;
  player.health = Math.max(0, player.health - amount);
  ctx.emit({ type: 'playerDamaged', amount, health: player.health, source });
  if (player.health === 0) player.alive = false;
}
