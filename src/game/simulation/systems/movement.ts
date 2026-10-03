import type { World } from '../context';
import { clamp, normalizeAngle, pushOutOfRoundedRect } from '../geometry';
import type { ShipBase } from '../types';

/**
 * Rotates and moves a ship for one step, then keeps it out of islands and inside the arena.
 * @param turn -1 (full left) .. 1 (full right); fractions allow precise AI turns.
 * @param thrust 0 (stopped) .. 1 (full speed forward).
 */
export function moveShip(
  ship: ShipBase,
  turn: number,
  thrust: number,
  moveSpeedPx: number,
  rotationSpeedRad: number,
  dtMs: number,
  world: World,
): void {
  const dt = dtMs / 1000;
  ship.rotation = normalizeAngle(ship.rotation + clamp(turn, -1, 1) * rotationSpeedRad * dt);
  const distance = moveSpeedPx * clamp(thrust, 0, 1) * dt;
  ship.x += Math.cos(ship.rotation) * distance;
  ship.y += Math.sin(ship.rotation) * distance;
  keepInsideWorld(ship, world);
}

/** Pushes the ship out of every obstacle it overlaps and clamps it to the arena (R14, R20). */
export function keepInsideWorld(ship: ShipBase, world: World): void {
  for (const obstacle of world.obstacles) {
    const pushed = pushOutOfRoundedRect(ship, ship.radius, obstacle);
    if (pushed) {
      ship.x = pushed.x;
      ship.y = pushed.y;
    }
  }
  ship.x = clamp(ship.x, ship.radius, world.width - ship.radius);
  ship.y = clamp(ship.y, ship.radius, world.height - ship.radius);
}

/**
 * Turn amount (-1..1) that rotates towards `targetAngle` this step without overshooting it,
 * which avoids AI ships wobbling left and right around the target.
 */
export function turnTowards(
  currentAngle: number,
  targetAngle: number,
  rotationSpeedRad: number,
  dtMs: number,
): number {
  const maxTurn = rotationSpeedRad * (dtMs / 1000);
  if (maxTurn === 0) return 0;
  return clamp(normalizeAngle(targetAngle - currentAngle) / maxTurn, -1, 1);
}
