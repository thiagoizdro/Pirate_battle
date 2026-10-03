import { useCallback, useSyncExternalStore } from 'react';

import type { HudSnapshot } from '../../game/bridge';
import type { GameSession } from '../../game/GameSession';

const NO_SESSION_HUD: HudSnapshot = {
  status: 'running',
  pauseReason: null,
  score: 0,
  secondsLeft: 0,
  health: 0,
  maxHealth: 0,
  result: null,
};

const noop = (): void => undefined;

/**
 * Subscribes React to the game's HUD store. React re-renders only when the store publishes a
 * changed snapshot (score, whole second, health, status), never once per frame (R63).
 */
export function useHud(session: GameSession | null): HudSnapshot {
  const subscribe = useCallback(
    (onChange: () => void) => (session ? session.hud.subscribe(onChange) : noop),
    [session],
  );
  const getSnapshot = useCallback(
    () => (session ? session.hud.getSnapshot() : NO_SESSION_HUD),
    [session],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}
