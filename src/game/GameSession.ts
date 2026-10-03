import type { Ticker } from 'pixi.js';

import { audioEngine } from './audio/AudioEngine';
import { GameAudio } from './audio/GameAudio';
import { HudStore, type HudSnapshot, type PauseReason, type SessionStatus } from './bridge';
import { createMatchConfig, DEFAULT_BALANCE, type GameOptions } from './config';
import { KeyboardInput } from './input/KeyboardInput';
import { TouchInput } from './input/TouchInput';
import { PERF_ENABLED, PerfMonitor } from './perf/PerfMonitor';
import { setCurrentPerfMonitor } from './perf/perfGlobal';
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
import {
  getTestSetup,
  mergeBalance,
  registerTestSession,
  TEST_HOOKS_ENABLED,
  unregisterTestSession,
  type TestSessionControl,
} from './testHooks';

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

const HIT_SHAKE_PX = 6;
const HIT_SHAKE_MS = 180;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Glue between the pure simulation and the browser: owns the PixiJS stage, the fixed-step clock,
 * the inputs, the renderers, the audio and the match. It runs the loop on the PixiJS ticker and
 * handles pause, restart and teardown. React only talks to it through these methods, the HUD
 * store and `touch`.
 */
export class GameSession {
  readonly hud: HudStore;
  /** The on-screen touch buttons write here. */
  readonly touch = new TouchInput();
  /** Frame and entity metrics, only with ?perf (see docs/PERFORMANCE.md). */
  readonly perf: PerfMonitor | null = PERF_ENABLED ? new PerfMonitor() : null;
  private readonly stage: PixiStage;
  private readonly options: GameOptions;
  private readonly keyboard: KeyboardInput;
  private readonly entities: EntityRenderer;
  private readonly audio = new GameAudio(audioEngine);
  private readonly eventListeners = new Set<GameEventListener>();
  /** Reused every frame so reading input never allocates. */
  private readonly input: InputState = { ...EMPTY_INPUT };
  private match: Match;
  private clock: FixedStepClock;
  private status: SessionStatus = 'running';
  private pauseReason: PauseReason | null = null;
  private lastSecondsLeft = -1;
  private destroyed = false;
  /** Test builds only: when true, real time does not advance the match (see testHooks.ts). */
  private frozen = false;

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
    this.hud = new HudStore(this.buildHud(null));

    const { tileSizePx } = this.match.config.arena;
    const obstacles = options.showColliders ? this.match.world.obstacles : undefined;
    stage.world.addChild(createArenaView(DEFAULT_ARENA, options.assets, tileSizePx, obstacles));
    this.entities = new EntityRenderer(options.assets, prefersReducedMotion());
    stage.world.addChild(this.entities.root);
    this.entities.sync(this.match.state, 0);

