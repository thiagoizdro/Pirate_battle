import type { GameEvent } from '../simulation/events';
import type { MatchState } from '../simulation/types';
import type { AudioEngine, LoopHandle, SoundName } from './AudioEngine';

const CANNON_SOUNDS: readonly SoundName[] = ['cannon_fire_1', 'cannon_fire_2', 'cannon_fire_3'];
const WOOD_HITS: readonly SoundName[] = ['ship_wood_hit_1', 'ship_wood_hit_2'];
const WATER_HITS: readonly SoundName[] = ['cannonball_water_hit_1', 'cannonball_water_hit_2'];
const EXPLOSIONS: readonly SoundName[] = ['ship_explosion_1', 'ship_explosion_2'];

/** Seconds left at which the time warning plays. */
const TIME_WARNINGS = new Set([30, 10]);
const LOW_HEALTH_RATIO = 0.25;
const AMBIENCE_VOLUME = 0.35;
const SAILING_VOLUME = 0.25;

/** Variety only: which of several similar sounds plays never affects the rules. */
function pick(sounds: readonly SoundName[]): SoundName {
  return sounds[Math.floor(Math.random() * sounds.length)] ?? sounds[0] ?? 'ui_click';
}

/**
 * Sound for one game session, driven by simulation events and session state changes.
 * The simulation never knows sounds exist.
 */
export class GameAudio {
  private readonly engine: AudioEngine;
  private ambience: LoopHandle | null = null;
  private sailing: LoopHandle | null = null;
  private sailingOn = false;
  /** True while the match is running, so loops start as soon as the sounds finish loading. */
  private wantLoops = false;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  matchStarted(): void {
    this.engine.play('game_start', 0.8);
    this.startLoops();
  }

  paused(): void {
    this.stopLoops();
    this.engine.play('game_pause');
  }

  resumed(): void {
    this.engine.play('game_resume');
    this.startLoops();
  }

  /** Fades the sailing loop in while the player holds "forward". */
  setSailing(sailing: boolean): void {
    if (sailing === this.sailingOn) return;
    this.sailingOn = sailing;
    this.sailing?.setVolume(sailing ? SAILING_VOLUME : 0);
  }

  secondsLeftChanged(secondsLeft: number): void {
    if (TIME_WARNINGS.has(secondsLeft)) this.engine.play('time_warning');
  }

  handleEvent(event: GameEvent, state: MatchState): void {
    switch (event.type) {
      case 'shotFired':
        if (event.shooter === 'player') {
          this.engine.play(
            event.weapon === 'front' ? pick(CANNON_SOUNDS) : 'cannon_broadside',
            0.7,
          );
        } else {
          this.engine.play(pick(CANNON_SOUNDS), 0.35, 1.15);
        }
        break;
      case 'projectileHit':
        this.engine.play(pick(WOOD_HITS), 0.8);
        break;
      case 'projectileExpired':
      case 'projectileBlocked':
        this.engine.play(pick(WATER_HITS), 0.4);
        break;
      case 'playerDamaged': {
        const before = (event.health + event.amount) / state.player.maxHealth;
        const after = event.health / state.player.maxHealth;
        if (event.health > 0 && before >= LOW_HEALTH_RATIO && after < LOW_HEALTH_RATIO) {
          this.engine.play('health_low');
        }
        break;
      }
      case 'enemyDestroyed':
        if (!event.byPlayer) this.engine.play('ship_collision');
        this.engine.play(pick(EXPLOSIONS), 0.8);
        break;
      case 'scoreChanged':
        this.engine.play('score_point', 0.5);
        break;
      case 'matchEnded':
        this.stopLoops();
        if (event.reason === 'defeated') {
          this.engine.play('ship_sinking');
          this.engine.play('game_over');
        } else {
          this.engine.play('game_complete');
        }
        break;
      default:
        break;
    }
  }

  /** Stops this session's loops. One-shot sounds still playing are stopped by the engine. */
  dispose(): void {
    this.stopLoops();
    this.engine.stopAll();
  }

  private startLoops(): void {
    this.stopLoops();
    this.wantLoops = true;
    if (!this.tryStartLoops()) {
      void this.engine.load().then(() => {
        if (this.wantLoops && !this.ambience) this.tryStartLoops();
      });
    }
  }

  /** Returns false when the loop sounds are not decoded yet. */
  private tryStartLoops(): boolean {
    this.ambience = this.engine.loop('ocean_ambience_loop', AMBIENCE_VOLUME);
    this.sailing = this.engine.loop('ship_sailing_loop', 0);
    this.sailingOn = false;
    return this.ambience !== null;
  }

  private stopLoops(): void {
    this.wantLoops = false;
    this.ambience?.stop();
    this.sailing?.stop();
    this.ambience = null;
    this.sailing = null;
  }
}
