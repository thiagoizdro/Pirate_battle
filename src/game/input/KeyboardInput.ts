import type { InputState } from '../simulation/types';
import { HeldActions, type Action } from './HeldActions';

/**
 * Physical keys (KeyboardEvent.code) mapped to game actions. `code` ignores the keyboard layout,
 * so WASD stays in the same place on AZERTY or Dvorak keyboards.
 */
const BINDINGS: Readonly<Record<string, Action>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
  Space: 'fireFront',
  KeyQ: 'fireLeft',
  KeyE: 'fireRight',
};

const PAUSE_CODES = new Set(['KeyP', 'Escape']);

/**
 * Turns keyboard events into game actions. Several keys can be held at once, so moving and
 * firing work together (R16). Game keys are captured only while gameplay is active (R105).
 */
export class KeyboardInput {
  private readonly actions = new HeldActions();
  private gameplayActive = false;
  private attached = false;
  private readonly onPauseKey: () => void;

  constructor(onPauseKey: () => void) {
    this.onPauseKey = onPauseKey;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.actions.reset();
  }

  /** Turning gameplay on or off always forgets held keys, so nothing replays after a pause (R40). */
  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    this.actions.reset();
  }

  readInto(out: InputState): void {
    this.actions.readInto(out);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Leave browser and OS shortcuts (Ctrl+R, Cmd+W...) alone.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (PAUSE_CODES.has(event.code)) {
      event.preventDefault();
      if (!event.repeat) this.onPauseKey();
      return;
    }
    const action = BINDINGS[event.code];
    if (!this.gameplayActive || !action) return;
    // Stops Space from scrolling the page or clicking a focused button during combat.
    event.preventDefault();
    this.actions.press(action, event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = BINDINGS[event.code];
    if (!action) return;
    this.actions.release(action, event.code);
    if (this.gameplayActive) event.preventDefault();
  };
}
