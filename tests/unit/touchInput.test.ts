import { describe, expect, it } from 'vitest';

import { HeldActions } from '../../src/game/input/HeldActions';
import { TouchInput } from '../../src/game/input/TouchInput';
import { EMPTY_INPUT } from '../../src/game/simulation/types';
import { makeMatch, NO_SPAWNS, run } from './helpers';

function read(touch: TouchInput) {
  const out = { ...EMPTY_INPUT };
  touch.readInto(out);
  return out;
}

function activeTouch() {
  const touch = new TouchInput();
  touch.setGameplayActive(true);
  return touch;
}

describe('mobile joystick input', () => {
  it.each([
    [0, false, false],
    [-0.7, true, false],
    [0.7, false, true],
  ])('moves forward with horizontal displacement %s', (x, turnLeft, turnRight) => {
    const touch = activeTouch();
    touch.setJoystick(x, -0.7);
    const input = read(touch);
    expect(input).toEqual({ ...EMPTY_INPUT, forward: true, turnLeft, turnRight });
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 30, input);
    expect(match.state.player.x).toBeGreaterThan(960);
    if (turnLeft) {
      expect(match.state.player.rotation).toBeLessThan(0);
      expect(match.state.player.y).toBeLessThan(544);
    } else if (turnRight) {
      expect(match.state.player.rotation).toBeGreaterThan(0);
      expect(match.state.player.y).toBeGreaterThan(544);
    } else {
      expect(match.state.player.rotation).toBe(0);
      expect(match.state.player.y).toBe(544);
    }
  });

  it('changes direction without latching the previous turn', () => {
    const touch = activeTouch();
    touch.setJoystick(-0.7, -0.7);
    touch.setJoystick(0.7, -0.7);
    expect(read(touch)).toEqual({ ...EMPTY_INPUT, forward: true, turnRight: true });
  });

  it('stops immediately on release, even before the first game read', () => {
    const touch = activeTouch();
    touch.setJoystick(-0.7, -0.7);
    touch.resetJoystick();
    expect(read(touch)).toEqual(EMPTY_INPUT);
    expect(read(touch)).toEqual(EMPTY_INPUT);
  });

  it('ignores neutral jitter and does not introduce reverse movement', () => {
    const touch = activeTouch();
    touch.setJoystick(0.19, -0.19);
    expect(read(touch)).toEqual(EMPTY_INPUT);
    touch.setJoystick(-1, 0);
    expect(read(touch)).toEqual({ ...EMPTY_INPUT, turnLeft: true });
    touch.setJoystick(0, 1);
    expect(read(touch)).toEqual(EMPTY_INPUT);
  });

  it('keeps weapon fingers independent of joystick release', () => {
    const touch = activeTouch();
    touch.setJoystick(0.7, -0.7);
    touch.press('fireFront', 2);
    expect(read(touch)).toEqual({
      ...EMPTY_INPUT,
      forward: true,
      turnRight: true,
      fireFront: true,
    });
    touch.resetJoystick();
    expect(read(touch)).toEqual({ ...EMPTY_INPUT, fireFront: true });
    touch.release('fireFront', 2);
    expect(read(touch)).toEqual(EMPTY_INPUT);
  });

  it('clears steering on pause and ignores input while inactive', () => {
    const touch = activeTouch();
    touch.setJoystick(-1, -1);
    touch.setGameplayActive(false);
    touch.setJoystick(1, -1);
    touch.press('fireFront', 2);
    touch.setGameplayActive(true);
    expect(read(touch)).toEqual(EMPTY_INPUT);
  });

  it('adds to keyboard actions without clearing them', () => {
    const touch = activeTouch();
    const keyboard = new HeldActions();
    keyboard.press('forward', 'KeyW');
    keyboard.press('turnLeft', 'KeyA');
    touch.press('fireFront', 2);
    touch.resetJoystick();
    const out = { ...EMPTY_INPUT };
    keyboard.readInto(out);
    touch.readInto(out);
    expect(out).toEqual({ ...EMPTY_INPUT, forward: true, turnLeft: true, fireFront: true });
  });
});
