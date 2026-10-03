import type { Vec2 } from '../simulation/geometry';

/**
 * How the fixed-size logical arena fits into the screen (R65).
 * Uniform scale (no stretching) and centred: the leftover space becomes letterbox bars.
 */
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function computeViewport(
  screenWidth: number,
  screenHeight: number,
  arenaWidth: number,
  arenaHeight: number,
): Viewport {
  const scale = Math.max(0, Math.min(screenWidth / arenaWidth, screenHeight / arenaHeight));
  return {
    scale,
    offsetX: (screenWidth - arenaWidth * scale) / 2,
    offsetY: (screenHeight - arenaHeight * scale) / 2,
  };
}

/** Converts a point in CSS pixels, relative to the canvas, into arena coordinates. */
export function screenToArena(point: Vec2, viewport: Viewport): Vec2 {
  if (viewport.scale === 0) return { x: 0, y: 0 };
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale,
  };
}
