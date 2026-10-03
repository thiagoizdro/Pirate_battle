import type { PauseReason, SessionStatus } from './bridge';
import type { GameBalance, MatchConfig } from './config';
import type { RoundedRect } from './simulation/geometry';
import type { EnemyKind, Player, Projectile } from './simulation/types';

/**
 * Test instrumentation (R120). Exists only in the e2e build (`vite build --mode e2e`, which sets
 * VITE_ENABLE_TEST_HOOKS=true). In the normal build this constant is `false`, so every
 * `if (TEST_HOOKS_ENABLED)` branch is removed by the bundler and `window.__PIRATE_TEST__` never
 * exists in production.
 *
 * Tests may OBSERVE the state, CONTROL the clock, choose the seed and the balancing config, and
 * place an enemy using the normal entity factory. They never edit health, score or positions:
 * combat is always driven through the real keyboard and touch controls.
 */
export const TEST_HOOKS_ENABLED = import.meta.env.VITE_ENABLE_TEST_HOOKS === 'true';

/** Partial balancing changes for the next match, e.g. `{ spawn: { maxEnemies: 0 } }`. */
export type BalanceOverrides = {
  [K in keyof GameBalance]?: GameBalance[K] extends object
    ? Partial<GameBalance[K]>
    : GameBalance[K];
};

export interface TestSnapshot {
  status: SessionStatus;
  pauseReason: PauseReason | null;
  /** True while the test controls the clock (real time does not advance the match). */
  frozen: boolean;
  seed: number;
  elapsedMs: number;
  remainingMs: number;
  score: number;
  endReason: string | null;
  player: Pick<Player, 'x' | 'y' | 'rotation' | 'health' | 'maxHealth' | 'radius' | 'cooldowns'>;
  enemies: {
    id: number;
    kind: EnemyKind;
    x: number;
    y: number;
    rotation: number;
    health: number;
    maxHealth: number;
    radius: number;
  }[];
  projectiles: Pick<Projectile, 'id' | 'owner' | 'x' | 'y' | 'dirX' | 'dirY'>[];
  config: MatchConfig;
  obstacles: RoundedRect[];
  display: { ships: number; projectileSprites: number; effects: number };
}

/** What a GameSession offers to the test API. */
export interface TestSessionControl {
  snapshot(): TestSnapshot;
  setFrozen(frozen: boolean): void;
  /** Runs `ms` of simulated time right now, reading the current input. */
  stepMs(ms: number): void;
  spawnEnemy(kind: EnemyKind, x: number, y: number, rotation: number): number;
}

/** Setup read when a match starts. Tests can preset it before the app loads (see e2e helpers). */
export interface TestSetup {
  seed: number | null;
  balance: BalanceOverrides | null;
  startFrozen: boolean;
}

export interface PirateTestApi {
  hasSession(): boolean;
  state(): TestSnapshot | null;
  /** Freeze the clock: frames keep rendering, but the match only moves with step/advance. */
  pause(): void;
  /** Back to real time. */
  resume(): void;
  /** Advance simulated time synchronously. */
  step(ms: number): void;
  /** Advance simulated time across animation frames (rendering and effects run in between). */
  advance(ms: number): Promise<void>;
  setSeed(seed: number | null): void;
  setBalance(overrides: BalanceOverrides | null): void;
  setStartFrozen(frozen: boolean): void;
  spawnEnemy(kind: EnemyKind, x: number, y: number, rotation?: number): number;
}

declare global {
  interface Window {
    __PIRATE_TEST__?: PirateTestApi;
    /** Optional preset written by Playwright's addInitScript before the app starts. */
    __PIRATE_TEST_SETUP__?: Partial<TestSetup>;
  }
}

let current: TestSessionControl | null = null;
const setup: TestSetup = { seed: null, balance: null, startFrozen: false };

export function getTestSetup(): TestSetup {
  return setup;
}

export function registerTestSession(session: TestSessionControl): void {
  current = session;
}

export function unregisterTestSession(session: TestSessionControl): void {
  if (current === session) current = null;
}

function requireSession(): TestSessionControl {
  if (!current) throw new Error('No battle is running');
  return current;
}

const ADVANCE_CHUNK_MS = 250;

/** Installs window.__PIRATE_TEST__ (only called when TEST_HOOKS_ENABLED). */
export function installTestHooks(): void {
  Object.assign(setup, window.__PIRATE_TEST_SETUP__ ?? {});
  window.__PIRATE_TEST__ = {
    hasSession: () => current !== null,
    state: () => current?.snapshot() ?? null,
    pause: () => {
      requireSession().setFrozen(true);
    },
    resume: () => {
      requireSession().setFrozen(false);
    },
    step: (ms) => {
      requireSession().stepMs(ms);
    },
    advance: async (ms) => {
      let left = ms;
      while (left > 0) {
        const chunk = Math.min(ADVANCE_CHUNK_MS, left);
        requireSession().stepMs(chunk);
        left -= chunk;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    },
    setSeed: (seed) => {
      setup.seed = seed;
    },
    setBalance: (overrides) => {
      setup.balance = overrides;
    },
    setStartFrozen: (frozen) => {
      setup.startFrozen = frozen;
    },
    spawnEnemy: (kind, x, y, rotation = 0) => requireSession().spawnEnemy(kind, x, y, rotation),
  };
}

/** Applies overrides one level deep, which covers every group in GameBalance. */
export function mergeBalance(base: GameBalance, overrides: BalanceOverrides | null): GameBalance {
  if (!overrides) return base;
  const merged: Record<string, unknown> = { ...base };
  // Values come from a test script, so treat them as unknown and check them at runtime.
  for (const [key, value] of Object.entries(overrides) as [string, unknown][]) {
    const original: unknown = merged[key];
    merged[key] =
      typeof value === 'object' &&
      value !== null &&
      typeof original === 'object' &&
      original !== null
        ? { ...original, ...value }
        : value;
  }
  return merged as unknown as GameBalance;
}
