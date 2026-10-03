/** All keys share this prefix, so "Reset" features can find them and nothing clashes. */
export const STORAGE_PREFIX = 'pirate-battle:';

/**
 * Reads a JSON value from localStorage and validates it. Returns the fallback when the key is
 * missing, the JSON is broken, the shape is wrong, or storage is unavailable (private mode).
 */
export function readStored<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): T {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Writes a JSON value; returns false if storage is unavailable or full. */
export function writeStored(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
