import type { Ticker } from 'pixi.js';

import { HudStore, type HudSnapshot, type PauseReason, type SessionStatus } from './bridge';
import { createMatchConfig, type GameOptions } from './config';
import { KeyboardInput } from './input/KeyboardInput';
import { createArenaView } from './render/ArenaView';
import type { GameAssets } from './render/assets';
import { EntityRenderer } from './render/EntityRenderer';
import { PixiStage } from './render/PixiStage';
import { DEFAULT_ARENA } from './simulation/arena';
import { FixedStepClock } from './simulation/clock';
import type { GameEvent } from './simulation/events';
import { Match } from './simulation/Match';
import { randomSeed } from './simulation/rng';
import { EMPTY_INPUT, type InputState } from './simulation/types';

export interface GameSessionOptions {
  container: HTMLElement;
  assets: GameAssets;
  /** Snapshot of the player's options; changes after this point never affect the match (R54). */
  options: GameOptions;
  seed?: number;
  /** Dev only: draw collision outlines. */
  showColliders?: boolean;
}

export type GameEventListener = (event: GameEvent) => void;

/**
 * Glue between the pure simulation and the browser: owns the PixiJS stage, the fixed-step clock,
 * the keyboard and the match, runs the loop on the PixiJS ticker, and handles pause, restart and
 * teardown. React only talks to it through these methods and the HUD store.
 */
export class GameSession {
  readonly hud: HudStore;
  private readonly stage: PixiStage;
  private readonly options: GameOptions;
  private readonly keyboard: KeyboardInput;
  private readonly entities: EntityRenderer;
  private readonly eventListeners = new Set<GameEventListener>();
  /** Reused every frame so reading input never allocates. */
  private readonly input: InputState = { ...EMPTY_INPUT };
  private match: Match;
  private clock: FixedStepClock;
  private status: SessionStatus = 'running';
  private pauseReason: PauseReason | null = null;
  private destroyed = false;

  static async create(options: GameSessionOptions): Promise<GameSession> {
    const { widthPx, heightPx } = createMatchConfig(options.options).arena;
    const stage = await PixiStage.create(options.container, widthPx, heightPx);
    return new GameSession(stage, options);
  }

  private constructor(stage: PixiStage, options: GameSessionOptions) {
    this.stage = stage;
    this.options = { ...options.options };
    this.match = this.createMatch(options.seed);
    this.clock = this.createClock();
    this.hud = new HudStore(this.buildHud());

    const { tileSizePx } = this.match.config.arena;
    const obstacles = options.showColliders ? this.match.world.obstacles : undefined;
    stage.world.addChild(createArenaView(DEFAULT_ARENA, options.assets, tileSizePx, obstacles));
    this.entities = new EntityRenderer(options.assets);
    stage.world.addChild(this.entities.root);
    this.entities.sync(this.match.state);

    this.keyboard = new KeyboardInput(() => {
      this.togglePause();
    });
    this.keyboard.attach();
    this.keyboard.setGameplayActive(true);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    stage.app.ticker.add(this.tick);
  }

  /** Read-only access for the HUD, tests and the dev overlay. */
  get matchState(): Match['state'] {
    return this.match.state;
  }

  onEvent(listener: GameEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  pause(reason: PauseReason): void {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.pauseReason = reason;
    this.clock.pause();
    this.keyboard.setGameplayActive(false);
    this.publishHud();
  }

  /** Resuming always needs a player action (button or key), never happens on its own (R40). */
  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.pauseReason = null;
    this.clock.resume();
    this.keyboard.setGameplayActive(true);
    this.publishHud();
  }

  togglePause(): void {
    if (this.status === 'running') this.pause('manual');
    else if (this.status === 'paused') this.resume();
  }

  /** Starts a brand-new match with the same options snapshot and a new seed (R34). */
  restart(seed?: number): void {
    if (this.destroyed) return;
    this.match = this.createMatch(seed);
    this.clock = this.createClock();
    this.entities.reset();
    this.entities.sync(this.match.state);
    this.status = 'running';
    this.pauseReason = null;
    this.keyboard.setGameplayActive(true);
    this.publishHud();
  }

  /** Releases listeners, the ticker, the canvas and every display object (R66). */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stage.app.ticker.remove(this.tick);
    this.keyboard.detach();
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.eventListeners.clear();
    this.hud.clear();
    this.stage.destroy();
  }

  private createMatch(seed: number | undefined): Match {
    return new Match(createMatchConfig(this.options), seed ?? randomSeed(), DEFAULT_ARENA);
  }

  private createClock(): FixedStepClock {
    const { stepMs, maxFrameDeltaMs } = this.match.config.simulation;
    return new FixedStepClock(stepMs, maxFrameDeltaMs);
  }

  private readonly tick = (ticker: Ticker): void => {
    if (this.status === 'running') {
      this.keyboard.read(this.input);
      const steps = this.clock.consumeFrame(ticker.deltaMS);
      for (let i = 0; i < steps; i++) this.match.step(this.input);
      this.dispatch(this.match.drainEvents());
    }
    this.entities.sync(this.match.state);
    this.publishHud();
  };

  private dispatch(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'matchEnded') {
        this.status = 'ended';
        this.keyboard.setGameplayActive(false);
      }
      for (const listener of this.eventListeners) listener(event);
    }
  }

  private publishHud(): void {
    this.hud.publish(this.buildHud());
  }

  private buildHud(): HudSnapshot {
    const { state } = this.match;
    const previous = this.status === 'ended' ? this.hud.getSnapshot().result : null;
    return {
      status: this.status,
      pauseReason: this.pauseReason,
      score: state.score,
      secondsLeft: Math.ceil(this.match.remainingMs / 1000),
      health: state.player.health,
      maxHealth: state.player.maxHealth,
      // Keep the same result object once created, so the store sees "no change" afterwards.
      result:
        previous ??
        (state.endReason === null
          ? null
          : {
              score: state.score,
              elapsedMs: state.elapsedMs,
              endReason: state.endReason,
              options: this.options,
              seed: this.match.seed,
            }),
    };
  }

  private readonly handleWindowBlur = (): void => {
    this.pause('blur');
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.pause('hidden');
  };
}
