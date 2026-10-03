import { isRecord, readStored, writeStored } from './localStore';

export interface AudioSettings {
  /** Master volume from 0 to 1. */
  volume: number;
  muted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { volume: 0.7, muted: false };

const KEY = 'audio';

function isAudioSettings(value: unknown): value is AudioSettings {
  return (
    isRecord(value) &&
    typeof value.volume === 'number' &&
    value.volume >= 0 &&
    value.volume <= 1 &&
    typeof value.muted === 'boolean'
  );
}

export function loadAudioSettings(): AudioSettings {
  return readStored(KEY, isAudioSettings, DEFAULT_AUDIO_SETTINGS);
}

export function saveAudioSettings(settings: AudioSettings): void {
  writeStored(KEY, settings);
}
