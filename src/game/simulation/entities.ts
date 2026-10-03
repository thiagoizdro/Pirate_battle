import type { MatchConfig } from '../config';
import type { Chaser, Enemy, EnemyKind, Player, Shooter } from './types';

export function createPlayer(
  config: MatchConfig,
  id: number,
  x: number,
  y: number,
  rotation: number,
): Player {
  return {
    kind: 'player',
    id,
    x,
    y,
    rotation,
    health: config.player.maxHealth,
    maxHealth: config.player.maxHealth,
    radius: config.player.radiusPx,
    alive: true,
    cooldowns: { front: 0, left: 0, right: 0 },
  };
}

export function createEnemy(
  config: MatchConfig,
  kind: EnemyKind,
  id: number,
  x: number,
  y: number,
  rotation: number,
): Enemy {
  if (kind === 'chaser') {
    const chaser: Chaser = {
      kind,
      id,
      x,
      y,
      rotation,
      health: config.chaser.maxHealth,
      maxHealth: config.chaser.maxHealth,
      radius: config.chaser.radiusPx,
      alive: true,
    };
    return chaser;
  }
  const shooter: Shooter = {
    kind,
    id,
    x,
    y,
    rotation,
    health: config.shooter.maxHealth,
    maxHealth: config.shooter.maxHealth,
    radius: config.shooter.radiusPx,
    alive: true,
    // A fresh Shooter waits one full cooldown before its first shot.
    fireCooldownMs: config.shooter.weapon.cooldownMs,
  };
  return shooter;
}
