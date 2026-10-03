import { describe, expect, it } from 'vitest';

import { HeldActions } from '../../src/game/input/HeldActions';
import { EMPTY_INPUT, type InputState } from '../../src/game/simulation/types';

function read(actions: HeldActions): InputState {
  const out = { ...EMPTY_INPUT };
  actions.readInto(out);
  return out;
}

describe('HeldActions', () => {
  it('reports held actions until they are released', () => {
    const actions = new HeldActions();
    actions.press('forward', 'KeyW');
    expect(read(actions).forward).toBe(true);
    expect(read(actions).forward).toBe(true);
    actions.release('forward', 'KeyW');
    expect(read(actions).forward).toBe(false);
  });

  it('keeps a quick tap for exactly one read', () => {
    const actions = new HeldActions();
    actions.press('fireFront', 'pointer-1');
    actions.release('fireFront', 'pointer-1');
    expect(read(actions).fireFront).toBe(true);
    expect(read(actions).fireFront).toBe(false);
  });

  it('keeps an action held while any of its sources still holds it', () => {
    const actions = new HeldActions();
    actions.press('forward', 'KeyW');
    actions.press('forward', 'ArrowUp');
    actions.release('forward', 'KeyW');
    read(actions);
    expect(read(actions).forward).toBe(true);
  });

  it('allows simultaneous actions from different fingers', () => {
    const actions = new HeldActions();
    actions.press('turnLeft', 'pointer-1');
    actions.press('fireRight', 'pointer-2');
    const state = read(actions);
    expect(state.turnLeft && state.fireRight).toBe(true);
  });

  it('forgets everything on reset, including taps', () => {
    const actions = new HeldActions();
    actions.press('fireLeft', 'KeyQ');
    actions.reset();
    expect(read(actions)).toEqual(EMPTY_INPUT);
  });

  it('only adds to the output, so keyboard and touch combine', () => {
    const keyboard = new HeldActions();
    const touch = new HeldActions();
    keyboard.press('forward', 'KeyW');
    touch.press('fireFront', 'pointer-7');
    const out = { ...EMPTY_INPUT };
    keyboard.readInto(out);
    touch.readInto(out);
    expect(out.forward && out.fireFront).toBe(true);
  });
});
