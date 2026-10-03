import { describe, expect, it } from 'vitest';

import { computeViewport, screenToArena } from '../../src/game/render/viewport';

describe('computeViewport', () => {
  it('adds bars on the sides of a wide screen', () => {
    const v = computeViewport(2000, 544, 1920, 1088);
    expect(v.scale).toBe(0.5);
    expect(v.offsetX).toBe(520);
    expect(v.offsetY).toBe(0);
  });

  it('adds bars on top and bottom of a tall screen', () => {
    const v = computeViewport(960, 1000, 1920, 1088);
    expect(v.scale).toBe(0.5);
    expect(v.offsetX).toBe(0);
    expect(v.offsetY).toBe(228);
  });

  it('maps screen points back to arena coordinates', () => {
    const v = computeViewport(2000, 544, 1920, 1088);
    expect(screenToArena({ x: 520, y: 0 }, v)).toEqual({ x: 0, y: 0 });
    expect(screenToArena({ x: 1000, y: 272 }, v)).toEqual({ x: 960, y: 544 });
  });
});
