import type { InputState } from '../simulation/types';

/**
 * Physical keys (KeyboardEvent.code) mapped to game actions. `code` ignores the keyboard layout,
 * so WASD stays in the same place on AZERTY or Dvorak keyboards.
 */
const BINDINGS: Readonly<Record<string, keyof InputState>> = {
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
 * Turns keyboard events into an InputState. Several keys can be held at once, so moving and
 * firing work together (R16). Game keys are captured only while gameplay is active (R105).
 */
export class KeyboardInput {
  /** Codes currently held down. Two keys can map to one action (W and ArrowUp). */
  private readonly pressed = new Set<string>();
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
    this.reset();
  }

  /** Turning gameplay on or off always forgets held keys, so nothing replays after a pause (R40). */
  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    this.reset();
  }

  reset(): void {
    this.pressed.clear();
  }

  /** Writes the current state into `out` (reused every frame to avoid allocations). */
  read(out: InputState): void {
    out.forward = false;
    out.turnLeft = false;
    out.turnRight = false;
    out.fireFront = false;
    out.fireLeft = false;
    out.fireRight = false;
    for (const code of this.pressed) {
      const action = BINDINGS[code];
      if (action) out[action] = true;
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Leave browser and OS shortcuts (Ctrl+R, Cmd+W...) alone.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (PAUSE_CODES.has(event.code)) {
      event.preventDefault();
      if (!event.repeat) this.onPauseKey();
      return;
    }
    if (!this.gameplayActive || !(event.code in BINDINGS)) return;
    // Stops Space from scrolling the page or clicking a focused button during combat.
    event.preventDefault();
    this.pressed.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!(event.code in BINDINGS)) return;
    this.pressed.delete(event.code);
    if (this.gameplayActive) event.preventDefault();
  };
}
