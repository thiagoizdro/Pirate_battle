import type { ReactNode } from 'react';

import styles from './ScreenLayout.module.css';

interface ScreenLayoutProps {
  /** Accessible name of the page region, e.g. "Main menu". */
  label: string;
  children: ReactNode;
}

/** Menu screens: blurred arena background, centred content and the Jungle Gaming logo. */
export function ScreenLayout({ label, children }: ScreenLayoutProps) {
  return (
    <main className={styles.screen} aria-label={label}>
      {children}
      <img
        className={styles.logo}
        src={`${import.meta.env.BASE_URL}assets/ui/logo_jungle_gaming.svg`}
        alt="Jungle Gaming"
      />
    </main>
  );
}
