import { Application, Container } from 'pixi.js';

import type { Vec2 } from '../simulation/geometry';
import { computeViewport, screenToArena, type Viewport } from './viewport';

const LETTERBOX_COLOR = '#0b1a2b';

/** Number of stages alive right now. Lets us prove in dev and tests that remounts don't leak. */
let liveStages = 0;
export function getLiveStageCount(): number {
  return liveStages;
}

/**
 * Owns the PixiJS Application: the canvas, its size and pixel density, and the letterboxed
 * `world` container where the arena is drawn in logical units (R65).
 */
export class PixiStage {
  readonly app: Application;
  /** Everything drawn in arena coordinates goes here; it is scaled and centred on resize. */
  readonly world: Container;
  private readonly container: HTMLElement;
  private readonly arenaWidth: number;
  private readonly arenaHeight: number;
  private readonly resizeObserver: ResizeObserver;
  private viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };
  private destroyed = false;

  private constructor(
    app: Application,
    container: HTMLElement,
    arenaWidth: number,
    arenaHeight: number,
  ) {
    this.app = app;
    this.container = container;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.world = new Container({ label: 'world' });
    app.stage.addChild(this.world);
    container.appendChild(app.canvas);
    // ResizeObserver follows the container itself (not only the window), e.g. layout changes.
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(container);
    this.resize();
    liveStages++;
  }

  /** PixiJS v8 initialization is async, so the stage is created through this factory. */
  static async create(
    container: HTMLElement,
    arenaWidth: number,
    arenaHeight: number,
  ): Promise<PixiStage> {
    const app = new Application();
    await app.init({
      background: LETTERBOX_COLOR,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
    });
    app.canvas.style.display = 'block';
    return new PixiStage(app, container, arenaWidth, arenaHeight);
  }

  /** Converts a pointer position (clientX/clientY) into arena coordinates. */
  clientToArena(clientX: number, clientY: number): Vec2 {
    const rect = this.app.canvas.getBoundingClientRect();
    return screenToArena({ x: clientX - rect.left, y: clientY - rect.top }, this.viewport);
  }

  getViewport(): Viewport {
    return this.viewport;
  }

  private resize(): void {
    if (this.destroyed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    // Passing the current devicePixelRatio also handles moving the window to another monitor.
    this.app.renderer.resize(width, height, window.devicePixelRatio || 1);
    this.viewport = computeViewport(width, height, this.arenaWidth, this.arenaHeight);
    this.world.scale.set(this.viewport.scale);
    this.world.position.set(this.viewport.offsetX, this.viewport.offsetY);
  }

  /**
   * Releases the observer, ticker, canvas and every display object. Shared atlas textures are
   * kept (texture: false) because the next match reuses them.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver.disconnect();
    this.app.destroy(
      { removeView: true },
      { children: true, texture: false, textureSource: false },
    );
    liveStages--;
  }
}
