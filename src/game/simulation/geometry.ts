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

/**
 * If a circle overlaps the rounded rectangle, returns the closest centre position where it just
 * touches the border; otherwise null. Pushing along the surface normal (instead of undoing the
 * move) lets ships slide along a coast instead of getting stuck.
 */
export function pushOutOfRoundedRect(center: Vec2, radius: number, rect: RoundedRect): Vec2 | null {
  const r = rect.cornerRadius;
  const coreLeft = rect.x + r;
  const coreTop = rect.y + r;
  const coreRight = rect.x + rect.width - r;
  const coreBottom = rect.y + rect.height - r;
  const closestX = clamp(center.x, coreLeft, coreRight);
  const closestY = clamp(center.y, coreTop, coreBottom);
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  const outside = Math.hypot(dx, dy);
  const minDistance = r + radius;

  if (outside > 0) {
    if (outside >= minDistance) return null;
    // Move along the direction from the core to the centre until we touch the border.
    return {
      x: closestX + (dx / outside) * minDistance,
      y: closestY + (dy / outside) * minDistance,
    };
  }

  // Centre inside the core (only after a very fast move): leave by the nearest side.
  const exits = [
    { distance: center.x - coreLeft, x: coreLeft - minDistance, y: center.y },
    { distance: coreRight - center.x, x: coreRight + minDistance, y: center.y },
    { distance: center.y - coreTop, x: center.x, y: coreTop - minDistance },
    { distance: coreBottom - center.y, x: center.x, y: coreBottom + minDistance },
  ];
  let best = exits[0];
  for (const exit of exits) if (best === undefined || exit.distance < best.distance) best = exit;
  return best ? { x: best.x, y: best.y } : null;
}

export function circlesOverlap(a: Vec2, radiusA: number, b: Vec2, radiusB: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radii = radiusA + radiusB;
  return dx * dx + dy * dy < radii * radii;
}

/** Wraps an angle into (-PI, PI], so "how much to turn" is always the short way round. */
export function normalizeAngle(angle: number): number {
  let result = angle % (Math.PI * 2);
  if (result <= -Math.PI) result += Math.PI * 2;
  if (result > Math.PI) result -= Math.PI * 2;
  return result;
}

/** Angle (radians) of the vector from `from` to `to`. 0 points right (+x), PI/2 points down (+y). */
export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
