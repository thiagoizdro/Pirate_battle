import {
  createMatchConfig,
  DEFAULT_BALANCE,
  DEFAULT_OPTIONS,
  type GameBalance,
  type GameOptions,
} from '../../src/game/config';
import type { ArenaMap } from '../../src/game/simulation/arena';
import { createEnemy } from '../../src/game/simulation/entities';
import type { GameEvent } from '../../src/game/simulation/events';
import { Match } from '../../src/game/simulation/Match';
import { EMPTY_INPUT, type Enemy, type InputState } from '../../src/game/simulation/types';

/** A map with no islands or rocks, so a test controls every obstacle it needs. */
export const OPEN_MAP: ArenaMap = {
  cols: 30,
  rows: 17,
  islands: [],
  rocks: [],
  playerStart: { x: 960, y: 544, rotation: 0 },
};

export interface MatchSetup {
  options?: Partial<GameOptions>;
  balance?: Partial<GameBalance>;
  map?: ArenaMap;
  seed?: number;
}

export function makeMatch(setup: MatchSetup = {}): Match {
  const config = createMatchConfig(
    { ...DEFAULT_OPTIONS, ...setup.options },
    { ...DEFAULT_BALANCE, ...setup.balance },
  );
  return new Match(config, setup.seed ?? 1, setup.map ?? OPEN_MAP);
}

/** Builds an input with only the given buttons held. */
export function input(held: Partial<InputState> = {}): InputState {
  return { ...EMPTY_INPUT, ...held };
}

/** Runs `steps` steps with the same input and returns every event produced. */
export function run(match: Match, steps: number, held: Partial<InputState> = {}): GameEvent[] {
  const state = input(held);
  const events: GameEvent[] = [];
  for (let i = 0; i < steps; i++) {
    match.step(state);
    events.push(...match.drainEvents());
  }
  return events;
}

export function stepsFor(match: Match, ms: number): number {
  return Math.round(ms / match.config.simulation.stepMs);
}

/**
 * Unit-test setup only: places an enemy directly in the state. E2E tests never do this;
 * they drive the real game through its controls.
 */
export function placeEnemy<K extends Enemy['kind']>(
  match: Match,
  kind: K,
  x: number,
  y: number,
  rotation = 0,
): Extract<Enemy, { kind: K }> {
  const enemy = createEnemy(match.config, kind, match.state.nextId++, x, y, rotation);
  if (!isKind(enemy, kind)) throw new Error('createEnemy returned the wrong kind');
  match.state.enemies.push(enemy);
  return enemy;
}

function isKind<K extends Enemy['kind']>(
  enemy: Enemy,
  kind: K,
): enemy is Extract<Enemy, { kind: K }> {
  return enemy.kind === kind;
}

/** Turns spawning off: with a cap of zero enemies, every spawn is skipped. */
export const NO_SPAWNS: Partial<GameBalance> = {
  spawn: { ...DEFAULT_BALANCE.spawn, maxEnemies: 0 },
};

export function ofType<T extends GameEvent['type']>(
  events: GameEvent[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}
