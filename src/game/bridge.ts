import type { GameOptions } from './config';
import type { EndReason } from './simulation/types';

export type SessionStatus = 'running' | 'paused' | 'ended';
export type PauseReason = 'manual' | 'blur' | 'hidden' | 'orientation';

/** Final numbers of a completed match, used by the result screen and the ranking. */
export interface MatchResult {
  score: number;
  /** Active play time in ms (pauses excluded). */
  elapsedMs: number;
  endReason: EndReason;
  options: GameOptions;
  seed: number;
}

/**
 * The low-frequency view of the game that React renders (R63). It only changes when something
 * the HUD shows changes: the score, a whole second of the timer, health or the status.
 */
export interface HudSnapshot {
  status: SessionStatus;
  pauseReason: PauseReason | null;
  score: number;
  secondsLeft: number;
  health: number;
  maxHealth: number;
  result: MatchResult | null;
}

/**
 * A tiny external store for `useSyncExternalStore`. The game calls `publish` every frame,
 * but listeners (React) are notified only when a value actually changed.
 */
export class HudStore {
  private snapshot: HudSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(initial: HudSnapshot) {
    this.snapshot = initial;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): HudSnapshot => this.snapshot;

  publish(next: HudSnapshot): void {
    if (sameHud(this.snapshot, next)) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  clear(): void {
    this.listeners.clear();
  }
}

function sameHud(a: HudSnapshot, b: HudSnapshot): boolean {
  return (
    a.status === b.status &&
    a.pauseReason === b.pauseReason &&
    a.score === b.score &&
    a.secondsLeft === b.secondsLeft &&
    a.health === b.health &&
    a.maxHealth === b.maxHealth &&
    a.result === b.result
  );
}
