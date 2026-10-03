import { useCallback, useEffect, useState } from 'react';

import { loadGameAssets, type GameAssets } from '../../game/render/assets';

export type GameAssetsState =
  | { status: 'loading'; progress: number }
  | { status: 'error'; message: string }
  | { status: 'ready'; assets: GameAssets };

/**
 * Loads the game atlases with progress, exposes a failure state and a retry function (R64, R102).
 * Combat can only start once the state is "ready".
 */
export function useGameAssets(): { state: GameAssetsState; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<GameAssetsState>({ status: 'loading', progress: 0 });

  useEffect(() => {
    // Ignore results of a load that belongs to an unmounted component or an older attempt.
    let active = true;
    // When one file fails, the other files keep loading and still report progress.
    // Without this flag, that late progress would replace the error state with "loading".
    let settled = false;
    loadGameAssets((progress) => {
      if (active && !settled) setState({ status: 'loading', progress });
    })
      .then((assets) => {
        settled = true;
        if (active) setState({ status: 'ready', assets });
      })
      .catch((error: unknown) => {
        settled = true;
        if (!active) return;
        console.warn('Game assets failed to load', error);
        setState({ status: 'error', message: 'The game assets could not be loaded.' });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', progress: 0 });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
