import type { ButtonHTMLAttributes, Ref } from 'react';

import { audioEngine } from '../../game/audio/AudioEngine';
import styles from './GameButton.module.css';

type Variant = 'primary' | 'secondary';
type Size = 'large' | 'small';

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Marks the selected tab or toggle with the gold style. */
  selected?: boolean;
  /** React 19 passes refs as a normal prop. */
  ref?: Ref<HTMLButtonElement>;
}

/** Gold (primary) or navy (secondary) wooden button from the UI atlas, with a click sound. */
export function GameButton({
  variant = 'primary',
  size = 'large',
  selected = false,
  className,
  onClick,
  type,
  ref,
  ...rest
}: GameButtonProps) {
  const look = selected ? 'primary' : variant;
  return (
    <button
      ref={ref}
      type={type === 'submit' ? 'submit' : 'button'}
      className={[styles.button, styles[look], styles[size], className].filter(Boolean).join(' ')}
      onClick={(event) => {
        audioEngine.play('ui_click', 0.6);
        onClick?.(event);
      }}
      {...rest}
    />
  );
}

interface RoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: 'pause' | 'play' | 'minus' | 'plus' | 'turn_left' | 'turn_right' | 'close' | 'home';
  /** Required: round buttons only show an icon, so this is their accessible name. */
  label: string;
}

/** Round button with an icon from the controls set (pagination, steppers, pause). */
export function RoundButton({ icon, label, className, onClick, ...rest }: RoundButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={[styles.round, className].filter(Boolean).join(' ')}
      onClick={(event) => {
        audioEngine.play('ui_click', 0.6);
        onClick?.(event);
      }}
      {...rest}
    >
      <img src={`${import.meta.env.BASE_URL}assets/ui/controls/icon_${icon}.png`} alt="" />
    </button>
  );
}
