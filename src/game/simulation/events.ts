import type { EndReason, EnemyKind, PlayerWeapon } from './types';

/**
 * Things that happened during a simulation step. The simulation only records them;
 * the renderer (effects), audio and the React HUD decide how to react.
 */
export type GameEvent =
  | {
      type: 'shotFired';
      shooter: 'player' | EnemyKind;
      weapon: PlayerWeapon | 'enemy';
      x: number;
      y: number;
      rotation: number;
    }
  | { type: 'projectileHit'; targetId: number; owner: 'player' | 'enemy'; x: number; y: number }
  | { type: 'projectileBlocked'; x: number; y: number }
  | { type: 'projectileExpired'; x: number; y: number }
  | {
      type: 'playerDamaged';
      amount: number;
      health: number;
      source: 'projectile' | 'chaser';
    }
  | { type: 'enemyDamaged'; id: number; amount: number; health: number }
  | {
      type: 'enemyDestroyed';
      id: number;
      kind: EnemyKind;
      x: number;
      y: number;
      /** False when a Chaser blew itself up on the player: no point is scored (R31). */
      byPlayer: boolean;
    }
  | { type: 'enemySpawned'; id: number; kind: EnemyKind; x: number; y: number }
  | { type: 'scoreChanged'; score: number }
  | { type: 'matchEnded'; reason: EndReason; score: number; elapsedMs: number };

export type GameEventType = GameEvent['type'];
