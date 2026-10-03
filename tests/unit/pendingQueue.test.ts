import { beforeEach, describe, expect, it } from 'vitest';

import type { MatchRecord } from '../../src/api/contracts';
import { PendingQueue, registrationStatus } from '../../src/api/pendingQueue';
import { installMemoryStorage } from './memoryStorage';

const storage = installMemoryStorage();

const record = (matchId: string): MatchRecord => ({
  matchId,
  playerId: 'p',
  playerName: 'Player',
  playedAt: '2026-10-01T10:00:00.000Z',
  score: 1,
  durationMs: 1000,
  endReason: 'defeated',
  config: { sessionSeconds: 60, spawnIntervalSeconds: 3, balanceVersion: 1 },
  configKey: 'v1-60s-3s',
});

beforeEach(() => {
  storage.clear();
});

describe('PendingQueue (R83)', () => {
  it('persists entries so they survive a reload', () => {
    new PendingQueue().enqueue(record('a'));
    expect(new PendingQueue().find('a')?.status).toBe('pending');
  });

  it('keeps a single entry per match', () => {
    const queue = new PendingQueue();
    queue.enqueue(record('a'));
    queue.enqueue(record('a'));
    expect(queue.getSnapshot().entries).toHaveLength(1);
  });

  it('never starts a second send of the same match while one is in flight', () => {
    const queue = new PendingQueue();
    queue.enqueue(record('a'));
    expect(queue.tryStartSending('a')).toBe(true);
    expect(queue.tryStartSending('a')).toBe(false);
    // The refused attempt is remembered, so the caller can resend once this one settles.
    expect(queue.finishSending('a')).toBe(true);
    expect(queue.tryStartSending('a')).toBe(true);
    expect(queue.finishSending('a')).toBe(false);
  });

  it('keeps failed entries with the error, and removes confirmed ones', () => {
    const queue = new PendingQueue();
    queue.enqueue(record('a'));
    queue.markFailed('a', 'Server error');
    expect(queue.find('a')).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'Server error',
    });
    queue.remove('a');
    expect(queue.find('a')).toBeUndefined();
  });

  it('derives the status shown to the player', () => {
    const queue = new PendingQueue();
    queue.enqueue(record('a'));
    expect(registrationStatus(queue.getSnapshot(), 'a')).toBe('pending');
    queue.tryStartSending('a');
    expect(registrationStatus(queue.getSnapshot(), 'a')).toBe('sending');
    queue.finishSending('a');
    queue.markFailed('a', 'x');
    expect(registrationStatus(queue.getSnapshot(), 'a')).toBe('failed');
    queue.remove('a');
    expect(registrationStatus(queue.getSnapshot(), 'a')).toBe('saved');
  });
});
