import { describe, expect, it } from 'vitest';

import { SeededRng } from '../../src/game/simulation/rng';

describe('SeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    expect(new SeededRng(1).next()).not.toBe(new SeededRng(2).next());
  });

  it('stays within [0, 1) and within range bounds', () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const ranged = rng.range(10, 20);
      expect(ranged).toBeGreaterThanOrEqual(10);
      expect(ranged).toBeLessThan(20);
    }
  });

  it('respects chance probabilities roughly', () => {
    const rng = new SeededRng(123);
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (rng.chance(0.6)) hits++;
    expect(hits / 10000).toBeCloseTo(0.6, 1);
  });
});
