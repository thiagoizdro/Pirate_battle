import type { InputState } from '../simulation/types';
import { HeldActions, type Action } from './HeldActions';

/**
 * Input from the on-screen joystick and weapon buttons. Each finger holds its own control, so
 * steering with one thumb and firing with the other works at the same time (multi-touch).
 * The React buttons call press/release; the game reads the result every step.
 */
export class TouchInput {
  private readonly actions = new HeldActions();
  private gameplayActive = false;
  private joystickX = 0;
  private joystickY = 0;

  /** Normalized displacement; translate to existing actions without changing ship physics. */
  setJoystick(x: number, y: number): void {
    if (!this.gameplayActive) return;
    this.joystickX = x;
    this.joystickY = y;
  }

  resetJoystick(): void {
    this.joystickX = 0;
    this.joystickY = 0;
  }

  press(action: Action, pointerId: number): void {
    if (!this.gameplayActive) return;
    this.actions.press(action, `pointer-${pointerId}`);
  }

  release(action: Action, pointerId: number): void {
    this.actions.release(action, `pointer-${pointerId}`);
  }

  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    this.actions.reset();
    this.resetJoystick();
  }

  readInto(out: InputState): void {
    this.actions.readInto(out);
    // Unlike weapon taps, joystick directions are never latched: release stops immediately.
    if (this.joystickY < -0.2) out.forward = true;
    if (this.joystickX < -0.2) out.turnLeft = true;
    if (this.joystickX > 0.2) out.turnRight = true;
  }
}
