import { useId } from 'react';

import { audioEngine } from '../../game/audio/AudioEngine';
import { GameButton } from '../components/GameButton';
import styles from './AudioControls.module.css';
import { useAudioSettings } from './useAudioSettings';

/** Labelled volume slider (0–100 %) plus a mute toggle; both are saved (R45). */
export function VolumeControl() {
  const { volume, muted } = useAudioSettings();
  const id = useId();
  return (
    <div className={styles.row}>
      <label htmlFor={id}>Volume</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        aria-valuetext={`${Math.round(volume * 100)}%`}
        onChange={(event) => {
          audioEngine.setVolume(Number(event.target.value) / 100);
        }}
      />
      {/* aria-pressed tells screen readers whether sound is currently muted. */}
      <GameButton
        variant="secondary"
        size="small"
        aria-pressed={muted}
        onClick={() => {
          audioEngine.setMuted(!muted);
        }}
      >
        Mute
      </GameButton>
    </div>
  );
}
