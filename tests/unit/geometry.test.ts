import { describe, expect, it } from 'vitest';

import {
  circleHitsRoundedRect,
  distanceToRoundedRect,
  type RoundedRect,
} from '../../src/game/simulation/geometry';

const rect: RoundedRect = { x: 0, y: 0, width: 100, height: 60, cornerRadius: 10 };

describe('distanceToRoundedRect', () => {
  it('is positive outside a straight edge', () => {
    expect(distanceToRoundedRect({ x: 50, y: -20 }, rect)).toBeCloseTo(20);
  });

  it('is negative inside', () => {
    expect(distanceToRoundedRect({ x: 50, y: 30 }, rect)).toBeCloseTo(-30);
  });

  it('follows the rounded corner', () => {
    // The corner circle is centred at (10, 10) with radius 10.
    expect(distanceToRoundedRect({ x: 0, y: 0 }, rect)).toBeCloseTo(Math.hypot(10, 10) - 10);
  });
});

describe('circleHitsRoundedRect', () => {
  it('detects overlap and separation', () => {
    expect(circleHitsRoundedRect({ x: 50, y: -5 }, 6, rect)).toBe(true);
    expect(circleHitsRoundedRect({ x: 50, y: -7 }, 6, rect)).toBe(false);
  });

  it('does not hit in the rounded-off corner area', () => {
    expect(circleHitsRoundedRect({ x: -2, y: -2 }, 3, rect)).toBe(false);
  });
});
