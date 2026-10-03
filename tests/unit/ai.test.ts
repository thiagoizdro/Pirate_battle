import { describe, expect, it } from 'vitest';

import { DEFAULT_ARENA } from '../../src/game/simulation/arena';
import { distance, distanceToRoundedRect } from '../../src/game/simulation/geometry';
import { makeMatch, NO_SPAWNS, ofType, placeEnemy, run, stepsFor } from './helpers';

describe('Chaser', () => {
  it('turns towards and closes in on the player', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    // Starts facing away from the player.
    const chaser = placeEnemy(match, 'chaser', 1500, 544, 0);
    const start = distance(chaser, match.state.player);
    // Turning around takes ~1.4 s (PI / 2.2 rad/s); after that it must be closing in.
    run(match, stepsFor(match, 3000));
    expect(distance(chaser, match.state.player)).toBeLessThan(start);
  });
});

describe('Shooter', () => {
  it('approaches until the preferred distance and then holds position', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    match.state.player.health = 100000;
    const shooter = placeEnemy(match, 'shooter', 1700, 544, Math.PI);
    run(match, stepsFor(match, 8000));
    const gap = distance(shooter, match.state.player);
    const preferred = match.config.shooter.preferredDistancePx;
    expect(gap).toBeLessThanOrEqual(preferred + 1);
    expect(gap).toBeGreaterThan(preferred - 10);
  });

  it('fires only when the player is within attack range (R19)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    match.state.player.health = 100000;
    const range = match.config.shooter.attackRangePx;
    const shooter = placeEnemy(match, 'shooter', 960 + range + 200, 544, Math.PI);
    shooter.fireCooldownMs = 0;
    const firstStep = run(match, 1);
    expect(ofType(firstStep, 'shotFired')).toHaveLength(0);
    const later = run(match, stepsFor(match, 5000));
    const shots = ofType(later, 'shotFired');
    expect(shots.length).toBeGreaterThan(0);
    expect(ofType(later, 'playerDamaged').length).toBeGreaterThan(0);
  });

  it('respects its weapon cooldown', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    match.state.player.health = 100000;
    placeEnemy(match, 'shooter', 1250, 544, Math.PI).fireCooldownMs = 0;
    const cooldown = match.config.shooter.weapon.cooldownMs;
    const events = run(match, stepsFor(match, cooldown * 3 - 100));
    expect(ofType(events, 'shotFired')).toHaveLength(3);
  });
});

describe('enemies and islands (R20)', () => {
  it('never overlap islands while hunting the player across the default map', () => {
    const match = makeMatch({ balance: NO_SPAWNS, map: DEFAULT_ARENA });
    match.state.player.health = 100000;
    // Enemies start behind islands relative to the player.
    const enemies = [
      placeEnemy(match, 'chaser', 100, 100),
      placeEnemy(match, 'shooter', 1850, 150),
      placeEnemy(match, 'chaser', 1450, 1050),
      placeEnemy(match, 'shooter', 300, 1000),
    ];
    for (let i = 0; i < stepsFor(match, 10000); i++) {
      run(match, 1);
      for (const enemy of enemies.filter((e) => e.alive)) {
        for (const obstacle of match.world.obstacles) {
          expect(distanceToRoundedRect(enemy, obstacle)).toBeGreaterThanOrEqual(
            enemy.radius - 1e-6,
          );
        }
      }
    }
  });
});
