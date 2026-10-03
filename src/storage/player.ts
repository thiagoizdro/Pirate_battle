import { isRecord, readStored, writeStored } from './localStore';

/** The local player: a persistent id (never shown) plus an editable display name (A11). */
export interface PlayerProfile {
  id: string;
  name: string;
}

const KEY = 'player';
export const PLAYER_NAME_MAX_LENGTH = 20;

/** Returns an error message, or null when the name is valid. */
export function validatePlayerName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Enter a captain name.';
  if (trimmed.length > PLAYER_NAME_MAX_LENGTH) {
    return `Use at most ${PLAYER_NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

function isProfile(value: unknown): value is PlayerProfile {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    validatePlayerName(value.name) === null
  );
}

function createProfile(): PlayerProfile {
  const id = crypto.randomUUID();
  return { id, name: `Captain ${id.slice(0, 4).toUpperCase()}` };
}

/** Loads the profile, creating and saving a new one on first visit. */
export function loadPlayer(): PlayerProfile {
  const stored = readStored<PlayerProfile | null>(
    KEY,
    (value): value is PlayerProfile | null => isProfile(value),
    null,
  );
  if (stored) return stored;
  const created = createProfile();
  writeStored(KEY, created);
  return created;
}

export function savePlayerName(profile: PlayerProfile, name: string): PlayerProfile {
  const next = { ...profile, name: name.trim() };
  writeStored(KEY, next);
  return next;
}
