import { Container, Sprite, type Texture } from 'pixi.js';

import type { ShipBase, ShipKind } from '../simulation/types';
import { frameTexture, type GameAssets } from './assets';
import { HealthBar } from './HealthBar';
import { damageState, shipFrame, WRECK_STATE } from './shipArt';

/** Visual size only; the collision radius lives in the config. */
export const SHIP_SCALE: Record<ShipKind, number> = { player: 0.8, chaser: 0.7, shooter: 0.8 };

/** Ship sprites are drawn with the bow pointing down (+y), while rotation 0 means "facing right". */
export const SPRITE_ROTATION_OFFSET = -Math.PI / 2;

const FLASH_MS = 140;
const FLASH_TINT = 0xff7a7a;
const FIRE_FLICKER_MS = 120;
const HEALTH_BAR_OFFSET_Y = -62;

/**
 * One ship on screen: the hull (rotates with the ship), fire on damaged hulls, and a health bar
 * that stays horizontal above it. It only reads ship data; it never changes it.
 */
export class ShipView {
  readonly root = new Container();
  private readonly hullGroup = new Container();
  private readonly hull: Sprite;
  private readonly smallFire: Sprite;
  private readonly largeFire: Sprite;
  private readonly textures: readonly Texture[];
  private readonly healthBar: HealthBar;
  private shownState = -1;
  private flashMs = 0;
  private timeMs = 0;
  private readonly reducedMotion: boolean;

  constructor(assets: GameAssets, kind: ShipKind, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    this.textures = [0, 1, 2, WRECK_STATE].map((state) =>
      frameTexture(assets.ships, shipFrame(kind, state)),
    );
    this.hull = new Sprite({
      texture: frameTexture(assets.ships, shipFrame(kind, 0)),
      anchor: 0.5,
    });
    // Two flames placed on the deck, in hull coordinates (the hull points down).
    this.smallFire = new Sprite({
      texture: frameTexture(assets.ships, 'fire_2'),
      anchor: { x: 0.5, y: 0.9 },
      x: 12,
      y: 18,
    });
    this.largeFire = new Sprite({
      texture: frameTexture(assets.ships, 'fire_1'),
      anchor: { x: 0.5, y: 0.9 },
      x: -10,
      y: -8,
    });
    this.hullGroup.scale.set(SHIP_SCALE[kind]);
    this.hullGroup.addChild(this.hull, this.smallFire, this.largeFire);
    this.healthBar = new HealthBar(
      assets,
      kind === 'player' ? 'player' : 'enemy',
      kind === 'player' ? 0.32 : 0.42,
    );
    this.healthBar.root.y = HEALTH_BAR_OFFSET_Y;
    this.root.addChild(this.hullGroup, this.healthBar.root);
  }

  /** Short red tint when the ship takes damage (R44). */
  flash(): void {
    this.flashMs = FLASH_MS;
  }

  update(ship: ShipBase, dtMs: number): void {
    this.timeMs += dtMs;
    this.root.position.set(ship.x, ship.y);
    this.hullGroup.rotation = ship.rotation + SPRITE_ROTATION_OFFSET;
    this.healthBar.set(ship.health, ship.maxHealth);

    const state = damageState(ship.health, ship.maxHealth);
    if (state !== this.shownState) {
      this.shownState = state;
      const texture = this.textures[state];
      if (texture) this.hull.texture = texture;
    }
    this.updateFires(state);

    this.flashMs = Math.max(0, this.flashMs - dtMs);
    this.hull.tint = this.flashMs > 0 ? FLASH_TINT : 0xffffff;
  }

  /** Damaged: one small flame. Heavily damaged: two flames (R43). */
  private updateFires(state: number): void {
    const small = this.smallFire;
    const large = this.largeFire;
    small.visible = state === 1 || state === 2;
    large.visible = state === 2;
    if (this.reducedMotion) return;
    const flicker = Math.floor(this.timeMs / FIRE_FLICKER_MS) % 2;
    small.scale.set(1, flicker === 0 ? 1 : 0.85);
    large.scale.set(1, flicker === 0 ? 0.85 : 1);
  }

  destroy(): void {
    this.healthBar.destroy();
    this.root.destroy({ children: true });
  }
}
