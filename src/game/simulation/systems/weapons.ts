import type { WeaponConfig } from '../../config';
import type { StepContext } from '../context';
import type { Projectile } from '../types';

/** Creates one projectile travelling at `angle`, starting at (x, y). */
export function spawnProjectile(
  ctx: StepContext,
  owner: Projectile['owner'],
  x: number,
  y: number,
  angle: number,
  weapon: WeaponConfig,
): void {
  ctx.state.projectiles.push({
    id: ctx.state.nextId++,
    owner,
    x,
    y,
    dirX: Math.cos(angle),
    dirY: Math.sin(angle),
    speedPx: weapon.projectileSpeedPx,
    damage: weapon.damage,
    radius: weapon.projectileRadiusPx,
    traveledPx: 0,
    rangePx: weapon.projectileRangePx,
    ageMs: 0,
    lifetimeMs: weapon.projectileLifetimeMs,
  });
}

/** Lowers a cooldown by one step, never below zero. */
export function tickCooldown(remainingMs: number, dtMs: number): number {
  return Math.max(0, remainingMs - dtMs);
}
