import { useEffect, useState } from 'react';

import { getLiveStageCount } from '../../game/render/stageCounter';
import styles from './DevLifecyclePanel.module.css';

interface Counts {
  stages: number;
  canvases: number;
}

function readCounts(): Counts {
  return { stages: getLiveStageCount(), canvases: document.querySelectorAll('canvas').length };
}

/** Dev-only: shows live PixiJS stages and canvases so remount leaks are visible at a glance. */
export function DevLifecyclePanel({ onRemount }: { onRemount: () => void }) {
  const [counts, setCounts] = useState<Counts>(readCounts);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCounts(readCounts());
    }, 500);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <aside className={styles.panel} aria-label="Developer lifecycle panel">
      <span>
        stages: {counts.stages} · canvases: {counts.canvases}
      </span>
      <button type="button" onClick={onRemount}>
        Remount
      </button>
    </aside>
  );
}
