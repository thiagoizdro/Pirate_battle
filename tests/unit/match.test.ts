import { describe, expect, it } from 'vitest';

import { DEFAULT_ARENA } from '../../src/game/simulation/arena';
import type { InputState } from '../../src/game/simulation/types';
import { input, makeMatch, NO_SPAWNS, ofType, placeEnemy, run, stepsFor } from './helpers';

/** A scripted input sequence: sail, turn and fire in a repeating pattern. */
function scriptedInput(step: number): InputState {
  return input({
    forward: step % 240 < 180,
    turnLeft: step % 400 < 60,
    turnRight: step % 400 > 300,
    fireFront: step % 50 === 0,
    fireLeft: step % 170 === 0,
    fireRight: step % 230 === 0,
  });
}

describe('match end', () => {
  it('ends by time after exactly the session duration (R32)', () => {
    const match = makeMatch({ balance: NO_SPAWNS, options: { sessionSeconds: 60 } });
    run(match, stepsFor(match, 60000) - 1);
    expect(match.state.status).toBe('running');
    const events = run(match, 1);
    expect(match.state.status).toBe('ended');
    expect(match.state.endReason).toBe('time_up');
    expect(match.state.elapsedMs).toBe(60000);
    expect(match.remainingMs).toBe(0);
    expect(ofType(events, 'matchEnded')).toEqual([
      { type: 'matchEnded', reason: 'time_up', score: 0, elapsedMs: 60000 },
    ]);
  });

  it('ends when the player health reaches zero (R32)', () => {
    const match = makeMatch({ balance: NO_SPAWNS });
    match.state.player.health = 5;
    placeEnemy(match, 'chaser', 1060, 544, Math.PI);
    run(match, stepsFor(match, 2000));
    expect(match.state.status).toBe('ended');
    expect(match.state.endReason).toBe('defeated');
    expect(match.state.player.health).toBe(0);
  });

  it('freezes everything after the end (R33)', () => {
    const match = makeMatch({
      map: DEFAULT_ARENA,
      options: { sessionSeconds: 60, spawnIntervalSeconds: 1 },
    });
    match.state.player.health = 100000;
    for (let i = 0; i < stepsFor(match, 60000); i++) match.step(scriptedInput(i));
    match.drainEvents();
    expect(match.state.status).toBe('ended');
    const frozen = structuredClone(match.state);
    const events = run(match, 600, { forward: true, fireFront: true, fireLeft: true });
    expect(events).toEqual([]);
    expect(match.state).toEqual(frozen);
  });
});

describe('determinism', () => {
  function playScripted(seed: number) {
    const match = makeMatch({
      map: DEFAULT_ARENA,
      seed,
      options: { sessionSeconds: 60, spawnIntervalSeconds: 1.5 },
    });
    const events = [];
    for (let i = 0; i < stepsFor(match, 45000); i++) {
      match.step(scriptedInput(i));
      events.push(...match.drainEvents());
    }
    return { state: match.state, events };
  }

  it('produces the same state and events for the same seed and inputs', () => {
    const a = playScripted(42);
    const b = playScripted(42);
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
    expect(ofType(a.events, 'enemySpawned').length).toBeGreaterThan(5);
  });

  it('produces different spawns for a different seed', () => {
    const a = ofType(playScripted(1).events, 'enemySpawned');
    const b = ofType(playScripted(2).events, 'enemySpawned');
    expect(a[0]?.x).not.toBe(b[0]?.x);
  });
});

describe('restart', () => {
  it('a new match starts from a clean state', () => {
    const first = makeMatch({ map: DEFAULT_ARENA, options: { spawnIntervalSeconds: 1 } });
    for (let i = 0; i < stepsFor(first, 10000); i++) first.step(scriptedInput(i));
    expect(first.state.elapsedMs).toBeGreaterThan(0);

    const second = makeMatch({ map: DEFAULT_ARENA, options: { spawnIntervalSeconds: 1 } });
    expect(second.state.elapsedMs).toBe(0);
    expect(second.state.score).toBe(0);
    expect(second.state.enemies).toEqual([]);
    expect(second.state.projectiles).toEqual([]);
    expect(second.state.player.health).toBe(second.config.player.maxHealth);
    expect(second.state.status).toBe('running');
  });
});
