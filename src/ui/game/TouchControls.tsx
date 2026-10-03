import type { PointerEvent } from 'react';

import type { Action } from '../../game/input/HeldActions';
import type { TouchInput } from '../../game/input/TouchInput';
import styles from './TouchControls.module.css';

interface ControlButton {
  action: Action;
  label: string;
  icon: string;
}

const ICONS = `${import.meta.env.BASE_URL}assets/ui/controls`;

const STEERING: readonly ControlButton[] = [
  { action: 'turnLeft', label: 'Turn left', icon: 'icon_turn_left' },
  { action: 'forward', label: 'Sail forward', icon: 'icon_forward' },
  { action: 'turnRight', label: 'Turn right', icon: 'icon_turn_right' },
];

const WEAPONS: readonly ControlButton[] = [
  { action: 'fireLeft', label: 'Fire left broadside', icon: 'icon_fire_left' },
  { action: 'fireFront', label: 'Fire front cannon', icon: 'icon_fire_front' },
  { action: 'fireRight', label: 'Fire right broadside', icon: 'icon_fire_right' },
];

/**
 * On-screen buttons for touch devices (R15). Pointer events (not React state) feed the game
 * directly, so pressing a button never re-renders React. `setPointerCapture` keeps a finger
 * bound to its button even if it slides off, and each finger is tracked separately.
 */
export function TouchControls({ touch }: { touch: TouchInput }) {
  const handlers = (action: Action) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.pressed = 'true';
      touch.press(action, event.pointerId);
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      delete event.currentTarget.dataset.pressed;
      touch.release(action, event.pointerId);
    },
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => {
      delete event.currentTarget.dataset.pressed;
      touch.release(action, event.pointerId);
    },
  });

  const renderButton = (button: ControlButton) => (
    <button
      key={button.action}
      type="button"
      className={`${styles.button} ${styles[button.action] ?? ''}`}
      aria-label={button.label}
      // Touch-only helper: keyboard users have the keys, so keep these out of the tab order.
      tabIndex={-1}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      {...handlers(button.action)}
    >
      <img src={`${ICONS}/${button.icon}.png`} alt="" draggable={false} />
    </button>
  );

  return (
    <div className={styles.controls} data-testid="touch-controls">
      <div className={styles.cluster}>{STEERING.map(renderButton)}</div>
      <div className={styles.cluster}>{WEAPONS.map(renderButton)}</div>
    </div>
  );
}
