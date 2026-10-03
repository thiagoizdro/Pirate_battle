import { isRecord, readStored, writeStored } from '../storage/localStore';
import type { MatchRecord } from './contracts';

export type RegistrationStatus = 'pending' | 'sending' | 'failed' | 'saved';

/** A completed match that the server has not confirmed yet. */
export interface PendingEntry {
  record: MatchRecord;
  /** "pending" = waiting to be sent; "failed" = last attempt failed (will be retried). */
  status: 'pending' | 'failed';
  attempts: number;
  lastError: string | null;
}

export interface QueueSnapshot {
  entries: readonly PendingEntry[];
  /** matchIds with a request in flight right now (memory only; a reload clears it). */
  sending: ReadonlySet<string>;
}

const KEY = 'pending-matches';

function isEntry(value: unknown): value is PendingEntry {
  return (
    isRecord(value) &&
    isRecord(value.record) &&
    typeof value.record.matchId === 'string' &&
    (value.status === 'pending' || value.status === 'failed') &&
    typeof value.attempts === 'number'
  );
}

function isEntryList(value: unknown): value is PendingEntry[] {
  return Array.isArray(value) && value.every(isEntry);
}

/**
 * Persisted queue of matches waiting to be registered (R83).
 * The record is written here BEFORE it is sent, so a failure, a timeout or closing the tab never
 * loses it. It leaves the queue only when the server confirms it (new or already existing).
 */
export class PendingQueue {
  private snapshot: QueueSnapshot;
  private readonly listeners = new Set<() => void>();
  /** Matches whose resend was requested while a request was still in flight. */
  private readonly resendRequested = new Set<string>();

  constructor() {
    this.snapshot = { entries: readStored(KEY, isEntryList, []), sending: new Set() };
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): QueueSnapshot => this.snapshot;

  /** Adds a record once; enqueuing the same matchId twice keeps a single entry (R81). */
  enqueue(record: MatchRecord): void {
    if (this.find(record.matchId)) return;
    this.update([
      ...this.snapshot.entries,
      { record, status: 'pending', attempts: 0, lastError: null },
    ]);
  }

  remove(matchId: string): void {
    this.update(this.snapshot.entries.filter((e) => e.record.matchId !== matchId));
  }

  markFailed(matchId: string, message: string): void {
    this.update(
      this.snapshot.entries.map((e) =>
        e.record.matchId === matchId
          ? { ...e, status: 'failed', attempts: e.attempts + 1, lastError: message }
          : e,
      ),
    );
  }

  /**
   * Returns false if this match is already being sent, so a second send is never started.
   * In that case the request is remembered and reported by finishSending.
   */
  tryStartSending(matchId: string): boolean {
    if (!this.find(matchId)) return false;
    if (this.snapshot.sending.has(matchId)) {
      this.resendRequested.add(matchId);
      return false;
    }
    this.setSending(new Set([...this.snapshot.sending, matchId]));
    return true;
  }

  /** Returns true when another send was requested while this one was in flight. */
  finishSending(matchId: string): boolean {
    const next = new Set(this.snapshot.sending);
    next.delete(matchId);
    this.setSending(next);
    return this.resendRequested.delete(matchId);
  }

  find(matchId: string): PendingEntry | undefined {
    return this.snapshot.entries.find((e) => e.record.matchId === matchId);
  }

  private update(entries: PendingEntry[]): void {
    writeStored(KEY, entries);
    this.snapshot = { ...this.snapshot, entries };
    this.notify();
  }

  private setSending(sending: Set<string>): void {
    this.snapshot = { ...this.snapshot, sending };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Status of one match for the UI. A match that is no longer queued was confirmed ("saved"). */
export function registrationStatus(snapshot: QueueSnapshot, matchId: string): RegistrationStatus {
  if (snapshot.sending.has(matchId)) return 'sending';
  const entry = snapshot.entries.find((e) => e.record.matchId === matchId);
  return entry ? entry.status : 'saved';
}

export const pendingQueue = new PendingQueue();
