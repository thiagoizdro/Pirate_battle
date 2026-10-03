import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_OPTIONS } from '../../src/game/config';
import { loadLastResult, saveLastResult } from '../../src/storage/lastResult';
import { STORAGE_PREFIX } from '../../src/storage/localStore';
import { loadOptions, saveOptions } from '../../src/storage/options';
import { loadPlayer, savePlayerName, validatePlayerName } from '../../src/storage/player';
import { installMemoryStorage } from './memoryStorage';

const storage = installMemoryStorage();

beforeEach(() => {
  storage.clear();
});

describe('options storage (R47)', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
  });

  it('round-trips saved options', () => {
    saveOptions({ sessionSeconds: 90, spawnIntervalSeconds: 4.5 });
    expect(loadOptions()).toEqual({ sessionSeconds: 90, spawnIntervalSeconds: 4.5 });
  });

  it('ignores corrupted or out-of-range data', () => {
    storage.setItem(`${STORAGE_PREFIX}options`, '{not json');
    expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
    storage.setItem(
      `${STORAGE_PREFIX}options`,
      JSON.stringify({ sessionSeconds: 999, spawnIntervalSeconds: 3 }),
    );
    expect(loadOptions()).toEqual(DEFAULT_OPTIONS);
  });
});

describe('player storage (A11)', () => {
  it('creates a persistent player once', () => {
    const first = loadPlayer();
    expect(first.id).toMatch(/[0-9a-f-]{36}/);
    expect(loadPlayer()).toEqual(first);
  });

  it('saves a trimmed name and keeps the id', () => {
    const player = loadPlayer();
    savePlayerName(player, '  Red Sparrow ');
    expect(loadPlayer()).toEqual({ id: player.id, name: 'Red Sparrow' });
  });

  it('validates names', () => {
    expect(validatePlayerName('')).not.toBeNull();
    expect(validatePlayerName('   ')).not.toBeNull();
    expect(validatePlayerName('x'.repeat(21))).not.toBeNull();
    expect(validatePlayerName('Captain Flint')).toBeNull();
  });
});

describe('last result storage (R56)', () => {
  it('round-trips the last completed match and rejects broken records', () => {
    expect(loadLastResult()).toBeNull();
    const record = {
      matchId: 'm1',
      playerId: 'p1',
      playerName: 'Captain',
      playedAt: '2026-10-03T12:00:00.000Z',
      score: 3,
      durationMs: 60000,
      endReason: 'time_up' as const,
      config: { sessionSeconds: 60, spawnIntervalSeconds: 3, balanceVersion: 1 },
      configKey: 'v1-60s-3s',
    };
    saveLastResult(record);
    expect(loadLastResult()).toEqual(record);
    storage.setItem(`${STORAGE_PREFIX}last-result`, JSON.stringify({ ...record, score: 'x' }));
    expect(loadLastResult()).toBeNull();
  });
});
