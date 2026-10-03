import { useEffect, useRef } from 'react';

import type { GameOptions } from '../../game/config';
import { GameSession } from '../../game/GameSession';
import type { GameAssets } from '../../game/render/assets';
import styles from './GameCanvas.module.css';

const showColliders =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('debugColliders');

interface GameCanvasProps {
  assets: GameAssets;
  options: GameOptions;
  onSessionChange: (session: GameSession | null) => void;
  onError: (message: string) => void;
}

/**
 * Mounts a GameSession into a div and tears it down on unmount (R66, R67).
 *
 * Strict Mode mounts, unmounts and mounts again. Because PixiJS init is async, the first
 * mount may finish *after* its cleanup ran. The `disposed` flag catches that case and destroys
 * the late session immediately, so only one canvas, one ticker and one set of listeners survive.
 */
export function GameCanvas({ assets, options, onSessionChange, onError }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Options are a snapshot taken when this component mounts; later changes must not restart it.
  const optionsRef = useRef(options);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let session: GameSession | null = null;

    GameSession.create({
      container: host,
      assets,
      options: optionsRef.current,
      showColliders,
    })
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        session = created;
        onSessionChange(created);
      })
      .catch((error: unknown) => {
        console.warn('Game failed to start', error);
        if (!disposed) onError('The game could not start.');
      });

    return () => {
      disposed = true;
      session?.destroy();
      session = null;
      onSessionChange(null);
    };
  }, [assets, onSessionChange, onError]);

  return <div ref={hostRef} className={styles.host} data-testid="game-canvas" />;
}
