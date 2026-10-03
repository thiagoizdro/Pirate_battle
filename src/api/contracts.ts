import type { EndReason } from '../game/simulation/types';

export type { EndReason };

/** The config a match was played with. Ranking only compares matches with the same configKey. */
export interface MatchConfigUsed {
  sessionSeconds: number;
  spawnIntervalSeconds: number;
  balanceVersion: number;
}

/** One completed match, exactly as stored locally and sent to `PUT /api/matches/:matchId`. */
export interface MatchRecord {
  /** UUID generated on the client when the match ends; makes registration idempotent. */
  matchId: string;
  playerId: string;
  playerName: string;
  /** ISO 8601 date when the match ended. */
  playedAt: string;
  score: number;
  /** Effective (active) play time in ms, pauses excluded. */
  durationMs: number;
  endReason: EndReason;
  config: MatchConfigUsed;
  /** e.g. "v1-120s-3s" (see configKey in src/game/config.ts). */
  configKey: string;
}

/** A page of results. `page` starts at 1. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** A ranking row: a match plus its position among matches with the same configKey. */
export interface RankingEntry extends MatchRecord {
  rank: number;
}

/** GET /api/ranking?page&pageSize&configKey */
export interface RankingQuery {
  page: number;
  pageSize: number;
  configKey: string;
}

/** GET /api/players/:playerId/matches?page&pageSize */
export interface HistoryQuery {
  playerId: string;
  page: number;
  pageSize: number;
}

/**
 * PUT /api/matches/:matchId is an idempotent upsert:
 * 201 + created: true when stored now, 200 + created: false when it already existed.
 */
export interface RegisterMatchResponse {
  record: MatchRecord;
  created: boolean;
}

/** Body of every 4xx/5xx response. */
export interface ApiErrorBody {
  error: string;
  message: string;
}

export const API_PAGE_SIZE = 5;
export const API_MAX_PAGE_SIZE = 50;
