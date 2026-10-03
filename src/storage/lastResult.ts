import type { MatchRecord } from '../api/contracts';
import { isMatchRecord } from '../api/validation';
import { readStored, writeStored } from './localStore';

const KEY = 'last-result';

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
