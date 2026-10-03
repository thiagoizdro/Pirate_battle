import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApi, createHttpClient } from '../../src/api/client';
import type { MatchRecord } from '../../src/api/contracts';
import { describeApiError, isRetryable } from '../../src/api/errors';
import { MockDb, type TextStore } from '../../src/mocks/db';
import { FIXTURE_MATCHES } from '../../src/mocks/fixtures';
import { createHandlers } from '../../src/mocks/handlers';
import { MockNetwork } from '../../src/mocks/network';

/**
 * Integration tests: the real Axios client against the real MSW handlers (via msw/node),
 * with short, controlled latencies so each scenario runs in milliseconds.
 */
const TIMEOUT_MS = 300;
const store: TextStore = { read: () => null, write: () => undefined };
const db = new MockDb(store, FIXTURE_MATCHES);
const network = new MockNetwork('success', 1, {
  timeoutMs: TIMEOUT_MS,
  baseLatencyMs: 5,
  slowLatencyMs: 150,
});
const server = setupServer(...createHandlers(db, network));
const api = createApi(createHttpClient('http://localhost/api', TIMEOUT_MS));

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});
beforeEach(() => {
  db.reset();
  network.setScenario('success');
});
afterEach(() => {
  server.resetHandlers();
});

const record = (matchId: string, score = 50): MatchRecord => ({
  matchId,
  playerId: 'player-test',
  playerName: 'Test Captain',
  playedAt: '2026-10-03T12:00:00.000Z',
  score,
  durationMs: 120000,
  endReason: 'time_up',
  config: { sessionSeconds: 120, spawnIntervalSeconds: 3, balanceVersion: 1 },
  configKey: 'v1-120s-3s',
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to fail');
}

describe('API with the success scenario', () => {
  it('a registered match appears in both the ranking and the history (R87)', async () => {
    const response = await api.registerMatch(record('m1', 99));
    expect(response.created).toBe(true);
    const ranking = await api.fetchRanking({ configKey: 'v1-120s-3s', page: 1, pageSize: 5 });
    expect(ranking.items[0]).toMatchObject({ matchId: 'm1', rank: 1 });
    const history = await api.fetchHistory({ playerId: 'player-test', page: 1, pageSize: 5 });
    expect(history.items.map((m) => m.matchId)).toEqual(['m1']);
  });

  it('resending the same match returns the existing record without duplicating (R82)', async () => {
    await api.registerMatch(record('m2'));
    const again = await api.registerMatch(record('m2', 1));
    expect(again).toMatchObject({ created: false, record: { score: 50 } });
    const history = await api.fetchHistory({ playerId: 'player-test', page: 1, pageSize: 5 });
    expect(history.totalItems).toBe(1);
  });

  it('rejects an invalid record with 400', async () => {
    const error = await failure(api.registerMatch({ ...record('m3'), score: -1 }));
    expect(describeApiError(error)).toMatchObject({ kind: 'client', status: 422 });
    expect(isRetryable(error)).toBe(false);
  });
});

describe('failure scenarios', () => {
  it('empty lists', async () => {
    network.setScenario('empty');
    const ranking = await api.fetchRanking({ configKey: 'v1-120s-3s', page: 1, pageSize: 5 });
    expect(ranking.items).toEqual([]);
  });

  it('multiple pages adds generated history', async () => {
    network.setScenario('multiple-pages');
    const history = await api.fetchHistory({ playerId: 'new-player', page: 1, pageSize: 5 });
    expect(history.totalPages).toBeGreaterThan(1);
  });

  it('timeout', async () => {
    network.setScenario('timeout');
    const error = await failure(
      api.fetchRanking({ configKey: 'v1-120s-3s', page: 1, pageSize: 5 }),
    );
    expect(describeApiError(error).kind).toBe('timeout');
    expect(isRetryable(error)).toBe(true);
  });

  it('connection failure', async () => {
    network.setScenario('connection-failure');
    const error = await failure(api.fetchHistory({ playerId: 'p', page: 1, pageSize: 5 }));
    expect(describeApiError(error).kind).toBe('network');
  });

  it('HTTP 5xx and 4xx', async () => {
    network.setScenario('server-error');
    const serverError = await failure(api.fetchHistory({ playerId: 'p', page: 1, pageSize: 5 }));
    expect(describeApiError(serverError)).toMatchObject({ kind: 'server', status: 500 });
    network.setScenario('client-error');
    const clientError = await failure(api.fetchHistory({ playerId: 'p', page: 1, pageSize: 5 }));
    expect(describeApiError(clientError)).toMatchObject({ kind: 'client', status: 400 });
  });

  it('ranking failure leaves history working, and vice versa', async () => {
    network.setScenario('ranking-failure');
    await failure(api.fetchRanking({ configKey: 'v1-120s-3s', page: 1, pageSize: 5 }));
    await expect(api.fetchHistory({ playerId: 'p', page: 1, pageSize: 5 })).resolves.toBeDefined();
    network.setScenario('history-failure');
    await failure(api.fetchHistory({ playerId: 'p', page: 1, pageSize: 5 }));
    await expect(
      api.fetchRanking({ configKey: 'v1-120s-3s', page: 1, pageSize: 5 }),
    ).resolves.toBeDefined();
  });

  it('timeout after save: the resend recovers the stored record without duplicating (R92)', async () => {
    network.setScenario('timeout-after-save');
    const error = await failure(api.registerMatch(record('late')));
    expect(describeApiError(error).kind).toBe('timeout');
    expect(db.has('late')).toBe(true);
    const resend = await api.registerMatch(record('late'));
    expect(resend.created).toBe(false);
    const history = await api.fetchHistory({ playerId: 'player-test', page: 1, pageSize: 5 });
    expect(history.totalItems).toBe(1);
  });

  it('unavailable at the end, then recovers (R93)', async () => {
    network.setScenario('unavailable-then-recover');
    for (let i = 0; i < 3; i++) {
      const error = await failure(api.registerMatch(record('later')));
      expect(describeApiError(error).status).toBe(503);
    }
    await expect(api.registerMatch(record('later'))).resolves.toMatchObject({ created: true });
  });

  it('out-of-order: an older request answers after a newer one', async () => {
    network.setScenario('out-of-order');
    const finished: number[] = [];
    await Promise.all(
      [1, 2].map(async (page) => {
        await api.fetchRanking({ configKey: 'v1-120s-3s', page, pageSize: 5 });
        finished.push(page);
      }),
    );
    expect(finished).toEqual([2, 1]);
  });

  it('a canceled request is reported as canceled, not as an error to retry', async () => {
    network.setScenario('slow');
    const controller = new AbortController();
    const pending = api.fetchRanking(
      { configKey: 'v1-120s-3s', page: 1, pageSize: 5 },
      controller.signal,
    );
    controller.abort();
    const error = await failure(pending);
    expect(describeApiError(error).kind).toBe('canceled');
    expect(isRetryable(error)).toBe(false);
  });
});
