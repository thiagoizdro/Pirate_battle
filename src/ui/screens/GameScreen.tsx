import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_OPTIONS } from '../../game/config';
import type { GameSession } from '../../game/GameSession';
import { DevLifecyclePanel } from '../dev/DevLifecyclePanel';
import { END_REASON_LABEL, formatClock } from '../format';
import { GameCanvas } from '../game/GameCanvas';
import { useGameAssets } from '../game/useGameAssets';
import { useHud } from '../game/useHud';
import styles from './GameScreen.module.css';

interface GameScreenProps {
  onExit: () => void;
}

/** Phase 2 version: functional HUD, pause and end overlays. Final visuals arrive in Phase 4. */
export function GameScreen({ onExit }: GameScreenProps) {
  const { state, retry } = useGameAssets();
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const hud = useHud(session);
  // Changing the key unmounts and remounts the canvas: used by the dev panel to check for leaks.
  const [mountKey, setMountKey] = useState(0);
  const remount = useCallback(() => {
    setMountKey((key) => key + 1);
  }, []);

  const resumeRef = useRef<HTMLButtonElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (hud.status === 'paused') resumeRef.current?.focus();
    if (hud.status === 'ended') restartRef.current?.focus();
  }, [hud.status]);

  const errorMessage = rendererError ?? (state.status === 'error' ? state.message : null);

  return (
    <main className={styles.screen} aria-label="Battle">
      {state.status === 'ready' && rendererError === null && (
        <GameCanvas
          key={mountKey}
          assets={state.assets}
          options={DEFAULT_OPTIONS}
          onSessionChange={setSession}
          onError={setRendererError}
        />
      )}

      {session && (
        <div className={styles.hud}>
          <span>
            Health {hud.health}/{hud.maxHealth}
          </span>
          <span>Score {hud.score}</span>
          <span>Time {formatClock(hud.secondsLeft)}</span>
          <button
            type="button"
            onClick={() => {
              session.pause('manual');
            }}
            disabled={hud.status !== 'running'}
          >
            Pause
          </button>
        </div>
      )}

      {session && hud.status === 'paused' && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
        >
          <h2 id="pause-title">Paused</h2>
          <div className={styles.actions}>
            <button
              ref={resumeRef}
              type="button"
              onClick={() => {
                session.resume();
              }}
            >
              Resume
            </button>
            <button type="button" onClick={onExit}>
              Main Menu
            </button>
          </div>
        </div>
      )}

      {session && hud.result && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="end-title">
          <h2 id="end-title">{END_REASON_LABEL[hud.result.endReason]}</h2>
          <p>
            Score {hud.result.score} · Time played {formatClock(hud.result.elapsedMs / 1000)}
          </p>
          <div className={styles.actions}>
            <button
              ref={restartRef}
              type="button"
              onClick={() => {
                session.restart();
              }}
            >
              Play Again
            </button>
            <button type="button" onClick={onExit}>
              Main Menu
            </button>
          </div>
        </div>
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

      {import.meta.env.DEV && <DevLifecyclePanel onRemount={remount} />}
    </main>
  );
}
