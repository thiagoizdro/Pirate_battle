import type { StepContext } from '../context';
import { angleTo, circleHitsRoundedRect, distance, normalizeAngle } from '../geometry';
import type { Enemy, Shooter } from '../types';
import { moveShip, turnTowards } from './movement';
import { spawnProjectile, tickCooldown } from './weapons';

/** Decides where each enemy steers, moves it, and lets Shooters fire (R18, R19, R20). */
export function updateEnemies(ctx: StepContext): void {
  const { player } = ctx.state;
  for (const enemy of ctx.state.enemies) {
    if (!enemy.alive) continue;
    const toPlayer = angleTo(enemy, player);
    const heading = avoidObstacles(ctx, enemy, toPlayer);

    if (enemy.kind === 'chaser') {
      // The Chaser always rams at full speed; contact damage is handled in contacts.ts.
      const stats = ctx.config.chaser;
      const turn = turnTowards(enemy.rotation, heading, stats.rotationSpeedRad, ctx.dtMs);
      moveShip(enemy, turn, 1, stats.moveSpeedPx, stats.rotationSpeedRad, ctx.dtMs, ctx.world);
    } else {
      updateShooter(ctx, enemy, heading, toPlayer);
    }
  }
}

function updateShooter(
  ctx: StepContext,
  shooter: Shooter,
  heading: number,
  toPlayer: number,
): void {
  const stats = ctx.config.shooter;
  const distanceToPlayer = distance(shooter, ctx.state.player);
  // Approach until the preferred distance, then hold position and keep aiming the bow.
  const approaching = distanceToPlayer > stats.preferredDistancePx;
  const target = approaching ? heading : toPlayer;
  const turn = turnTowards(shooter.rotation, target, stats.rotationSpeedRad, ctx.dtMs);
  moveShip(
    shooter,
    turn,
    approaching ? 1 : 0,
    stats.moveSpeedPx,
    stats.rotationSpeedRad,
    ctx.dtMs,
    ctx.world,
  );

  shooter.fireCooldownMs = tickCooldown(shooter.fireCooldownMs, ctx.dtMs);
  const aimError = Math.abs(normalizeAngle(toPlayer - shooter.rotation));
  const canFire =
    ctx.state.player.alive &&
    shooter.fireCooldownMs === 0 &&
    distanceToPlayer <= stats.attackRangePx &&
    aimError <= stats.aimToleranceRad;
  if (!canFire) return;

  const x = shooter.x + Math.cos(shooter.rotation) * shooter.radius;
  const y = shooter.y + Math.sin(shooter.rotation) * shooter.radius;
  spawnProjectile(ctx, 'enemy', x, y, shooter.rotation, stats.weapon);
  shooter.fireCooldownMs = stats.weapon.cooldownMs;
  ctx.emit({
    type: 'shotFired',
    shooter: 'shooter',
    weapon: 'enemy',
    x,
    y,
    rotation: shooter.rotation,
  });
}

/**
 * Simple "whisker" avoidance: probe three points ahead (centre, left, right). If the way ahead
 * is clear, keep the desired heading; otherwise turn towards the free side, preferring the side
 * that is closer to where the enemy wants to go.
 */
function avoidObstacles(ctx: StepContext, enemy: Enemy, desired: number): number {
  const { lookAheadPx, whiskerAngleRad } = ctx.config.ai;
  const blocked = (angle: number): boolean => {
    const probe = {
      x: enemy.x + Math.cos(angle) * lookAheadPx,
      y: enemy.y + Math.sin(angle) * lookAheadPx,
    };
    return ctx.world.obstacles.some((o) => circleHitsRoundedRect(probe, enemy.radius, o));
  };

  const ahead = blocked(enemy.rotation);
  const left = blocked(enemy.rotation - whiskerAngleRad);
  const right = blocked(enemy.rotation + whiskerAngleRad);
  if (!ahead && !left && !right) return desired;
  if (left && !right) return enemy.rotation + whiskerAngleRad;
  if (right && !left) return enemy.rotation - whiskerAngleRad;
  // Both sides (or only the centre) blocked: turn hard towards the side of the desired heading.
  const preferRight = normalizeAngle(desired - enemy.rotation) >= 0;
  return enemy.rotation + (preferRight ? Math.PI / 2 : -Math.PI / 2);
}
