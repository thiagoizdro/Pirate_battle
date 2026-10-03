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
