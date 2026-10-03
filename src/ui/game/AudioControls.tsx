import { useId } from 'react';

import { audioEngine } from '../../game/audio/AudioEngine';
import { useAudioSettings } from './useAudioSettings';

/** Mute toggle. `aria-pressed` tells screen readers whether sound is currently muted. */
export function MuteButton({ className }: { className?: string | undefined }) {
  const { muted } = useAudioSettings();
  return (
    <button
      type="button"
      className={className}
      aria-pressed={muted}
      onClick={() => {
        audioEngine.setMuted(!muted);
      }}
    >
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  );
}

/** Labelled volume slider (0–100 %) plus the mute toggle. */
export function VolumeControl() {
  const { volume, muted } = useAudioSettings();
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Volume</label>{' '}
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        aria-valuetext={muted ? 'Muted' : `${Math.round(volume * 100)}%`}
        onChange={(event) => {
          audioEngine.setVolume(Number(event.target.value) / 100);
        }}
      />{' '}
      <MuteButton />
    </div>
  );
}
