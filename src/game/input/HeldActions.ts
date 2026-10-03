import type { InputState } from '../simulation/types';

export type Action = keyof InputState;

export const ACTIONS: readonly Action[] = [
  'forward',
  'turnLeft',
  'turnRight',
  'fireFront',
  'fireLeft',
  'fireRight',
];

/**
 * Tracks which actions are held by which sources (keys or touch pointers).
 *
 * A very quick tap (press and release before the game reads input) must still count once, or
 * short taps on touch buttons would be lost. So a press is "latched" until the next `readInto`.
 */
export class HeldActions {
  /** For each action, the ids of the keys or pointers holding it. */
  private readonly holders = new Map<Action, Set<string>>();
  private readonly tapped = new Set<Action>();

  press(action: Action, sourceId: string): void {
    let set = this.holders.get(action);
    if (!set) {
      set = new Set();
      this.holders.set(action, set);
    }
    set.add(sourceId);
    this.tapped.add(action);
  }

  release(action: Action, sourceId: string): void {
    this.holders.get(action)?.delete(sourceId);
  }

  /** Forgets everything, including latched taps (used on pause, resume and blur). */
  reset(): void {
    this.holders.clear();
    this.tapped.clear();
  }

  /** ORs this source into `out`, so keyboard and touch can be combined, then clears taps. */
  readInto(out: InputState): void {
    for (const action of ACTIONS) {
      const held = (this.holders.get(action)?.size ?? 0) > 0;
      if (held || this.tapped.has(action)) out[action] = true;
    }
    this.tapped.clear();
  }
}
