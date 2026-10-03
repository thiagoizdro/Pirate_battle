import type { HTMLAttributes, Ref } from 'react';

import styles from './Panel.module.css';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  wide?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The wooden frame from the UI atlas (panel_menu). Drawn with CSS `border-image` using the
 * atlas 9-slice borders, so it stretches to any size without distorting the corners.
 */
export function Panel({ wide = false, className, ref, ...rest }: PanelProps) {
  return (
    <div
      ref={ref}
      className={[styles.panel, wide ? styles.wide : '', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
