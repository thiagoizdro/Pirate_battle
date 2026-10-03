import { useCallback, useState } from 'react';

import { GameCanvas } from '../game/GameCanvas';
import { useGameAssets } from '../game/useGameAssets';
import { DevLifecyclePanel } from '../dev/DevLifecyclePanel';
import styles from './GameScreen.module.css';

interface GameScreenProps {
  onExit: () => void;
}

export function GameScreen({ onExit }: GameScreenProps) {
  const { state, retry } = useGameAssets();
  const [rendererError, setRendererError] = useState<string | null>(null);
  // Changing the key unmounts and remounts the canvas: used by the dev panel to check for leaks.
  const [mountKey, setMountKey] = useState(0);
  const remount = useCallback(() => {
    setMountKey((key) => key + 1);
  }, []);

  const errorMessage = rendererError ?? (state.status === 'error' ? state.message : null);

  return (
    <main className={styles.screen} aria-label="Battle">
      {state.status === 'ready' && rendererError === null && (
        <GameCanvas key={mountKey} assets={state.assets} onError={setRendererError} />
      )}

      {state.status === 'loading' && (
        <div className={styles.overlay}>
          <p id="loading-label">Loading the fleet…</p>
          <div
            className={styles.progress}
            role="progressbar"
            aria-labelledby="loading-label"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.progress * 100)}
          >
            <div className={styles.progressFill} style={{ width: `${state.progress * 100}%` }} />
          </div>
        </div>
      )}

      {errorMessage !== null && (
        <div className={styles.overlay} role="alert">
          <p>{errorMessage}</p>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => {
                setRendererError(null);
                retry();
              }}
            >
              Retry
            </button>
            <button type="button" onClick={onExit}>
              Main Menu
            </button>
          </div>
        </div>
      )}

      <button type="button" className={styles.exit} onClick={onExit}>
        Main Menu
      </button>
      {import.meta.env.DEV && <DevLifecyclePanel onRemount={remount} />}
    </main>
  );
}
