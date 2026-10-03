import { Container, Sprite, type Texture } from 'pixi.js';

import type { GameEvent } from '../simulation/events';
import type { Enemy, MatchState, Projectile, ShipKind } from '../simulation/types';
import { frameTexture, type GameAssets } from './assets';
import { EffectsRenderer } from './EffectsRenderer';
import { shipFrame, WRECK_STATE } from './shipArt';
import { SHIP_SCALE, ShipView, SPRITE_ROTATION_OFFSET } from './ShipView';

const EXPLOSION_SIZE: Record<ShipKind, number> = { player: 1.2, chaser: 0.9, shooter: 1 };

/**
 * Draws ships, projectiles and effects from the simulation state and its events.
 * It never changes the state. Projectile sprites and effects are pooled.
 */
export class EntityRenderer {
  readonly root = new Container({ label: 'entities' });
  private readonly shipLayer = new Container({ label: 'ships' });
  private readonly projectileLayer = new Container({ label: 'projectiles' });
  private readonly effects: EffectsRenderer;
  private readonly assets: GameAssets;
  private readonly reducedMotion: boolean;
  private readonly wreckTextures: Record<ShipKind, Texture>;
  private readonly cannonBall: Texture;
  private playerView: ShipView;
  private readonly enemyViews = new Map<number, ShipView>();
  private readonly projectilePool: Sprite[] = [];
  /** Reused every frame to find views whose enemy is gone, without allocating. */
  private readonly seenEnemyIds = new Set<number>();

  constructor(assets: GameAssets, reducedMotion: boolean) {
    this.assets = assets;
    this.reducedMotion = reducedMotion;
    this.effects = new EffectsRenderer(assets);
    const wreck = (kind: ShipKind): Texture =>
      frameTexture(assets.ships, shipFrame(kind, WRECK_STATE));
    this.wreckTextures = {
      player: wreck('player'),
      chaser: wreck('chaser'),
      shooter: wreck('shooter'),
    };
    this.cannonBall = frameTexture(assets.ships, 'cannon_ball');
    // Wrecks (effects) sit under living ships? No: effects go on top so explosions are visible.
    this.root.addChild(this.shipLayer, this.projectileLayer, this.effects.root);
    this.playerView = this.createShipView('player');
  }

  /** Called once per frame. `dtMs` only drives cosmetic animation (flames, flashes, effects). */
  sync(state: MatchState, dtMs: number): void {
    this.playerView.update(state.player, dtMs);
    this.syncEnemies(state.enemies, dtMs);
    this.syncProjectiles(state.projectiles);
    this.effects.update(dtMs);
  }

  /** Turns simulation events into visual feedback (R41, R42, R44). */
  handleEvent(event: GameEvent, state: MatchState): void {
    switch (event.type) {
      case 'shotFired':
        this.effects.muzzleFlash(event.x, event.y, event.rotation);
        break;
      case 'projectileHit':
        this.effects.hit(event.x, event.y);
        break;
      case 'projectileExpired':
        this.effects.splash(event.x, event.y);
        break;
      case 'projectileBlocked':
        this.effects.puff(event.x, event.y);
        break;
      case 'enemyDamaged':
        this.enemyViews.get(event.id)?.flash();
        break;
      case 'playerDamaged':
        this.playerView.flash();
        if (event.health === 0) {
          this.effects.explosion(state.player.x, state.player.y, EXPLOSION_SIZE.player);
        }
        break;
      case 'enemyDestroyed':
        this.effects.wreck(
          this.wreckTextures[event.kind],
          event.x,
          event.y,
          event.rotation + SPRITE_ROTATION_OFFSET,
          SHIP_SCALE[event.kind],
        );
        this.effects.explosion(event.x, event.y, EXPLOSION_SIZE[event.kind]);
        break;
      default:
        break;
    }
  }

  /** Removes every ship view and effect for a restart. Pooled sprites are kept and hidden. */
  reset(): void {
    for (const view of this.enemyViews.values()) view.destroy();
    this.enemyViews.clear();
    this.playerView.destroy();
    this.playerView = this.createShipView('player');
    for (const sprite of this.projectilePool) sprite.visible = false;
    this.effects.clear();
  }

  /** Numbers for the dev metrics overlay. */
  get displayCounts(): { ships: number; projectileSprites: number; effects: number } {
    return {
      ships: this.enemyViews.size + 1,
      projectileSprites: this.projectilePool.length,
      effects: this.effects.activeCount,
    };
  }

  private createShipView(kind: ShipKind): ShipView {
    const view = new ShipView(this.assets, kind, this.reducedMotion);
    this.shipLayer.addChild(view.root);
    return view;
  }

  private syncEnemies(enemies: readonly Enemy[], dtMs: number): void {
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
      view.update(enemy, dtMs);
    }
    // Views whose enemy left the state are destroyed; the wreck and explosion come from events.
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
