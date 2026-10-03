/** What the player is asking for right now. Keyboard and touch both write into this shape. */
export interface InputState {
  forward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  fireFront: boolean;
  fireLeft: boolean;
  fireRight: boolean;
}

export const EMPTY_INPUT: Readonly<InputState> = Object.freeze({
  forward: false,
  turnLeft: false,
  turnRight: false,
  fireFront: false,
  fireLeft: false,
  fireRight: false,
});

export type EnemyKind = 'chaser' | 'shooter';
export type ShipKind = 'player' | EnemyKind;
export type PlayerWeapon = 'front' | 'left' | 'right';
export type EndReason = 'time_up' | 'defeated';

/**
 * Fields shared by every ship. `rotation` is in radians: 0 faces right (+x) and positive angles
 * turn clockwise on screen, because the y axis points down.
 */
export interface ShipBase {
  id: number;
  x: number;
  y: number;
  rotation: number;
  health: number;
  maxHealth: number;
  radius: number;
  /** False as soon as the ship is destroyed; it then stops moving, firing and colliding (R29). */
  alive: boolean;
}

export interface Player extends ShipBase {
  kind: 'player';
  /** Milliseconds left before each weapon can fire again (R28). */
  cooldowns: Record<PlayerWeapon, number>;
}

export interface Chaser extends ShipBase {
  kind: 'chaser';
}

export interface Shooter extends ShipBase {
  kind: 'shooter';
  fireCooldownMs: number;
}

export type Enemy = Chaser | Shooter;
export type Ship = Player | Enemy;

export interface Projectile {
  id: number;
  owner: 'player' | 'enemy';
  x: number;
  y: number;
  /** Unit vector of travel. */
  dirX: number;
  dirY: number;
  speedPx: number;
  damage: number;
  radius: number;
  traveledPx: number;
  rangePx: number;
  ageMs: number;
  lifetimeMs: number;
}

export interface MatchState {
  status: 'running' | 'ended';
  endReason: EndReason | null;
  /** Simulated active time; pauses never count (A6). */
  elapsedMs: number;
  score: number;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  /** Time accumulated towards the next spawn. */
  spawnTimerMs: number;
  /** How many enemies have spawned so far (the first two are one of each type). */
  spawnCount: number;
  nextId: number;
}
