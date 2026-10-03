import type { ShipKind } from '../simulation/types';

/**
 * Ship art: ship_N where colour = (N-1) % 6 and damage state = floor((N-1) / 6)
 * (0 intact, 1 damaged, 2 heavily damaged, 3 wrecked). See docs/REQUIREMENTS.md.
 */
const SHIP_COLOUR: Record<ShipKind, number> = { player: 4, chaser: 2, shooter: 1 }; // blue, red, black
export const WRECK_STATE = 3;

export function shipFrame(kind: ShipKind, damageState: number): string {
  return `ship_${SHIP_COLOUR[kind] + 1 + damageState * 6}`;
}

/** Health ratios where the art switches to the next damage state (A23). */
const DAMAGED_BELOW = 2 / 3;
const HEAVILY_DAMAGED_BELOW = 1 / 3;

export function damageState(health: number, maxHealth: number): number {
  if (health <= 0) return WRECK_STATE;
  const ratio = health / maxHealth;
  if (ratio < HEAVILY_DAMAGED_BELOW) return 2;
  if (ratio < DAMAGED_BELOW) return 1;
  return 0;
}
