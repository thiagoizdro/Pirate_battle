import { Container, Sprite, type Texture } from 'pixi.js';

import type { Enemy, MatchState, Projectile, ShipBase, ShipKind } from '../simulation/types';
import { frameTexture, type GameAssets } from './assets';

/** Ship art per type (ship_N: colour = (N-1) % 6, see docs/REQUIREMENTS.md). */
const SHIP_FRAMES: Record<ShipKind, string> = {
  player: 'ship_5', // blue
  chaser: 'ship_3', // red
  shooter: 'ship_2', // black
};

/** Visual size only; the collision radius lives in the config. */
const SHIP_SCALE: Record<ShipKind, number> = { player: 0.8, chaser: 0.7, shooter: 0.8 };

/** Ship sprites are drawn with the bow pointing down (+y), while rotation 0 means "facing right". */
const SPRITE_ROTATION_OFFSET = -Math.PI / 2;

class ShipView {
  readonly root: Container;
  private readonly hull: Sprite;

  constructor(texture: Texture, scale: number) {
    this.root = new Container();
    this.hull = new Sprite({ texture, anchor: 0.5, scale });
    this.root.addChild(this.hull);
  }

  update(ship: ShipBase): void {
    this.root.position.set(ship.x, ship.y);
    this.hull.rotation = ship.rotation + SPRITE_ROTATION_OFFSET;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/**
 * Draws ships and projectiles from the simulation state every frame. It never changes the state.
 * Projectile sprites are pooled: they are created once and reused, so firing does not allocate.
 */
export class EntityRenderer {
  readonly root = new Container({ label: 'entities' });
  private readonly shipLayer = new Container({ label: 'ships' });
  private readonly projectileLayer = new Container({ label: 'projectiles' });
  private readonly textures: Record<ShipKind, Texture>;
  private readonly cannonBall: Texture;
  private playerView: ShipView;
  private readonly enemyViews = new Map<number, ShipView>();
  private readonly projectilePool: Sprite[] = [];
  /** Reused every frame to find views whose enemy is gone, without allocating. */
  private readonly seenEnemyIds = new Set<number>();

  constructor(assets: GameAssets) {
    this.textures = {
      player: frameTexture(assets.ships, SHIP_FRAMES.player),
      chaser: frameTexture(assets.ships, SHIP_FRAMES.chaser),
      shooter: frameTexture(assets.ships, SHIP_FRAMES.shooter),
    };
    this.cannonBall = frameTexture(assets.ships, 'cannon_ball');
    this.root.addChild(this.shipLayer, this.projectileLayer);
    this.playerView = this.createShipView('player');
  }

  sync(state: MatchState): void {
    this.playerView.update(state.player);
    this.syncEnemies(state.enemies);
    this.syncProjectiles(state.projectiles);
  }

  /** Removes every ship view for a restart. Pooled projectile sprites are kept and hidden. */
  reset(): void {
    for (const view of this.enemyViews.values()) view.destroy();
    this.enemyViews.clear();
    this.playerView.destroy();
    this.playerView = this.createShipView('player');
    for (const sprite of this.projectilePool) sprite.visible = false;
  }

  private createShipView(kind: ShipKind): ShipView {
    const view = new ShipView(this.textures[kind], SHIP_SCALE[kind]);
    this.shipLayer.addChild(view.root);
    return view;
  }

  private syncEnemies(enemies: readonly Enemy[]): void {
    const seen = this.seenEnemyIds;
    seen.clear();
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      seen.add(enemy.id);
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = this.createShipView(enemy.kind);
        this.enemyViews.set(enemy.id, view);
      }
      view.update(enemy);
    }
    // Views whose enemy left the state are destroyed (explosions come from events in Phase 3).
    for (const [id, view] of this.enemyViews) {
      if (seen.has(id)) continue;
      view.destroy();
      this.enemyViews.delete(id);
    }
  }

  private syncProjectiles(projectiles: readonly Projectile[]): void {
    while (this.projectilePool.length < projectiles.length) {
      const sprite = new Sprite({ texture: this.cannonBall, anchor: 0.5 });
      this.projectilePool.push(sprite);
      this.projectileLayer.addChild(sprite);
    }
    for (let i = 0; i < this.projectilePool.length; i++) {
      const sprite = this.projectilePool[i];
      if (!sprite) continue;
      const projectile = projectiles[i];
      sprite.visible = projectile !== undefined;
      if (projectile) sprite.position.set(projectile.x, projectile.y);
    }
  }
}
