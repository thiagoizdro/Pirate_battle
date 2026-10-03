import { describe, expect, it } from 'vitest';

import { FixedStepClock } from '../../src/game/simulation/clock';

const STEP = 10;

describe('FixedStepClock', () => {
  it('runs whole steps and carries the remainder to the next frame', () => {
    const clock = new FixedStepClock(STEP, 250);
    expect(clock.consumeFrame(25)).toBe(2);
    expect(clock.consumeFrame(5)).toBe(1); // 5 left over + 5 = 10
    expect(clock.elapsedMs).toBe(30);
  });

  it('gives the same simulated time regardless of frame rate', () => {
    const fast = new FixedStepClock(STEP, 250);
    const slow = new FixedStepClock(STEP, 250);
    for (let i = 0; i < 100; i++) fast.consumeFrame(8);
    for (let i = 0; i < 20; i++) slow.consumeFrame(40);
    expect(fast.elapsedMs).toBe(800);
    expect(slow.elapsedMs).toBe(800);
  });

  it('clamps huge frame gaps', () => {
    const clock = new FixedStepClock(STEP, 100);
    expect(clock.consumeFrame(5000)).toBe(10);
  });

  it('ignores negative deltas', () => {
    const clock = new FixedStepClock(STEP, 100);
    expect(clock.consumeFrame(-50)).toBe(0);
  });

  it('does not advance or accumulate while paused', () => {
    const clock = new FixedStepClock(STEP, 250);
    clock.consumeFrame(7);
    clock.pause();
    expect(clock.consumeFrame(100)).toBe(0);
    clock.resume();
    // The 7 ms left over from before the pause was dropped too.
    expect(clock.consumeFrame(5)).toBe(0);
    expect(clock.elapsedMs).toBe(0);
  });

  it('advances exactly with consumeExact, even when paused', () => {
    const clock = new FixedStepClock(1000 / 60, 250);
    clock.pause();
    expect(clock.consumeExact(1000)).toBe(60);
    expect(clock.elapsedMs).toBeCloseTo(1000, 6);
  });
});
