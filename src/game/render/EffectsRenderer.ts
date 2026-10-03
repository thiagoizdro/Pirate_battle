import { Container, Sprite, type Texture } from 'pixi.js';

import { frameTexture, type GameAssets } from './assets';

/** One short-lived visual. Records and sprites are pooled and reused (no allocation per shot). */
interface Effect {
  sprite: Sprite;
  ageMs: number;
  durationMs: number;
  /** Textures shown in order over the lifetime (a flipbook); one texture means a still image. */
  frames: readonly Texture[];
  startScale: number;
  endScale: number;
  startAlpha: number;
  /** Units per second the effect drifts along its rotation (used by sinking wrecks). */
  driftPx: number;
}

const WATER_TINT = 0xbfe9ff;
const SMOKE_TINT = 0x9a9a9a;

/**
 * Cosmetic effects: muzzle flash, explosions, hit sparks, water splashes and sinking wrecks
 * (R41, R42, R44). Driven by simulation events; never affects the rules.
 */
export class EffectsRenderer {
  readonly root = new Container({ label: 'effects' });
  private readonly free: Effect[] = [];
  private readonly active: Effect[] = [];
  private readonly explosionFrames: readonly Texture[];
  private readonly smallBurst: readonly Texture[];

  constructor(assets: GameAssets) {
    const explosion = (n: number): Texture => frameTexture(assets.ships, `explosion_${n}`);
    // explosion_3 is the smallest blast and explosion_1 the largest: play them as a growing burst.
    this.explosionFrames = [explosion(3), explosion(2), explosion(1)];
    this.smallBurst = [explosion(3)];
  }

  muzzleFlash(x: number, y: number, rotation: number): void {
    this.spawn(x, y, rotation, {
      frames: this.smallBurst,
      durationMs: 120,
      startScale: 0.35,
      endScale: 0.55,
    });
  }

  explosion(x: number, y: number, size = 1): void {
    this.spawn(x, y, 0, {
      frames: this.explosionFrames,
      durationMs: 600,
      startScale: 0.7 * size,
      endScale: 1.4 * size,
    });
  }

  hit(x: number, y: number): void {
    this.spawn(x, y, 0, {
      frames: this.smallBurst,
      durationMs: 220,
      startScale: 0.3,
      endScale: 0.6,
    });
  }

  splash(x: number, y: number): void {
    this.spawn(x, y, 0, {
      frames: this.smallBurst,
      durationMs: 300,
      startScale: 0.2,
      endScale: 0.5,
      tint: WATER_TINT,
      startAlpha: 0.7,
    });
  }

  /** Projectile stopped by an island or rock: a grey puff. */
  puff(x: number, y: number): void {
    this.spawn(x, y, 0, {
      frames: this.smallBurst,
      durationMs: 250,
      startScale: 0.25,
      endScale: 0.45,
      tint: SMOKE_TINT,
      startAlpha: 0.8,
    });
  }

  /** The wrecked hull of a destroyed ship, slowly drifting, shrinking and fading. */
  wreck(texture: Texture, x: number, y: number, rotation: number, scale: number): void {
    this.spawn(x, y, rotation, {
      frames: [texture],
      durationMs: 1400,
      startScale: scale,
      endScale: scale * 0.8,
      driftPx: 10,
    });
  }

  update(dtMs: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i];
      if (!effect) continue;
      effect.ageMs += dtMs;
      const t = Math.min(1, effect.ageMs / effect.durationMs);
      const frame =
        effect.frames[Math.min(effect.frames.length - 1, Math.floor(t * effect.frames.length))];
      if (frame && effect.sprite.texture !== frame) effect.sprite.texture = frame;
      effect.sprite.scale.set(effect.startScale + (effect.endScale - effect.startScale) * t);
      effect.sprite.alpha = effect.startAlpha * (1 - t);
      if (effect.driftPx !== 0) {
        // Wreck sprites point down, so +y in local space is "forward" along the hull.
        effect.sprite.x -= Math.sin(effect.sprite.rotation) * effect.driftPx * (dtMs / 1000);
        effect.sprite.y += Math.cos(effect.sprite.rotation) * effect.driftPx * (dtMs / 1000);
      }
      if (t >= 1) this.recycle(i);
    }
  }

  /** Hides every running effect (used on restart). */
  clear(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.recycle(i);
  }

  destroy(): void {
    this.clear();
    this.root.destroy({ children: true });
  }

  get activeCount(): number {
    return this.active.length;
  }

  private spawn(
    x: number,
    y: number,
    rotation: number,
    options: {
      frames: readonly Texture[];
      durationMs: number;
      startScale: number;
      endScale: number;
      tint?: number;
      startAlpha?: number;
      driftPx?: number;
    },
  ): void {
    const effect = this.free.pop() ?? this.createEffect();
    const first = options.frames[0];
    if (first) effect.sprite.texture = first;
    effect.sprite.position.set(x, y);
    effect.sprite.rotation = rotation;
    effect.sprite.tint = options.tint ?? 0xffffff;
    effect.sprite.visible = true;
    effect.ageMs = 0;
    effect.durationMs = options.durationMs;
    effect.frames = options.frames;
    effect.startScale = options.startScale;
    effect.endScale = options.endScale;
    effect.startAlpha = options.startAlpha ?? 1;
    effect.driftPx = options.driftPx ?? 0;
    effect.sprite.scale.set(options.startScale);
    effect.sprite.alpha = effect.startAlpha;
    this.active.push(effect);
  }

  private createEffect(): Effect {
    const sprite = new Sprite({ anchor: 0.5 });
    this.root.addChild(sprite);
    return {
      sprite,
      ageMs: 0,
      durationMs: 1,
      frames: [],
      startScale: 1,
      endScale: 1,
      startAlpha: 1,
      driftPx: 0,
    };
  }

  /** Swap-remove from the active list and return the record to the pool. */
  private recycle(index: number): void {
    const effect = this.active[index];
    const last = this.active.pop();
    if (!effect || !last) return;
    if (last !== effect) this.active[index] = last;
    effect.sprite.visible = false;
    this.free.push(effect);
  }
}
