import {
  loadAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from '../../storage/audioSettings';

/** Files in public/assets/sounds that the game plays. */
export const SOUND_NAMES = [
  'cannon_broadside',
  'cannon_fire_1',
  'cannon_fire_2',
  'cannon_fire_3',
  'cannonball_water_hit_1',
  'cannonball_water_hit_2',
  'game_complete',
  'game_over',
  'game_pause',
  'game_resume',
  'game_start',
  'health_low',
  'ocean_ambience_loop',
  'score_point',
  'ship_collision',
  'ship_explosion_1',
  'ship_explosion_2',
  'ship_sailing_loop',
  'ship_sinking',
  'ship_wood_hit_1',
  'ship_wood_hit_2',
  'time_warning',
  'ui_back',
  'ui_click',
  'ui_close',
  'ui_hover',
  'ui_open',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

export interface LoopHandle {
  /** Changes this loop's own volume (0..1), with a short fade to avoid clicks. */
  setVolume(volume: number): void;
  stop(): void;
}

/**
 * Small wrapper around the Web Audio API.
 * - One AudioContext for the whole app (browsers limit how many can exist).
 * - Sounds are decoded once and reused, like textures.
 * - Every sound goes through one master GainNode, which applies volume and mute.
 * - A missing or broken sound never breaks the game: it just stays silent.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  /** Every playing source and its own gain node, so both can be disconnected when it ends. */
  private readonly playing = new Map<AudioBufferSourceNode, GainNode>();
  private settings: AudioSettings = loadAudioSettings();
  private readonly listeners = new Set<() => void>();

  /**
   * Creates or resumes the AudioContext. Browsers only allow audio after a user gesture, so the
   * Play button calls this from its click handler.
   */
  unlock(): void {
    const context = this.ensureContext();
    if (context?.state === 'suspended') {
      context.resume().catch(() => undefined);
    }
  }

  /** Fetches and decodes every sound once. Later calls return the same promise. */
  load(): Promise<void> {
    this.loading ??= this.loadAll();
    return this.loading;
  }

  play(name: SoundName, volume = 1, playbackRate = 1): void {
    const context = this.context;
    const buffer = this.buffers.get(name);
    if (!context || !this.master || !buffer || context.state !== 'running') return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    this.track(source, gain);
    source.start();
  }

  /** Starts a looping sound, or returns null if it is not loaded (yet). */
  loop(name: SoundName, volume: number): LoopHandle | null {
    const context = this.context;
    const buffer = this.buffers.get(name);
    if (!context || !this.master || !buffer) return null;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    this.track(source, gain);
    source.start();
    return {
      setVolume: (next) => {
        gain.gain.setTargetAtTime(next, context.currentTime, 0.1);
      },
      stop: () => {
        this.stopSource(source);
      },
    };
  }

  /** Stops every sound that is playing (used when leaving the game screen). */
  stopAll(): void {
    for (const source of [...this.playing.keys()]) this.stopSource(source);
  }

  getSettings = (): AudioSettings => this.settings;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setVolume(volume: number): void {
    this.updateSettings({ ...this.settings, volume: Math.min(1, Math.max(0, volume)) });
  }

  setMuted(muted: boolean): void {
    this.updateSettings({ ...this.settings, muted });
  }

  private updateSettings(next: AudioSettings): void {
    this.settings = next;
    saveAudioSettings(next);
    this.applyMasterGain();
    for (const listener of this.listeners) listener();
  }

  private applyMasterGain(): void {
    if (this.master) this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof AudioContext === 'undefined') return null;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.connect(this.context.destination);
    this.applyMasterGain();
    return this.context;
  }

  private async loadAll(): Promise<void> {
    const context = this.ensureContext();
    if (!context) return;
    const results = await Promise.allSettled(
      SOUND_NAMES.map(async (name) => {
        const response = await fetch(`${import.meta.env.BASE_URL}assets/sounds/${name}.wav`);
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${name}`);
        this.buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
      }),
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed > 0)
      console.warn(`${failed} sound(s) failed to load; the game continues without them.`);
  }

  private track(source: AudioBufferSourceNode, gain: GainNode): void {
    this.playing.set(source, gain);
    source.onended = () => {
      this.release(source);
    };
  }

  private stopSource(source: AudioBufferSourceNode): void {
    if (!this.playing.has(source)) return;
    try {
      source.stop();
    } catch {
      // Already stopped: nothing to do.
    }
    this.release(source);
  }

  private release(source: AudioBufferSourceNode): void {
    const gain = this.playing.get(source);
    if (!gain) return;
    this.playing.delete(source);
    source.disconnect();
    gain.disconnect();
  }
}

/** The single engine shared by the whole app. */
export const audioEngine = new AudioEngine();
