/** Summary of a list of frame times (ms between two rendered frames). */
export interface FrameSummary {
  frames: number;
  /** Average frames per second over the whole sample. */
  avgFps: number;
  /** 95% of the frames were at least this fast (lower is better). */
  p95FrameMs: number;
  maxFrameMs: number;
  avgFrameMs: number;
}

/** Value below which `fraction` of the sorted values fall (nearest-rank method). */
export function percentile(sortedValues: readonly number[], fraction: number): number {
  if (sortedValues.length === 0) return 0;
  const rank = Math.ceil(fraction * sortedValues.length) - 1;
  return sortedValues[Math.min(sortedValues.length - 1, Math.max(0, rank))] ?? 0;
}

export function summarizeFrames(frameTimesMs: readonly number[]): FrameSummary {
  if (frameTimesMs.length === 0) {
    return { frames: 0, avgFps: 0, p95FrameMs: 0, maxFrameMs: 0, avgFrameMs: 0 };
  }
  const sorted = [...frameTimesMs].sort((a, b) => a - b);
  const total = frameTimesMs.reduce((sum, value) => sum + value, 0);
  const avgFrameMs = total / frameTimesMs.length;
  return {
    frames: frameTimesMs.length,
    avgFps: avgFrameMs > 0 ? 1000 / avgFrameMs : 0,
    p95FrameMs: percentile(sorted, 0.95),
    maxFrameMs: sorted[sorted.length - 1] ?? 0,
    avgFrameMs,
  };
}

/**
 * Fixed-size ring buffer of recent frame times, for the live overlay. Old values are
 * overwritten, so memory use stays constant however long the game runs.
 */
export class FrameWindow {
  private readonly values: number[];
  private next = 0;
  private count = 0;

  constructor(private readonly capacity: number) {
    this.values = new Array<number>(capacity).fill(0);
  }

  push(frameMs: number): void {
    this.values[this.next] = frameMs;
    this.next = (this.next + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }

  summary(): FrameSummary {
    return summarizeFrames(this.values.slice(0, this.count));
  }
}
