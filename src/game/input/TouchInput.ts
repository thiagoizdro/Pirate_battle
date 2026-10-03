import type { InputState } from '../simulation/types';
import { HeldActions, type Action } from './HeldActions';

/**
 * Input from the on-screen touch buttons. Each finger (pointer id) holds its own button, so
 * steering with one thumb and firing with the other works at the same time (multi-touch).
 * The React buttons call press/release; the game reads the result every step.
 */
export class TouchInput {
  private readonly actions = new HeldActions();
  private gameplayActive = false;

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
  }

  readInto(out: InputState): void {
    this.actions.readInto(out);
  }
}
