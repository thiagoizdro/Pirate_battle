import { describe, expect, it } from 'vitest';

import { makeMatch, NO_SPAWNS, ofType, placeEnemy, run, stepsFor } from './helpers';

describe('scoring and destruction', () => {
  it('scores 1 point when player shots destroy an enemy (R31)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const enemy = placeEnemy(match, 'shooter', 1160, 544, Math.PI);
    enemy.health = 1;
    run(match, 1, { fireFront: true });
    const events = run(match, stepsFor(match, 1000));
    expect(match.state.score).toBe(1);
    const destroyed = ofType(events, 'enemyDestroyed');
    expect(destroyed).toHaveLength(1);
    expect(destroyed[0]?.byPlayer).toBe(true);
    expect(match.state.enemies).toHaveLength(0);
  });

  it('never scores twice when several projectiles hit in the same step', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const enemy = placeEnemy(match, 'shooter', 960, 400, Math.PI / 2);
    enemy.health = 1;
    // A left broadside sends three projectiles towards the enemy above the player at once.
    enemy.radius = 80;
    const events = run(match, stepsFor(match, 1000), { fireLeft: true });
    expect(ofType(events, 'enemyDestroyed')).toHaveLength(1);
    expect(match.state.score).toBe(1);
  });

  it('a Chaser ramming the player deals contact damage, explodes and gives no point (R18)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    placeEnemy(match, 'chaser', 1060, 544, Math.PI);
    const events = run(match, stepsFor(match, 1000));
    const { player } = match.state;
    expect(player.health).toBe(player.maxHealth - match.config.chaser.contactDamage);
    expect(ofType(events, 'enemyDestroyed')[0]?.byPlayer).toBe(false);
    expect(match.state.score).toBe(0);
    expect(ofType(events, 'scoreChanged')).toHaveLength(0);
    expect(match.state.enemies).toHaveLength(0);
  });

  it('destroyed enemies stop colliding and dealing damage (R29)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const chaser = placeEnemy(match, 'chaser', 1060, 544, Math.PI);
    chaser.health = 1;
    // Shoot it before it reaches the player.
    run(match, stepsFor(match, 1000), { fireFront: true });
    expect(match.state.score).toBe(1);
    expect(match.state.player.health).toBe(match.state.player.maxHealth);
  });
});
