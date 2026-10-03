import { describe, expect, it } from 'vitest';

import { createMatchRecord } from '../../src/app/matchRecord';
import { parseHash, routeToHash } from '../../src/app/router';
import type { HudSnapshot } from '../../src/game/bridge';
import { describeHudChange } from '../../src/ui/game/announcements';

describe('router', () => {
  it.each([
    ['', { name: 'menu' }],
    ['#/', { name: 'menu' }],
    ['#/options', { name: 'options' }],
    ['#/log/ranking', { name: 'log', tab: 'ranking' }],
    ['#/log/history', { name: 'log', tab: 'history' }],
    ['#/battle', { name: 'battle' }],
    ['#/result', { name: 'result' }],
    ['#/nonsense', { name: 'menu' }],
  ])('parses %s', (hash, route) => {
    expect(parseHash(hash)).toEqual(route);
  });

  it('round-trips every route', () => {
    for (const hash of ['#/menu', '#/options', '#/log/ranking', '#/log/history', '#/result']) {
      expect(routeToHash(parseHash(hash))).toBe(hash);
    }
  });
});

const BASE: HudSnapshot = {
  status: 'running',
  pauseReason: null,
  score: 0,
  secondsLeft: 120,
  health: 100,
  maxHealth: 100,
  result: null,
};

describe('describeHudChange (R104)', () => {
  it('stays silent for ordinary timer ticks and health changes', () => {
    expect(describeHudChange(BASE, { ...BASE, secondsLeft: 119 })).toBe('');
    expect(describeHudChange(BASE, { ...BASE, health: 80 })).toBe('');
  });

  it('announces score changes', () => {
    expect(describeHudChange(BASE, { ...BASE, score: 1 })).toBe('Score 1.');
  });

  it('announces 30 and 10 seconds left', () => {
    expect(describeHudChange({ ...BASE, secondsLeft: 31 }, { ...BASE, secondsLeft: 30 })).toBe(
      '30 seconds left.',
    );
    expect(describeHudChange({ ...BASE, secondsLeft: 11 }, { ...BASE, secondsLeft: 10 })).toBe(
      '10 seconds left.',
    );
  });

  it('announces low health once', () => {
    const low = { ...BASE, health: 20 };
    expect(describeHudChange(BASE, low)).toBe('Health low.');
    expect(describeHudChange(low, { ...low, health: 10 })).toBe('');
  });

  it('announces pause with its reason, and resume', () => {
    const paused: HudSnapshot = { ...BASE, status: 'paused', pauseReason: 'blur' };
    expect(describeHudChange(BASE, paused)).toContain('lost focus');
    expect(describeHudChange(paused, BASE)).toBe('Game resumed.');
  });

  it('announces the end with reason and final score', () => {
    const ended: HudSnapshot = {
      ...BASE,
      status: 'ended',
      score: 7,
      result: {
        score: 7,
        elapsedMs: 120000,
        endReason: 'time_up',
        options: { sessionSeconds: 120, spawnIntervalSeconds: 3 },
        seed: 1,
      },
    };
    expect(describeHudChange(BASE, ended)).toBe('Battle over: Time up. Final score 7.');
  });
});

describe('createMatchRecord', () => {
  it('builds the record that is stored and registered', () => {
    const record = createMatchRecord(
      {
        score: 12,
        elapsedMs: 95432.7,
        endReason: 'defeated',
        options: { sessionSeconds: 150, spawnIntervalSeconds: 2.5 },
        seed: 9,
      },
      { id: 'player-1', name: 'Captain Jack' },
      new Date('2026-10-03T12:00:00.000Z'),
      'match-1',
    );
    expect(record).toEqual({
      matchId: 'match-1',
      playerId: 'player-1',
      playerName: 'Captain Jack',
      playedAt: '2026-10-03T12:00:00.000Z',
      score: 12,
      durationMs: 95433,
      endReason: 'defeated',
      config: { sessionSeconds: 150, spawnIntervalSeconds: 2.5, balanceVersion: 1 },
      configKey: 'v1-150s-2.5s',
    });
  });
});
