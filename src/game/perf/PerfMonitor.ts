import { FrameWindow, summarizeFrames, type FrameSummary } from './frameStats';

/**
 * Performance instrumentation (R124–R126), turned on with `?perf` in the URL. It works in the
 * production build on purpose, because the README asks for measurements of an optimized build.
 * Without `?perf` nothing is created and the game pays no cost.
 */
export const PERF_ENABLED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf');

export interface EntityCounts {
  /** Simulation entities. */
  enemies: number;
  projectiles: number;
  /** PixiJS objects. */
  shipViews: number;
  projectileSprites: number;
  effects: number;
}

/** One sample per second of a recording. */
export interface PerfSample extends EntityCounts {
  second: number;
  fps: number;
  p95FrameMs: number;
}

export interface PerfRecording {
  startedAt: string;
  durationMs: number;
  frames: FrameSummary;
  /** Highest simulation entity count seen (player + enemies + projectiles). */
  maxEntities: number;
  avgEntities: number;
  maxDisplayObjects: number;
  samples: PerfSample[];
  environment: {
    userAgent: string;
    devicePixelRatio: number;
    viewport: string;
    hardwareConcurrency: number;
  };
}

interface ActiveRecording {
  startedAt: Date;
  durationMs: number;
  elapsedMs: number;
  frames: number[];
  secondFrames: number[];
  samples: PerfSample[];
  resolve: (recording: PerfRecording) => void;
}

const LIVE_WINDOW_FRAMES = 240;

export class PerfMonitor {
  private readonly live = new FrameWindow(LIVE_WINDOW_FRAMES);
  private latestCounts: EntityCounts = {
    enemies: 0,
    projectiles: 0,
    shipViews: 0,
    projectileSprites: 0,
    effects: 0,
  };
  private recording: ActiveRecording | null = null;

  /** Called by the game session once per rendered frame with the real frame time. */
  frame(frameMs: number, counts: EntityCounts): void {
    this.live.push(frameMs);
    this.latestCounts = counts;
    const rec = this.recording;
    if (!rec) return;
    rec.frames.push(frameMs);
    rec.secondFrames.push(frameMs);
    const before = rec.elapsedMs;
    rec.elapsedMs += frameMs;
    // One sample each time a whole second of recording passes.
    if (Math.floor(rec.elapsedMs / 1000) > Math.floor(before / 1000)) {
      const second = summarizeFrames(rec.secondFrames);
      const sample: PerfSample = {
        second: Math.floor(rec.elapsedMs / 1000),
        fps: Math.round(second.avgFps * 10) / 10,
        p95FrameMs: Math.round(second.p95FrameMs * 100) / 100,
        ...counts,
      };
      rec.samples.push(sample);
      rec.secondFrames = [];
    }
    if (rec.elapsedMs >= rec.durationMs) this.finish(rec);
  }

  liveSummary(): { frames: FrameSummary; counts: EntityCounts; recordingLeftMs: number | null } {
    return {
      frames: this.live.summary(),
      counts: this.latestCounts,
      recordingLeftMs: this.recording ? this.recording.durationMs - this.recording.elapsedMs : null,
    };
  }

  /** Records `durationMs` of real time; resolves with the summary and per-second samples. */
  record(durationMs: number): Promise<PerfRecording> {
    return new Promise((resolve) => {
      this.recording = {
        startedAt: new Date(),
        durationMs,
        elapsedMs: 0,
        frames: [],
        secondFrames: [],
        samples: [],
        resolve,
      };
    });
  }

  /** Ends a running recording early (the battle ended or was left) with what was collected. */
  stop(): void {
    if (this.recording) this.finish(this.recording);
  }

  private finish(rec: ActiveRecording): void {
    this.recording = null;
    const entities = rec.samples.map((s) => 1 + s.enemies + s.projectiles);
    const display = rec.samples.map((s) => s.shipViews + s.projectileSprites + s.effects);
    rec.resolve({
      startedAt: rec.startedAt.toISOString(),
      durationMs: Math.round(rec.elapsedMs),
      frames: summarizeFrames(rec.frames),
      maxEntities: Math.max(0, ...entities),
      avgEntities: entities.length
        ? Math.round((entities.reduce((a, b) => a + b, 0) / entities.length) * 10) / 10
        : 0,
      maxDisplayObjects: Math.max(0, ...display),
      samples: rec.samples,
      environment: {
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
    });
  }
}
