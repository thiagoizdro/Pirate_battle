import { useSyncExternalStore } from 'react';

import { audioEngine } from '../../game/audio/AudioEngine';
import type { AudioSettings } from '../../storage/audioSettings';

/** Current volume and mute state; re-renders only when they change. */
export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.getSettings);
}
