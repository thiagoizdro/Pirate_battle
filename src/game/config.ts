// Single source of truth for gameplay balancing (R52).
// Units are in the names: px = logical arena pixels, Ms = simulated milliseconds, Rad = radians.
// Systems read these values from a frozen MatchConfig snapshot and never hardcode numbers.

/** Bump when balancing changes, so ranking only compares matches played with the same rules (A9). */
export const BALANCE_VERSION = 1;

/** Limits for the two values the player can change in Options (R30, R53, A2, A3). */
export const OPTION_LIMITS = {
  sessionSeconds: { min: 60, max: 180, step: 10, default: 120 },
  spawnIntervalSeconds: { min: 1, max: 10, step: 0.5, default: 3 },
} as const;

export interface GameOptions {
  sessionSeconds: number;
  spawnIntervalSeconds: number;
}

export const DEFAULT_OPTIONS: GameOptions = {
  sessionSeconds: OPTION_LIMITS.sessionSeconds.default,
  spawnIntervalSeconds: OPTION_LIMITS.spawnIntervalSeconds.default,
};

export interface WeaponConfig {
  cooldownMs: number;
  damage: number;
  projectileSpeedPx: number;
  projectileRangePx: number;
  projectileLifetimeMs: number;
  projectileRadiusPx: number;
}

export interface BroadsideConfig extends WeaponConfig {
  projectileCount: number;
  /** Distance between the parallel projectiles of one broadside. */
  spacingPx: number;
}

export interface ShipStats {
  maxHealth: number;
  moveSpeedPx: number;
  rotationSpeedRad: number;
  radiusPx: number;
}

export interface ShooterConfig extends ShipStats {
  attackRangePx: number;
  /** The Shooter stops approaching at this distance and keeps firing. */
  preferredDistancePx: number;
  /** Fires only when the player is within this angle of its bow. */
  aimToleranceRad: number;
  weapon: WeaponConfig;
}

export interface ChaserConfig extends ShipStats {
  contactDamage: number;
}

export interface GameBalance {
  balanceVersion: number;
  arena: { widthPx: number; heightPx: number; tileSizePx: number };
  simulation: {
    /** Fixed timestep of the simulation (60 updates per simulated second). */
    stepMs: number;
    /** Larger real frame gaps (tab switch, debugger) are clamped to avoid a burst of updates. */
    maxFrameDeltaMs: number;
  };
  player: ShipStats & { front: WeaponConfig; broadside: BroadsideConfig };
  chaser: ChaserConfig;
  shooter: ShooterConfig;
  ai: {
    /** How far ahead enemies probe for islands ("whiskers") to steer around them. */
    lookAheadPx: number;
    /** Angle of the left and right whiskers relative to the bow. */
    whiskerAngleRad: number;
  };
  spawn: {
    /** Probability that a spawned enemy is a Chaser; the rest are Shooters (A15). */
    chaserRatio: number;
    maxEnemies: number;
    minDistanceFromPlayerPx: number;
    /** Spawn points keep this distance from arena edges and islands. */
    clearancePx: number;
    maxAttempts: number;
  };
}

export const DEFAULT_BALANCE: GameBalance = {
  balanceVersion: BALANCE_VERSION,
  arena: { widthPx: 1920, heightPx: 1088, tileSizePx: 64 },
  simulation: { stepMs: 1000 / 60, maxFrameDeltaMs: 250 },
  player: {
    maxHealth: 100,
    moveSpeedPx: 170,
    rotationSpeedRad: 2.4,
    radiusPx: 26,
    front: {
      cooldownMs: 500,
      damage: 25,
      projectileSpeedPx: 520,
      projectileRangePx: 520,
      projectileLifetimeMs: 1200,
      projectileRadiusPx: 5,
    },
    broadside: {
      cooldownMs: 1500,
      damage: 20,
      projectileSpeedPx: 460,
      projectileRangePx: 380,
      projectileLifetimeMs: 1000,
      projectileRadiusPx: 5,
      projectileCount: 3,
      spacingPx: 22,
    },
  },
  chaser: {
    maxHealth: 40,
    moveSpeedPx: 150,
    rotationSpeedRad: 2.2,
    radiusPx: 24,
    contactDamage: 20,
  },
  shooter: {
    maxHealth: 60,
    moveSpeedPx: 110,
    rotationSpeedRad: 1.8,
    radiusPx: 26,
    attackRangePx: 380,
    preferredDistancePx: 300,
    aimToleranceRad: 0.2,
    weapon: {
      cooldownMs: 1800,
      damage: 10,
      projectileSpeedPx: 380,
      projectileRangePx: 450,
      projectileLifetimeMs: 1400,
      projectileRadiusPx: 5,
    },
  },
  ai: {
    lookAheadPx: 90,
    whiskerAngleRad: 0.6,
  },
  spawn: {
    chaserRatio: 0.6,
    maxEnemies: 25,
    minDistanceFromPlayerPx: 450,
    clearancePx: 48,
    maxAttempts: 30,
  },
};

/** Everything one match needs. Frozen at match start so later Options changes never leak in (R54). */
export interface MatchConfig extends GameBalance {
  sessionMs: number;
  spawnIntervalMs: number;
}

export type OptionField = keyof GameOptions;
export type OptionErrors = Partial<Record<OptionField, string>>;

/** Returns one readable error per invalid field; an empty object means the options are valid. */
export function validateOptions(options: GameOptions): OptionErrors {
  const errors: OptionErrors = {};
  const session = OPTION_LIMITS.sessionSeconds;
  if (
    !Number.isInteger(options.sessionSeconds) ||
    options.sessionSeconds < session.min ||
    options.sessionSeconds > session.max
  ) {
    errors.sessionSeconds = `Enter a whole number of seconds between ${session.min} and ${session.max}.`;
  }
  const spawn = OPTION_LIMITS.spawnIntervalSeconds;
  const isOnStep = Number.isInteger(options.spawnIntervalSeconds / spawn.step);
  if (
    !Number.isFinite(options.spawnIntervalSeconds) ||
    options.spawnIntervalSeconds < spawn.min ||
    options.spawnIntervalSeconds > spawn.max ||
    !isOnStep
  ) {
    errors.spawnIntervalSeconds = `Enter a value between ${spawn.min} and ${spawn.max} seconds, in steps of ${spawn.step}.`;
  }
  return errors;
}

/** Ranking groups matches by this key (A9), e.g. "v1-120s-3s". */
export function configKey(options: GameOptions, balanceVersion = BALANCE_VERSION): string {
  return `v${balanceVersion}-${options.sessionSeconds}s-${options.spawnIntervalSeconds}s`;
}

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null) deepFreeze(child as object);
  }
  return Object.freeze(value);
}

/** Builds the immutable snapshot used by one match. Throws on invalid options: callers validate first. */
export function createMatchConfig(
  options: GameOptions,
  balance: GameBalance = DEFAULT_BALANCE,
): Readonly<MatchConfig> {
  const errors = validateOptions(options);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Invalid game options: ${JSON.stringify(errors)}`);
  }
  const snapshot: MatchConfig = {
    ...structuredClone(balance),
    sessionMs: options.sessionSeconds * 1000,
    spawnIntervalMs: options.spawnIntervalSeconds * 1000,
  };
  return deepFreeze(snapshot);
}
