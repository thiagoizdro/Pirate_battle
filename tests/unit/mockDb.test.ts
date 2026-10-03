import { describe, expect, it } from 'vitest';

import type { MatchRecord } from '../../src/api/contracts';
import { compareRanking, MockDb, paginate, type TextStore } from '../../src/mocks/db';
import { FIXTURE_MATCHES } from '../../src/mocks/fixtures';

function memoryStore(): TextStore & { value: string | null } {
  const store = {
    value: null as string | null,
    read: () => store.value,
    write: (value: string) => {
      store.value = value;
    },
  };
  return store;
}

function record(overrides: Partial<MatchRecord>): MatchRecord {
  return {
    matchId: 'm',
    playerId: 'p',
    playerName: 'Player',
    playedAt: '2026-10-01T10:00:00.000Z',
    score: 10,
    durationMs: 120000,
    endReason: 'time_up',
    config: { sessionSeconds: 120, spawnIntervalSeconds: 3, balanceVersion: 1 },
    configKey: 'v1-120s-3s',
    ...overrides,
  };
}

describe('ranking order (A10)', () => {
  it('sorts by score desc, then duration asc, then date asc, then matchId asc', () => {
    const rows = [
      record({ matchId: 'e', score: 5 }),
      record({ matchId: 'd', score: 10, durationMs: 90000 }),
      record({ matchId: 'c', score: 10, playedAt: '2026-10-02T10:00:00.000Z' }),
      record({ matchId: 'b', score: 10 }),
      record({ matchId: 'a', score: 10 }),
    ];
    expect(rows.sort(compareRanking).map((r) => r.matchId)).toEqual(['d', 'a', 'b', 'c', 'e']);
  });
});

describe('paginate', () => {
  it('slices pages and counts them', () => {
    const page = paginate([1, 2, 3, 4, 5, 6, 7], 2, 3);
    expect(page).toEqual({ items: [4, 5, 6], page: 2, pageSize: 3, totalItems: 7, totalPages: 3 });
  });

  it('reports one (empty) page for an empty list', () => {
    expect(paginate([], 1, 5).totalPages).toBe(1);
  });
});

describe('MockDb', () => {
  it('starts with the fixtures, which have several pages for the default setup', () => {
    const db = new MockDb(memoryStore(), FIXTURE_MATCHES);
    const page = db.ranking({ configKey: 'v1-120s-3s', page: 1, pageSize: 5 });
    expect(page.totalPages).toBeGreaterThan(1);
    expect(page.items.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('only compares matches with the same config (R75)', () => {
    const db = new MockDb(memoryStore(), FIXTURE_MATCHES);
    const page = db.ranking({ configKey: 'v1-60s-3s', page: 1, pageSize: 50 });
    expect(page.items.every((r) => r.configKey === 'v1-60s-3s')).toBe(true);
  });

  it('ranks continue across pages', () => {
    const db = new MockDb(memoryStore(), FIXTURE_MATCHES);
    const second = db.ranking({ configKey: 'v1-120s-3s', page: 2, pageSize: 5 });
    expect(second.items[0]?.rank).toBe(6);
  });

  it('upsert is idempotent: the same matchId never duplicates (R81, R82)', () => {
    const db = new MockDb(memoryStore(), []);
    const first = db.upsert(record({ matchId: 'x', score: 3 }));
    const again = db.upsert(record({ matchId: 'x', score: 99 }));
    expect(first.created).toBe(true);
    expect(again).toEqual({ record: first.record, created: false });
    expect(db.ranking({ configKey: 'v1-120s-3s', page: 1, pageSize: 50 }).totalItems).toBe(1);
  });

  it('history lists only that player, newest first', () => {
    const db = new MockDb(memoryStore(), []);
    db.upsert(record({ matchId: 'old', playerId: 'me', playedAt: '2026-10-01T10:00:00.000Z' }));
    db.upsert(record({ matchId: 'new', playerId: 'me', playedAt: '2026-10-03T10:00:00.000Z' }));
    db.upsert(record({ matchId: 'other', playerId: 'someone' }));
    const page = db.history({ playerId: 'me', page: 1, pageSize: 5 });
    expect(page.items.map((r) => r.matchId)).toEqual(['new', 'old']);
  });

  it('persists confirmed records and resets to the fixtures (R87, R94)', () => {
    const store = memoryStore();
    const db = new MockDb(store, FIXTURE_MATCHES);
    db.upsert(record({ matchId: 'saved' }));
    const reloaded = new MockDb(store, FIXTURE_MATCHES);
    expect(reloaded.has('saved')).toBe(true);
    reloaded.reset();
    expect(new MockDb(store, FIXTURE_MATCHES).has('saved')).toBe(false);
  });
});
