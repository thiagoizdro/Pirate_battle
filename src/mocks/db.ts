import type {
  HistoryQuery,
  MatchRecord,
  Page,
  RankingEntry,
  RankingQuery,
  RegisterMatchResponse,
} from '../api/contracts';

/** Where the mock server keeps its data (localStorage in the browser, memory in tests). */
export interface TextStore {
  read(): string | null;
  write(value: string): void;
}

/**
 * Deterministic ranking order (A10): score desc, then duration asc (faster is better),
 * then date asc (who did it first), then matchId asc (always unique, so no two rows tie).
 */
export function compareRanking(a: MatchRecord, b: MatchRecord): number {
  return (
    b.score - a.score ||
    a.durationMs - b.durationMs ||
    a.playedAt.localeCompare(b.playedAt) ||
    a.matchId.localeCompare(b.matchId)
  );
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, totalItems, totalPages };
}

/**
 * The mock "server database": fixtures from other players plus every confirmed record. It is
 * persisted, so confirmed matches survive a refresh and both tabs read the same data (R87, R97).
 */
export class MockDb {
  private records: MatchRecord[];
  private readonly store: TextStore;
  private readonly fixtures: readonly MatchRecord[];

  constructor(store: TextStore, fixtures: readonly MatchRecord[]) {
    this.store = store;
    this.fixtures = fixtures;
    this.records = this.load();
  }

  /** Idempotent upsert: the same matchId never creates a second record (R81, R82). */
  upsert(record: MatchRecord): RegisterMatchResponse {
    const existing = this.records.find((r) => r.matchId === record.matchId);
    if (existing) return { record: existing, created: false };
    this.records = [...this.records, record];
    this.save();
    return { record, created: true };
  }

  has(matchId: string): boolean {
    return this.records.some((r) => r.matchId === matchId);
  }

  /** Ranking for one config only; rank is the position in the full sorted list (R75). */
  ranking(query: RankingQuery, extra: readonly MatchRecord[] = []): Page<RankingEntry> {
    const sorted = [...this.records, ...extra]
      .filter((r) => r.configKey === query.configKey)
      .sort(compareRanking)
      .map((record, index) => ({ ...record, rank: index + 1 }));
    return paginate(sorted, query.page, query.pageSize);
  }

  /** One player's matches, newest first (R73). */
  history(query: HistoryQuery, extra: readonly MatchRecord[] = []): Page<MatchRecord> {
    const mine = [...this.records, ...extra]
      .filter((r) => r.playerId === query.playerId)
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt) || a.matchId.localeCompare(b.matchId));
    return paginate(mine, query.page, query.pageSize);
  }

  /** Back to the fixtures only ("Reset mock data"). */
  reset(): void {
    this.records = [...this.fixtures];
    this.save();
  }

  private load(): MatchRecord[] {
    try {
      const raw = this.store.read();
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as MatchRecord[];
      }
    } catch {
      // Corrupted data: fall back to the fixtures below.
    }
    return [...this.fixtures];
  }

  private save(): void {
    this.store.write(JSON.stringify(this.records));
  }
}
