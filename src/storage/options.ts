import { DEFAULT_OPTIONS, validateOptions, type GameOptions } from '../game/config';
import { isRecord, readStored, writeStored } from './localStore';

const KEY = 'options';

function isGameOptions(value: unknown): value is GameOptions {
  return (
    isRecord(value) &&
    typeof value.sessionSeconds === 'number' &&
    typeof value.spawnIntervalSeconds === 'number' &&
    Object.keys(validateOptions(value as unknown as GameOptions)).length === 0
  );
}

/** Saved options, or the defaults when nothing valid is stored (R47, R56). */
export function loadOptions(): GameOptions {
  return readStored(KEY, isGameOptions, DEFAULT_OPTIONS);
}

export function saveOptions(options: GameOptions): boolean {
  return writeStored(KEY, options);
}
