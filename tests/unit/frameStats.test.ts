import { describe, expect, it } from 'vitest';

import { FrameWindow, percentile, summarizeFrames } from '../../src/game/perf/frameStats';

describe('frame statistics', () => {
  it('computes average FPS, p95 and max frame time', () => {
    // 95 frames at 16 ms and 5 slow frames at 40 ms.
    const frames = [
      ...Array.from({ length: 95 }, () => 16),
      ...Array.from({ length: 5 }, () => 40),
    ];
    const summary = summarizeFrames(frames);
    expect(summary.frames).toBe(100);
    expect(summary.p95FrameMs).toBe(16);
    expect(summary.maxFrameMs).toBe(40);
    expect(summary.avgFps).toBeCloseTo(1000 / 17.2, 5);
  });

  it('uses the nearest-rank percentile', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([], 0.95)).toBe(0);
  });

  it('keeps only the most recent frames in the live window', () => {
    const window = new FrameWindow(3);
    for (const ms of [100, 100, 10, 10, 10]) window.push(ms);
    expect(window.summary()).toMatchObject({ frames: 3, maxFrameMs: 10 });
  });
});
