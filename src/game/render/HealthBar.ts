import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import { frameTexture, type GameAssets } from './assets';
import { readFillRect, type LogicalRect } from './uiAtlas';

export type HealthBarStyle = 'player' | 'enemy';

interface BarFrames {
  frame: string;
  /** Fill colours from healthiest to weakest, with the health ratio where each one starts. */
  fills: readonly { frame: string; minRatio: number }[];
}

const STYLES: Record<HealthBarStyle, BarFrames> = {
  player: {
    frame: 'health_frame',
    fills: [
      { frame: 'health_fill_green', minRatio: 0.5 },
      { frame: 'health_fill_amber', minRatio: 0.25 },
      { frame: 'health_fill_red', minRatio: 0 },
    ],
  },
  enemy: {
    frame: 'enemy_health_frame',
    fills: [
      { frame: 'enemy_health_fill_green', minRatio: 0.5 },
      { frame: 'enemy_health_fill_red', minRatio: 0 },
    ],
  },
};

/**
 * Health bar drawn in PixiJS above a ship (R35), built from the UI atlas. Following the atlas
 * metadata (clip_axis "x", clip_origin "left"), the fill is cropped from the left instead of
 * squashed, so its rounded art keeps its shape. The cropped texture is only rebuilt when the
 * health value changes, not every frame.
 */
export class HealthBar {
  readonly root = new Container({ label: 'health-bar' });
  private readonly fillSprite: Sprite;
  private readonly fillRect: LogicalRect;
  private readonly fills: readonly { texture: Texture; minRatio: number }[];
  private cropped: Texture | null = null;
  private lastHealth = Number.NaN;
  private lastMax = Number.NaN;

  constructor(assets: GameAssets, style: HealthBarStyle, scale: number) {
    const frames = STYLES[style];
    const frameTex = frameTexture(assets.ui, frames.frame);
    this.fillRect = readFillRect(assets.ui, frames.frame);
    this.fills = frames.fills.map((fill) => ({
      texture: frameTexture(assets.ui, fill.frame),
      minRatio: fill.minRatio,
    }));
    const frameSprite = new Sprite({ texture: frameTex });
    this.fillSprite = new Sprite();
    this.root.addChild(frameSprite, this.fillSprite);
    this.root.scale.set(scale);
    // Centre the bar horizontally on the ship.
    this.root.pivot.set(frameTex.width / 2, frameTex.height / 2);
  }

  set(health: number, maxHealth: number): void {
    if (health === this.lastHealth && maxHealth === this.lastMax) return;
    this.lastHealth = health;
    this.lastMax = maxHealth;
    const ratio = maxHealth > 0 ? Math.min(1, Math.max(0, health / maxHealth)) : 0;
    const fill = this.fills.find((f) => ratio >= f.minRatio) ?? this.fills[this.fills.length - 1];
    if (!fill) return;

    // Keep the left part of the fill image up to the current health inside fill_rect.
    const visibleWidth = this.fillRect.x + this.fillRect.w * ratio;
    const base = fill.texture;
    const next = new Texture({
      source: base.source,
      frame: new Rectangle(base.frame.x, base.frame.y, visibleWidth, base.frame.height),
    });
    this.fillSprite.texture = next;
    this.fillSprite.visible = ratio > 0;
    // The cropped texture shares the atlas image: destroy only the small wrapper, never the source.
    this.cropped?.destroy(false);
    this.cropped = next;
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.cropped?.destroy(false);
    this.cropped = null;
  }
}
