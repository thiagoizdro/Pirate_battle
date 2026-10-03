import { useEffect, useState } from 'react';

import type { GameSession } from '../../game/GameSession';
import type { PerfRecording } from '../../game/perf/PerfMonitor';
import { getLiveStageCount } from '../../game/render/stageCounter';
import styles from './PerfOverlay.module.css';

const RECORD_MS = 3 * 60 * 1000;
const REFRESH_MS = 500;

type Live = ReturnType<NonNullable<GameSession['perf']>['liveSummary']>;

/** Saves the recording as a JSON file (attach it to docs/PERFORMANCE.md). */
function download(recording: PerfRecording): void {
  const blob = new Blob([JSON.stringify(recording, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pirate-battle-perf-${recording.startedAt.replace(/[:.]/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Metrics overlay shown with `?perf` (R125): live FPS, p95 frame time, entity and display object
 * counts, live PixiJS stages, and a 3-minute recording that downloads a JSON report.
 * It reads the monitor twice a second, so it never re-renders React every frame.
 */
export function PerfOverlay({ session }: { session: GameSession | null }) {
  const [live, setLive] = useState<Live | null>(null);
  const [last, setLast] = useState<PerfRecording | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLive(session?.perf?.liveSummary() ?? null);
    }, REFRESH_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [session]);

  const monitor = session?.perf;
  const recordingLeft = live?.recordingLeftMs ?? null;

  return (
    <aside className={styles.overlay} aria-label="Performance metrics">
      {live ? (
        <>
          <p>
            FPS {live.frames.avgFps.toFixed(1)} · p95 {live.frames.p95FrameMs.toFixed(1)} ms · max{' '}
            {live.frames.maxFrameMs.toFixed(1)} ms
          </p>
          <p>
            entities {1 + live.counts.enemies + live.counts.projectiles} (enemies{' '}
            {live.counts.enemies}, shots {live.counts.projectiles}) · sprites{' '}
            {live.counts.shipViews + live.counts.projectileSprites + live.counts.effects} · stages{' '}
            {getLiveStageCount()}
          </p>
        </>
      ) : (
        <p>Waiting for the battle…</p>
      )}
      {monitor && (
        <button
          type="button"
          disabled={recordingLeft !== null}
          onClick={() => {
            void monitor.record(RECORD_MS).then((recording) => {
              setLast(recording);
              download(recording);
            });
          }}
        >
          {recordingLeft !== null
            ? `Recording… ${Math.ceil(recordingLeft / 1000)} s`
            : 'Record 3 min'}
        </button>
      )}
      {last && (
        <p>
          Last: {last.frames.avgFps.toFixed(1)} FPS · p95 {last.frames.p95FrameMs.toFixed(1)} ms ·
          max entities {last.maxEntities}
        </p>
      )}
    </aside>
  );
}
