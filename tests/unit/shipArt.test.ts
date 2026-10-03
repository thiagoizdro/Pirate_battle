import { describe, expect, it } from 'vitest';

import { damageState, shipFrame, WRECK_STATE } from '../../src/game/render/shipArt';

describe('damageState (R43, A23)', () => {
  it.each([
    [100, 0],
    [67, 0],
    [66, 1],
    [34, 1],
    [33, 2],
    [1, 2],
    [0, WRECK_STATE],
  ])('health %i of 100 shows damage state %i', (health, state) => {
    expect(damageState(health, 100)).toBe(state);
  });
});

describe('shipFrame', () => {
  it('picks the same colour in every damage state', () => {
    expect(shipFrame('player', 0)).toBe('ship_5');
    expect(shipFrame('player', 1)).toBe('ship_11');
    expect(shipFrame('player', 2)).toBe('ship_17');
    expect(shipFrame('player', WRECK_STATE)).toBe('ship_23');
    expect(shipFrame('chaser', 0)).toBe('ship_3');
    expect(shipFrame('shooter', 0)).toBe('ship_2');
  });
});