    this.keyboard = new KeyboardInput(() => {
      this.togglePause();
    });
    this.keyboard.attach();
    this.setGameplayActive(true);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    stage.app.ticker.add(this.tick);
    this.audio.matchStarted();
    if (this.perf) setCurrentPerfMonitor(this.perf);
    if (TEST_HOOKS_ENABLED) {
      this.frozen = getTestSetup().startFrozen;
      registerTestSession(this.testControl);
    }
  }

  /** Read-only access for the HUD, tests and the dev overlay. */
  get matchState(): Match['state'] {
    return this.match.state;
  }

  /** Display object counts for the dev metrics overlay. */
  get displayCounts(): EntityRenderer['displayCounts'] {
    return this.entities.displayCounts;
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
    this.setGameplayActive(false);
    this.audio.paused();
    this.publishHud();
  }

  /** Resuming always needs a player action (button or key), never happens on its own (R40). */
  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.pauseReason = null;
    this.clock.resume();
    this.setGameplayActive(true);
    this.audio.resumed();
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
    this.entities.sync(this.match.state, 0);
    this.status = 'running';
    this.pauseReason = null;
    this.lastSecondsLeft = -1;
    this.setGameplayActive(true);
    this.audio.matchStarted();
    this.publishHud();
  }

  /** Releases listeners, the ticker, sounds, the canvas and every display object (R66). */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (TEST_HOOKS_ENABLED) unregisterTestSession(this.testControl);
    if (this.perf) {
      this.perf.stop();
      setCurrentPerfMonitor(null);
    }
    this.stage.app.ticker.remove(this.tick);
    this.keyboard.detach();
    this.touch.setGameplayActive(false);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.audio.dispose();
    this.eventListeners.clear();
    this.hud.clear();
    this.stage.destroy();
  }

  private createMatch(seed: number | undefined): Match {
    if (TEST_HOOKS_ENABLED) {
      // Test builds may choose the seed and adjust balancing (e.g. no automatic spawns).
      const setup = getTestSetup();
      const balance = mergeBalance(DEFAULT_BALANCE, setup.balance);
      return new Match(
        createMatchConfig(this.options, balance),
        seed ?? setup.seed ?? randomSeed(),
        DEFAULT_ARENA,
      );
    }
    return new Match(createMatchConfig(this.options), seed ?? randomSeed(), DEFAULT_ARENA);
  }

  private createClock(): FixedStepClock {
    const { stepMs, maxFrameDeltaMs } = this.match.config.simulation;
    return new FixedStepClock(stepMs, maxFrameDeltaMs);
  }

  /** Keyboard and touch are always switched together, and both forget held buttons. */
  private setGameplayActive(active: boolean): void {
    this.keyboard.setGameplayActive(active);
    this.touch.setGameplayActive(active);
  }

  private readonly tick = (ticker: Ticker): void => {
    const running = this.status === 'running' && !this.frozen;
    if (running) {
      const steps = this.clock.consumeFrame(ticker.deltaMS);
      // Read input only when a step will use it, so a quick tap is never consumed by a frame
      // that runs zero steps (possible on 120 Hz+ screens).
      if (steps > 0) this.readInput();
      for (let i = 0; i < steps; i++) this.match.step(this.input);
      this.dispatch(this.match.drainEvents());
      this.audio.setSailing(this.input.forward && this.status === 'running');
    }
    // Cosmetic animation freezes while paused, like the simulation.
    const visualDtMs = running ? ticker.deltaMS : 0;
    this.entities.sync(this.match.state, visualDtMs);
    this.stage.updateShake(visualDtMs);
    this.publishHud();
    // elapsedMS is the real frame time; deltaMS is capped by PixiJS (100 ms) and would hide slow frames.
    if (this.perf) this.recordPerf(ticker.elapsedMS);
  };

  private recordPerf(frameMs: number): void {
    const { state } = this.match;
    const display = this.entities.displayCounts;
    this.perf?.frame(frameMs, {
      enemies: state.enemies.length,
      projectiles: state.projectiles.length,
      shipViews: display.ships,
      projectileSprites: display.projectileSprites,
      effects: display.effects,
    });
  }

  /**
   * Runs `ms` of simulated time immediately (test builds). Same steps as a real frame:
   * read input, step, dispatch events, render. Does nothing while the game is paused or over.
   */
  private runSimulatedTime(ms: number): void {
    if (this.status !== 'running') return;
    const steps = this.clock.consumeExact(ms);
    if (steps > 0) this.readInput();
    for (let i = 0; i < steps; i++) this.match.step(this.input);
    this.dispatch(this.match.drainEvents());
    this.entities.sync(this.match.state, ms);
    this.publishHud();
  }

  /** The object window.__PIRATE_TEST__ talks to (only registered in test builds). */
  private readonly testControl: TestSessionControl = {
    snapshot: () => {
      const { state, config, world } = this.match;
      return structuredClone({
        status: this.status,
        pauseReason: this.pauseReason,
        frozen: this.frozen,
        seed: this.match.seed,
        elapsedMs: state.elapsedMs,
        remainingMs: this.match.remainingMs,
        score: state.score,
        endReason: state.endReason,
        player: {
          x: state.player.x,
          y: state.player.y,
          rotation: state.player.rotation,
          health: state.player.health,
          maxHealth: state.player.maxHealth,
          radius: state.player.radius,
          cooldowns: state.player.cooldowns,
        },
        enemies: state.enemies.map((e) => ({
          id: e.id,
          kind: e.kind,
          x: e.x,
          y: e.y,
          rotation: e.rotation,
          health: e.health,
          maxHealth: e.maxHealth,
          radius: e.radius,
        })),
        projectiles: state.projectiles.map((p) => ({
          id: p.id,
          owner: p.owner,
          x: p.x,
          y: p.y,
          dirX: p.dirX,
          dirY: p.dirY,
        })),
        config,
        obstacles: [...world.obstacles],
        display: this.entities.displayCounts,
      });
    },
    setFrozen: (frozen) => {
      this.frozen = frozen;
      // Drop any real time collected before the switch, so nothing jumps.
      if (!frozen) this.clock.resume();
    },
    stepMs: (ms) => {
      this.runSimulatedTime(ms);
    },
    spawnEnemy: (kind, x, y, rotation) => {
      const id = this.match.spawnEnemyAt(kind, x, y, rotation);
      this.dispatch(this.match.drainEvents());
      this.entities.sync(this.match.state, 0);
      return id;
    },
  };

  private readInput(): void {
    Object.assign(this.input, EMPTY_INPUT);
    this.keyboard.readInto(this.input);
    this.touch.readInto(this.input);
  }

  private dispatch(events: readonly GameEvent[]): void {
    const state = this.match.state;
    for (const event of events) {
      this.entities.handleEvent(event, state);
      this.audio.handleEvent(event, state);
      if (event.type === 'playerDamaged' && !prefersReducedMotion()) {
        this.stage.shake(HIT_SHAKE_PX, HIT_SHAKE_MS);
      }
      if (event.type === 'matchEnded') {
        this.status = 'ended';
        this.setGameplayActive(false);
      }
      for (const listener of this.eventListeners) listener(event);
    }
  }

  private publishHud(): void {
    const next = this.buildHud(this.hud.getSnapshot().result);
    if (next.secondsLeft !== this.lastSecondsLeft) {
      if (this.lastSecondsLeft !== -1 && this.status === 'running') {
        this.audio.secondsLeftChanged(next.secondsLeft);
      }
      this.lastSecondsLeft = next.secondsLeft;
    }
    this.hud.publish(next);
  }

  private buildHud(previousResult: HudSnapshot['result']): HudSnapshot {
    const { state } = this.match;
    return {
      status: this.status,
      pauseReason: this.pauseReason,
      score: state.score,
      secondsLeft: Math.ceil(this.match.remainingMs / 1000),
      health: state.player.health,
      maxHealth: state.player.maxHealth,
      // Keep the same result object once created, so the store sees "no change" afterwards.
      result:
        state.endReason === null
          ? null
          : (previousResult ?? {
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
