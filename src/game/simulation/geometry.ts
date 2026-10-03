export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Axis-aligned rectangle with rounded corners. Islands and rocks both use it:
 * a rock is a square whose corner radius is half its size, which makes it a circle.
 */
export interface RoundedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Distance from a point to the border of a rounded rectangle (negative when inside).
 * Trick: a rounded rect is a smaller "core" rectangle grown by `cornerRadius` in every direction,
 * so we measure the distance to the core and subtract the radius.
 */
export function distanceToRoundedRect(point: Vec2, rect: RoundedRect): number {
  const r = rect.cornerRadius;
  const coreLeft = rect.x + r;
  const coreTop = rect.y + r;
  const coreRight = rect.x + rect.width - r;
  const coreBottom = rect.y + rect.height - r;
  const closestX = clamp(point.x, coreLeft, coreRight);
  const closestY = clamp(point.y, coreTop, coreBottom);
  const outside = Math.hypot(point.x - closestX, point.y - closestY);
  if (outside > 0) return outside - r;
  // Inside the core: negative distance to the nearest core edge, minus the radius.
  const inside = Math.min(
    point.x - coreLeft,
    coreRight - point.x,
    point.y - coreTop,
    coreBottom - point.y,
  );
  return -inside - r;
}

/** True when a circle overlaps the rounded rectangle. */
export function circleHitsRoundedRect(center: Vec2, radius: number, rect: RoundedRect): boolean {
  return distanceToRoundedRect(center, rect) < radius;
}
