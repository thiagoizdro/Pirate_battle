import type { StepContext } from '../context';
import { circleHitsRoundedRect, circlesOverlap } from '../geometry';
import type { Projectile } from '../types';
import { damageEnemy, damagePlayer } from './damage';

/**
 * Moves every projectile and removes the ones that hit something, hit an island, left the arena
 * or ran out of range/lifetime (R25, R27). Removal happens right after the first hit, so a
 * projectile can only ever apply its damage once.
 */
export function updateProjectiles(ctx: StepContext): void {
  const list = ctx.state.projectiles;
  // In-place compaction: keep survivors at the front of the array without allocating a new one.
  let kept = 0;
  for (const projectile of list) {
    if (advanceProjectile(ctx, projectile)) list[kept++] = projectile;
  }
  list.length = kept;
}

/** Returns true when the projectile is still flying after this step. */
function advanceProjectile(ctx: StepContext, p: Projectile): boolean {
  const distance = p.speedPx * (ctx.dtMs / 1000);
  p.x += p.dirX * distance;
  p.y += p.dirY * distance;
  p.traveledPx += distance;
  p.ageMs += ctx.dtMs;

  if (p.owner === 'player') {
    // Player shots only hit enemies (R26).
    for (const enemy of ctx.state.enemies) {
      if (!enemy.alive || !circlesOverlap(p, p.radius, enemy, enemy.radius)) continue;
      ctx.emit({ type: 'projectileHit', targetId: enemy.id, owner: p.owner, x: p.x, y: p.y });
      damageEnemy(ctx, enemy, p.damage, true);
      return false;
    }
  } else {
    const { player } = ctx.state;
    if (player.alive && circlesOverlap(p, p.radius, player, player.radius)) {
      ctx.emit({ type: 'projectileHit', targetId: player.id, owner: p.owner, x: p.x, y: p.y });
      damagePlayer(ctx, p.damage, 'projectile');
      return false;
    }
  }

  if (ctx.world.obstacles.some((o) => circleHitsRoundedRect(p, p.radius, o))) {
    ctx.emit({ type: 'projectileBlocked', x: p.x, y: p.y });
    return false;
  }

  if (p.x < 0 || p.y < 0 || p.x > ctx.world.width || p.y > ctx.world.height) return false;

  if (p.traveledPx >= p.rangePx || p.ageMs >= p.lifetimeMs) {
    ctx.emit({ type: 'projectileExpired', x: p.x, y: p.y });
    return false;
  }
  return true;
}
