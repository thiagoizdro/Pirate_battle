import type { MatchConfig } from '../config';
import type { GameEvent } from './events';
import type { RoundedRect } from './geometry';
import type { SeededRng } from './rng';
import type { MatchState } from './types';

/** The static space ships live in: arena size and blocking obstacles. */
export interface World {
  readonly width: number;
  readonly height: number;
  readonly obstacles: readonly RoundedRect[];
}

/** Everything a system needs during one step. Systems are plain functions that receive it. */
export interface StepContext {
  readonly config: Readonly<MatchConfig>;
  readonly state: MatchState;
  readonly world: World;
  readonly rng: SeededRng;
  /** Duration of this step in simulated milliseconds. */
  readonly dtMs: number;
  emit(event: GameEvent): void;
}
