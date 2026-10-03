import { useEffect, useRef, type PointerEvent } from 'react';

import type { Action } from '../../game/input/HeldActions';
import type { TouchInput } from '../../game/input/TouchInput';
import styles from './TouchControls.module.css';

interface ControlButton {
  action: Action;
  label: string;
  icon: string;
}

const ICONS = `${import.meta.env.BASE_URL}assets/ui/controls`;

const WEAPONS: readonly ControlButton[] = [
  { action: 'fireLeft', label: 'Fire left broadside', icon: 'icon_fire_left' },
  { action: 'fireFront', label: 'Fire front cannon', icon: 'icon_fire_front' },
  { action: 'fireRight', label: 'Fire right broadside', icon: 'icon_fire_right' },
];

/**
 * Pointer capture keeps the steering finger bound to the joystick outside its base.
 * Refs and CSS properties update the stick without React renders on every pointer move.
 * Weapon pointers remain independent, allowing steering and firing together.
 */
export function TouchControls({ touch }: { touch: TouchInput }) {
  const joystickPointer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      touch.resetJoystick();
    };
  }, [touch]);

  const moveJoystick = (event: PointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    event.preventDefault();
    const base = event.currentTarget;
    const box = base.getBoundingClientRect();
    const radius = box.width * 0.3;
    const dx = event.clientX - (box.x + box.width / 2);
    const dy = event.clientY - (box.y + box.height / 2);
    const scale = Math.max(1, Math.hypot(dx, dy) / radius);
    const x = dx / scale;
    const y = dy / scale;
    base.style.setProperty('--stick-x', `${x}px`);
    base.style.setProperty('--stick-y', `${y}px`);
    touch.setJoystick(x / radius, y / radius);
  };

  const releaseJoystick = (event: PointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    joystickPointer.current = null;
    touch.resetJoystick();
    event.currentTarget.style.removeProperty('--stick-x');
    event.currentTarget.style.removeProperty('--stick-y');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

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
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => {
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
      <div
        className={styles.joystick}
        role="group"
        aria-label="Sailing joystick"
        data-testid="sailing-joystick"
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          if (joystickPointer.current !== null) return;
          joystickPointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          moveJoystick(event);
        }}
        onPointerMove={moveJoystick}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
        onLostPointerCapture={releaseJoystick}
      >
        <span className={styles.stick} data-testid="joystick-stick" aria-hidden="true">
          <img src={`${ICONS}/icon_forward.png`} alt="" draggable={false} />
        </span>
      </div>
      <div className={styles.cluster}>{WEAPONS.map(renderButton)}</div>
    </div>
  );
}
