import { describe, expect, it } from 'vitest';

import { makeMatch, NO_SPAWNS, ofType, run, stepsFor } from './helpers';

describe('player weapons', () => {
  it('front cannon fires one projectile forward (R11)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const events = run(match, 1, { fireFront: true });
    expect(match.state.projectiles).toHaveLength(1);
    const [shot] = match.state.projectiles;
    expect(shot?.dirX).toBeCloseTo(1);
    expect(shot?.dirY).toBeCloseTo(0);
    expect(ofType(events, 'shotFired')).toHaveLength(1);
  });

  it('respects the front cooldown while the button is held (R28)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    const cooldown = match.config.player.front.cooldownMs;
    const shotsBefore = ofType(
      run(match, stepsFor(match, cooldown), { fireFront: true }),
      'shotFired',
    );
    expect(shotsBefore).toHaveLength(1);
    const shotsAfter = ofType(run(match, 1, { fireFront: true }), 'shotFired');
    expect(shotsAfter).toHaveLength(1);
  });

  it('left broadside fires three parallel projectiles out of the left side (R12)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 1, { fireLeft: true });
    const shots = match.state.projectiles;
    expect(shots).toHaveLength(3);
    for (const shot of shots) {
      // Facing right, the left (port) side points up the screen (-y).
      expect(shot.dirX).toBeCloseTo(0);
      expect(shot.dirY).toBeCloseTo(-1);
    }
    const xs = shots.map((s) => s.x).sort((a, b) => a - b);
    const spacing = match.config.player.broadside.spacingPx;
    expect((xs[1] ?? 0) - (xs[0] ?? 0)).toBeCloseTo(spacing);
    expect((xs[2] ?? 0) - (xs[1] ?? 0)).toBeCloseTo(spacing);
  });

  it('right broadside fires out of the right side', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 1, { fireRight: true });
    expect(match.state.projectiles).toHaveLength(3);
    for (const shot of match.state.projectiles) expect(shot.dirY).toBeCloseTo(1);
  });

  it('each weapon has its own cooldown, so all can fire together', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 1, { fireFront: true, fireLeft: true, fireRight: true });
    expect(match.state.projectiles).toHaveLength(7);
    // Front is ready again before the broadsides.
    run(match, stepsFor(match, match.config.player.front.cooldownMs), {
      fireFront: true,
      fireLeft: true,
    });
    expect(match.state.player.cooldowns.left).toBeGreaterThan(0);
  });

  it('fires while moving (R16)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    run(match, 10, { forward: true, turnLeft: true, fireFront: true });
    expect(match.state.player.x).toBeGreaterThan(960);
    expect(match.state.projectiles.length).toBeGreaterThan(0);
  });
});
