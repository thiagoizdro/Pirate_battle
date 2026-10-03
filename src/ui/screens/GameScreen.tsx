import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { audioEngine } from '../../game/audio/AudioEngine';
import type { MatchResult } from '../../game/bridge';
import type { GameOptions } from '../../game/config';
import type { GameSession } from '../../game/GameSession';
import { Dialog } from '../components/Dialog';
import { GameButton } from '../components/GameButton';
import { Panel } from '../components/Panel';
import { PERF_ENABLED } from '../../game/perf/PerfMonitor';
import { DevLifecyclePanel } from '../dev/DevLifecyclePanel';
import { PerfOverlay } from '../dev/PerfOverlay';
import { GameAnnouncer } from '../game/GameAnnouncer';
import { GameCanvas } from '../game/GameCanvas';
import { Hud } from '../game/Hud';
import { TouchControls } from '../game/TouchControls';
import { useGameAssets } from '../game/useGameAssets';
import { useHud } from '../game/useHud';
import { OptionsForm } from '../options/OptionsForm';
import styles from './GameScreen.module.css';

/** Touch buttons appear on touch screens (coarse pointer), or anywhere with `?touch`. */
const isTouchScreen = window.matchMedia('(pointer: coarse)').matches;
const showTouchControls = isTouchScreen || new URLSearchParams(window.location.search).has('touch');

/** Portrait on a touch device is not supported (A21): show a message and pause. */
const PORTRAIT_QUERY = '(orientation: portrait) and (pointer: coarse)';

/** Time to watch the final explosion before the result screen (shorter with reduced motion). */
function resultDelayMs(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1500;
}

interface GameScreenProps {
  /** Snapshot of the options when the battle started; later changes apply to the next one. */
  options: GameOptions;
  playerName: string;
  /** Called once, as soon as the match ends, so the result is saved before anything else. */
  onMatchEnded: (result: MatchResult) => void;
  /** Called a moment later to show the result screen. */
  onShowResult: () => void;
  /** Leaving mid-battle abandons it: nothing is saved or registered (R57). */
  onExit: () => void;
  onSaveOptions: (options: GameOptions, playerName: string) => void;
}

export function GameScreen({
  options,
  playerName,
  onMatchEnded,
  onShowResult,
  onExit,
  onSaveOptions,
}: GameScreenProps) {
  const { state, retry } = useGameAssets();
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const hud = useHud(session);
  const [pauseView, setPauseView] = useState<'menu' | 'options'>('menu');
  const pauseTitleId = useId();
  const optionsTitleId = useId();
  // Options are frozen when the battle screen opens (R54).
  const [battleOptions] = useState(options);

  // Changing the key unmounts and remounts the canvas: used by the dev panel to check for leaks.
  const [mountKey, setMountKey] = useState(0);
  const remount = useCallback(() => {
    setMountKey((key) => key + 1);
  }, []);

  // Sounds load in the background; a failure only means silence, never a blocked game.
  useEffect(() => {
    void audioEngine.load();
  }, []);

  // Save the result once when the match ends, then show the result screen after a moment.
  // The ref guard matters in React Strict Mode, which runs effects twice in development.
  const handledResult = useRef<MatchResult | null>(null);
  useEffect(() => {
    const result = hud.result;
    if (!result) return;
    if (handledResult.current !== result) {
      handledResult.current = result;
      onMatchEnded(result);
    }
    const timer = window.setTimeout(onShowResult, resultDelayMs());
    return () => {
      window.clearTimeout(timer);
    };
  }, [hud.result, onMatchEnded, onShowResult]);

  // Pause automatically when a phone is turned to portrait.
  useEffect(() => {
    if (!session) return;
    const query = window.matchMedia(PORTRAIT_QUERY);
    const check = () => {
      if (query.matches) session.pause('orientation');
    };
    check();
    query.addEventListener('change', check);
    return () => {
      query.removeEventListener('change', check);
    };
  }, [session]);

  const resume = useCallback(() => {
    setPauseView('menu');
    session?.resume();
  }, [session]);

  const errorMessage = rendererError ?? (state.status === 'error' ? state.message : null);

  return (
    <main className={styles.screen} aria-label="Battle">
      <h1 className="visually-hidden">Battle</h1>
      {state.status === 'ready' && rendererError === null && (
        <GameCanvas
          key={mountKey}
          assets={state.assets}
          options={battleOptions}
          onSessionChange={setSession}
          onError={setRendererError}
        />
      )}

      {session && (
        <Hud
          hud={hud}
          onPause={() => {
            session.pause('manual');
          }}
        />
      )}
      <GameAnnouncer session={session} />

      {session && hud.status === 'running' && showTouchControls && (
        <TouchControls touch={session.touch} />
      )}
      {session && hud.status === 'running' && !isTouchScreen && (
        <p className={styles.hint}>
          W/↑ sail · A/D turn · Space front cannon · Q/E broadsides · P pause
        </p>
      )}

      {session && hud.status === 'paused' && pauseView === 'menu' && (
        <Dialog key="pause" labelledBy={pauseTitleId} onEscape={resume}>
          <h2 id={pauseTitleId} className="screen-title">
            Paused
          </h2>
          <p>Ready when you are.</p>
          <div className={styles.actions}>
            <GameButton onClick={resume}>Resume</GameButton>
            <GameButton
              onClick={() => {
                setPauseView('options');
              }}
            >
              Options
            </GameButton>
            <GameButton onClick={onExit}>Main Menu</GameButton>
          </div>
        </Dialog>
      )}

      {session && hud.status === 'paused' && pauseView === 'options' && (
        <Dialog
          key="options"
          labelledBy={optionsTitleId}
          onEscape={() => {
            setPauseView('menu');
          }}
        >
          <OptionsForm
            titleId={optionsTitleId}
            headingLevel={2}
            initialOptions={options}
            initialName={playerName}
            onSave={onSaveOptions}
            onClose={() => {
              setPauseView('menu');
            }}
            closeLabel="Back"
          />
        </Dialog>
      )}

      {state.status === 'loading' && (
        <div className={styles.overlay}>
          <Panel>
            <p id="loading-label" className="screen-subtitle">
              Loading the fleet…
            </p>
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
          </Panel>
        </div>
      )}

      {errorMessage !== null && (
        <div className={styles.overlay}>
          <Panel role="alert">
            <p>{errorMessage}</p>
            <GameButton
              onClick={() => {
                setRendererError(null);
                retry();
              }}
            >
              Retry
            </GameButton>
            <GameButton variant="secondary" onClick={onExit}>
              Main Menu
            </GameButton>
          </Panel>
        </div>
      )}

      <div className={styles.rotate} role="alert">
        <p>Rotate your device to landscape to play.</p>
      </div>

      {import.meta.env.DEV && <DevLifecyclePanel onRemount={remount} />}
      {PERF_ENABLED && <PerfOverlay session={session} />}
    </main>
  );
}
