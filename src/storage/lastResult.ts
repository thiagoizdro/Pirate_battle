import type { MatchRecord } from '../api/contracts';
import { isRecord, readStored, writeStored } from './localStore';

const KEY = 'last-result';

function isMatchRecord(value: unknown): value is MatchRecord {
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

/** The last completed match survives a refresh (R56). Abandoned matches are never saved (R57). */
export function loadLastResult(): MatchRecord | null {
  return readStored<MatchRecord | null>(
    KEY,
    (value): value is MatchRecord | null => isMatchRecord(value),
    null,
  );
}

export function saveLastResult(record: MatchRecord): void {
  writeStored(KEY, record);
}
