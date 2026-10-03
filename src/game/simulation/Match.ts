import type { MatchConfig } from '../config';
import { buildObstacles, DEFAULT_ARENA, type ArenaMap } from './arena';
import type { StepContext, World } from './context';
import { createPlayer } from './entities';
import type { GameEvent } from './events';
import { SeededRng } from './rng';
import { updateEnemies } from './systems/ai';
import { resolveContacts } from './systems/contacts';
import { updatePlayer } from './systems/player';
import { updateProjectiles } from './systems/projectiles';
import { updateSpawns } from './systems/spawn';
import type { EndReason, InputState, MatchState } from './types';

/**
 * One match: its frozen config, its state and its rules. Pure TypeScript, no rendering and no
 * wall-clock time: the caller decides when to call `step()`, and each call advances exactly
 * one fixed timestep. Same config + seed + inputs always give the same result.
 */
export class Match {
  readonly config: Readonly<MatchConfig>;
  readonly state: MatchState;
  readonly world: World;
  readonly seed: number;
  private readonly rng: SeededRng;
  /** Number of steps that make up the whole session; counting integers avoids float drift. */
  private readonly totalSteps: number;
  private stepsTaken = 0;
  private events: GameEvent[] = [];
  private readonly context: StepContext;

  constructor(config: Readonly<MatchConfig>, seed: number, map: ArenaMap = DEFAULT_ARENA) {
    this.config = config;
    this.seed = seed;
    this.rng = new SeededRng(seed);
    this.totalSteps = Math.round(config.sessionMs / config.simulation.stepMs);
    this.world = {
      width: config.arena.widthPx,
      height: config.arena.heightPx,
      obstacles: buildObstacles(map, config.arena.tileSizePx),
    };
    const start = map.playerStart;
    this.state = {
      status: 'running',
      endReason: null,
      elapsedMs: 0,
      score: 0,
      player: createPlayer(config, 1, start.x, start.y, start.rotation),
      enemies: [],
      projectiles: [],
      spawnTimerMs: 0,
      spawnCount: 0,
      nextId: 2,
    };
    this.context = {
      config,
      state: this.state,
      world: this.world,
      rng: this.rng,
      dtMs: config.simulation.stepMs,
      emit: (event) => {
        this.events.push(event);
      },
    };
  }

  get remainingMs(): number {
    return Math.max(0, this.config.sessionMs - this.state.elapsedMs);
  }

  /** Advances the match by one fixed step. Does nothing once the match has ended (R33). */
  step(input: Readonly<InputState>): void {
    if (this.state.status === 'ended') return;
    const ctx = this.context;

    this.stepsTaken++;
    this.state.elapsedMs = Math.min(this.stepsTaken * ctx.dtMs, this.config.sessionMs);

    updatePlayer(ctx, input);
    updateEnemies(ctx);
    updateProjectiles(ctx);
    resolveContacts(ctx);
    // Destroyed enemies leave the list at the end of the step; until then every system skips them.
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.alive);
    updateSpawns(ctx);

    if (!this.state.player.alive) this.end('defeated');
    else if (this.stepsTaken >= this.totalSteps) this.end('time_up');
  }

  /** Returns the events produced since the last call, and clears the buffer. */
  drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  private end(reason: EndReason): void {
    this.state.status = 'ended';
    this.state.endReason = reason;
    this.events.push({
      type: 'matchEnded',
      reason,
      score: this.state.score,
      elapsedMs: this.state.elapsedMs,
    });
  }
}
