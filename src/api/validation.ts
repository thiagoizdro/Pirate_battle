import { isRecord } from '../storage/localStore';
import type { MatchRecord } from './contracts';

/** Runtime check of a MatchRecord: used for local storage and for the mock server's PUT body. */
export function isMatchRecord(value: unknown): value is MatchRecord {
  if (!isRecord(value) || !isRecord(value.config)) return false;
  return (
    typeof value.matchId === 'string' &&
    typeof value.playerId === 'string' &&
    typeof value.playerName === 'string' &&
    typeof value.playedAt === 'string' &&
    typeof value.score === 'number' &&
    typeof value.durationMs === 'number' &&
    (value.endReason === 'time_up' || value.endReason === 'defeated') &&
    typeof value.configKey === 'string' &&
    typeof value.config.sessionSeconds === 'number' &&
    typeof value.config.spawnIntervalSeconds === 'number' &&
    typeof value.config.balanceVersion === 'number'
  );
}
