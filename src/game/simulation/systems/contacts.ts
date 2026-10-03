import type { StepContext } from '../context';
import { circlesOverlap } from '../geometry';
import type { ShipBase } from '../types';
import { damagePlayer, destroyEnemy } from './damage';
import { keepInsideWorld } from './movement';

/**
 * Ship-to-ship contact (A12):
 * - a Chaser touching the player deals contact damage and explodes, without scoring (R18, R31);
 * - any other overlap just pushes the ships apart, so they never sit on top of each other.
 */
export function resolveContacts(ctx: StepContext): void {
  const { player, enemies } = ctx.state;

  for (const enemy of enemies) {
    if (!enemy.alive || !player.alive) continue;
    if (!circlesOverlap(enemy, enemy.radius, player, player.radius)) continue;
    if (enemy.kind === 'chaser') {
      damagePlayer(ctx, ctx.config.chaser.contactDamage, 'chaser');
      destroyEnemy(ctx, enemy, false);
    } else {
      // The player keeps full control; only the enemy is pushed away.
      separate(enemy, player, 1);
      keepInsideWorld(enemy, ctx.world);
    }
  }

  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (!a?.alive) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (!b?.alive || !circlesOverlap(a, a.radius, b, b.radius)) continue;
      separate(a, b, 0.5);
      separate(b, a, 0.5);
      keepInsideWorld(a, ctx.world);
      keepInsideWorld(b, ctx.world);
    }
  }
}

/** Moves `ship` away from `other` by `share` of their overlap (0.5 each = meet in the middle). */
function separate(ship: ShipBase, other: ShipBase, share: number): void {
  const dx = ship.x - other.x;
  const dy = ship.y - other.y;
  const length = Math.hypot(dx, dy);
  const overlap = ship.radius + other.radius - length;
  if (overlap <= 0) return;
  // Exactly on top of each other: pick a fixed direction so the result stays deterministic.
  const nx = length > 0 ? dx / length : 1;
  const ny = length > 0 ? dy / length : 0;
  ship.x += nx * overlap * share;
  ship.y += ny * overlap * share;
}
