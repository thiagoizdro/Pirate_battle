import { useId } from 'react';

import styles from './ControlsHelp.module.css';

const KEYBOARD: readonly [string, string][] = [
  ['W / ↑', 'Sail forward'],
  ['A / ←', 'Turn left'],
  ['D / →', 'Turn right'],
  ['Space', 'Front cannon'],
  ['Q', 'Left broadside'],
  ['E', 'Right broadside'],
  ['P / Esc', 'Pause'],
];

/** Control instructions shown in the menu and the pause dialog (R17). */
export function ControlsHelp({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const headingId = useId();
  return (
    <section className={styles.help} aria-labelledby={headingId}>
      <Heading id={headingId} className={styles.heading}>
        Controls
      </Heading>
      <dl className={styles.list}>
        {KEYBOARD.map(([keys, action]) => (
          <div key={action} className={styles.row}>
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.touch}>
        On touch screens, use the on-screen buttons: steering on the left, cannons on the right.
      </p>
    </section>
  );
}
