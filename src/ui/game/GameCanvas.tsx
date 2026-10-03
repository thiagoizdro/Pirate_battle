import { useEffect, useRef } from 'react';

import { DEFAULT_BALANCE } from '../../game/config';
import { createArenaView } from '../../game/render/ArenaView';
import type { GameAssets } from '../../game/render/assets';
import { PixiStage } from '../../game/render/PixiStage';
import { buildObstacles, DEFAULT_ARENA } from '../../game/simulation/arena';
import styles from './GameCanvas.module.css';

const showColliders =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('debugColliders');

interface GameCanvasProps {
  assets: GameAssets;
  onError: (message: string) => void;
}

/**
 * Mounts the PixiJS stage into a div and tears it down on unmount (R66, R67).
 *
 * Strict Mode mounts, unmounts and mounts again. Because PixiJS init is async, the first
 * mount may finish *after* its cleanup ran. The `disposed` flag catches that case and destroys
 * the late stage immediately, so only one canvas and one ticker ever survive.
 */
export function GameCanvas({ assets, onError }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let stage: PixiStage | null = null;
    const { widthPx, heightPx, tileSizePx } = DEFAULT_BALANCE.arena;

    PixiStage.create(host, widthPx, heightPx)
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        stage = created;
        const obstacles = showColliders ? buildObstacles(DEFAULT_ARENA, tileSizePx) : undefined;
        stage.world.addChild(createArenaView(DEFAULT_ARENA, assets, tileSizePx, obstacles));
      })
      .catch((error: unknown) => {
        console.warn('Renderer failed to start', error);
        if (!disposed) onError('The game renderer could not start.');
      });

    return () => {
      disposed = true;
      stage?.destroy();
      stage = null;
    };
  }, [assets, onError]);

  return <div ref={hostRef} className={styles.host} data-testid="game-canvas" />;
}
