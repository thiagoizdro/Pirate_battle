import { describe, expect, it } from 'vitest';

import type { Match } from '../../src/game/simulation/Match';
import type { Projectile } from '../../src/game/simulation/types';
import { makeMatch, NO_SPAWNS, OPEN_MAP, ofType, placeEnemy, run, stepsFor } from './helpers';

describe('projectiles', () => {
  it('expire at their range and emit a splash event (R25)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const weapon = match.config.player.front;
    run(match, 1, { fireFront: true });
    const flightSteps = stepsFor(
      match,
      (weapon.projectileRangePx / weapon.projectileSpeedPx) * 1000,
    );
    const events = run(match, flightSteps - 2);
    expect(match.state.projectiles).toHaveLength(1);
    events.push(...run(match, 3));
    expect(match.state.projectiles).toHaveLength(0);
    expect(ofType(events, 'projectileExpired')).toHaveLength(1);
  });

  it('expire at their lifetime even if range is not reached', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 1, { fireFront: true });
    const shot = match.state.projectiles[0];
    if (!shot) throw new Error('no shot');
    shot.rangePx = Number.POSITIVE_INFINITY;
    shot.speedPx = 1;
    run(match, stepsFor(match, shot.lifetimeMs));
    expect(match.state.projectiles).toHaveLength(0);
  });

  it('are blocked by islands (R24)', () => {
    const map = {
      ...OPEN_MAP,
      islands: [{ kind: 'sand' as const, col: 17, row: 7, cols: 2, rows: 3 }],
    };
    const match = makeMatch({ balance: NO_SPAWNS, map });
    run(match, 1, { fireFront: true });
    const events = run(match, stepsFor(match, 1000));
    expect(ofType(events, 'projectileBlocked')).toHaveLength(1);
    expect(match.state.projectiles).toHaveLength(0);
  });

  it('are removed silently when leaving the arena', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    match.state.player.x = match.config.arena.widthPx - 40;
    run(match, 1, { fireFront: true });
    const events = run(match, 30);
    expect(match.state.projectiles).toHaveLength(0);
    expect(ofType(events, 'projectileExpired')).toHaveLength(0);
  });

  it('apply damage once and disappear on hit (R27)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const enemy = placeEnemy(match, 'shooter', 1160, 544, Math.PI);
    enemy.health = 1000;
    enemy.maxHealth = 1000;
    run(match, 1, { fireFront: true });
    const events = run(match, stepsFor(match, 1000));
    expect(ofType(events, 'enemyDamaged')).toHaveLength(1);
    expect(enemy.health).toBe(1000 - match.config.player.front.damage);
    expect(match.state.projectiles.filter((p) => p.owner === 'player')).toHaveLength(0);
  });

  it('enemy shots hit the player (R26)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    match.state.projectiles.push(enemyShot(match, 1100, 544, -1));
    const events = run(match, stepsFor(match, 1000));
    const damage = match.config.shooter.weapon.damage;
    expect(match.state.player.health).toBe(match.state.player.maxHealth - damage);
    expect(ofType(events, 'playerDamaged')).toHaveLength(1);
    expect(match.state.projectiles).toHaveLength(0);
  });

  it('enemy shots pass through other enemies (A13)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const chaser = placeEnemy(match, 'chaser', 1500, 200);
    match.state.projectiles.push(enemyShot(match, chaser.x, chaser.y, 1));
    run(match, 1);
    expect(chaser.health).toBe(chaser.maxHealth);
    expect(match.state.projectiles).toHaveLength(1);
  });
});

function enemyShot(match: Match, x: number, y: number, dirX: number): Projectile {
  const weapon = match.config.shooter.weapon;
  return {
    id: match.state.nextId++,
    owner: 'enemy',
    x,
    y,
    dirX,
    dirY: 0,
    speedPx: weapon.projectileSpeedPx,
    damage: weapon.damage,
    radius: weapon.projectileRadiusPx,
    traveledPx: 0,
    rangePx: weapon.projectileRangePx,
    ageMs: 0,
    lifetimeMs: weapon.projectileLifetimeMs,
  };
}
