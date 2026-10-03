import type { StepContext } from '../context';
import type { InputState, PlayerWeapon } from '../types';
import { moveShip } from './movement';
import { spawnProjectile, tickCooldown } from './weapons';

/** Moves the player from the input, then fires every weapon whose button is held and ready. */
export function updatePlayer(ctx: StepContext, input: Readonly<InputState>): void {
  const { player } = ctx.state;
  if (!player.alive) return;
  const stats = ctx.config.player;

  const turn = (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
  moveShip(
    player,
    turn,
    input.forward ? 1 : 0,
    stats.moveSpeedPx,
    stats.rotationSpeedRad,
    ctx.dtMs,
    ctx.world,
  );

  player.cooldowns.front = tickCooldown(player.cooldowns.front, ctx.dtMs);
  player.cooldowns.left = tickCooldown(player.cooldowns.left, ctx.dtMs);
  player.cooldowns.right = tickCooldown(player.cooldowns.right, ctx.dtMs);

  // Holding a button fires whenever its cooldown allows; nothing is ever queued (R40).
  if (input.fireFront && player.cooldowns.front === 0) fireFront(ctx);
  if (input.fireLeft && player.cooldowns.left === 0) fireBroadside(ctx, 'left');
  if (input.fireRight && player.cooldowns.right === 0) fireBroadside(ctx, 'right');
}

function fireFront(ctx: StepContext): void {
  const { player } = ctx.state;
  const weapon = ctx.config.player.front;
  const angle = player.rotation;
  const x = player.x + Math.cos(angle) * player.radius;
  const y = player.y + Math.sin(angle) * player.radius;
  spawnProjectile(ctx, 'player', x, y, angle, weapon);
  player.cooldowns.front = weapon.cooldownMs;
  ctx.emit({ type: 'shotFired', shooter: 'player', weapon: 'front', x, y, rotation: angle });
}

/**
 * Fires N parallel projectiles out of one side (R12). They start spread along the hull and all
 * travel perpendicular to it: the left side is the heading turned 90 degrees counter-clockwise.
 */
function fireBroadside(ctx: StepContext, side: Exclude<PlayerWeapon, 'front'>): void {
  const { player } = ctx.state;
  const weapon = ctx.config.player.broadside;
  const angle = player.rotation + (side === 'left' ? -Math.PI / 2 : Math.PI / 2);
  const headingX = Math.cos(player.rotation);
  const headingY = Math.sin(player.rotation);
  const sideX = Math.cos(angle) * player.radius;
  const sideY = Math.sin(angle) * player.radius;
  for (let i = 0; i < weapon.projectileCount; i++) {
    // Offsets centred on the ship, e.g. -1, 0, +1 times the spacing for three projectiles.
    const offset = (i - (weapon.projectileCount - 1) / 2) * weapon.spacingPx;
    spawnProjectile(
      ctx,
      'player',
      player.x + sideX + headingX * offset,
      player.y + sideY + headingY * offset,
      angle,
      weapon,
    );
  }
  player.cooldowns[side] = weapon.cooldownMs;
  ctx.emit({
    type: 'shotFired',
    shooter: 'player',
    weapon: side,
    x: player.x + sideX,
    y: player.y + sideY,
    rotation: angle,
  });
}
