import type { EndReason, MatchRecord } from '../api/contracts';
import { BALANCE_VERSION, configKey } from '../game/config';

/** Other captains (R76). Ids start with "fixture-" so they never clash with real players. */
const CAPTAINS = [
  { id: 'fixture-flint', name: 'Captain Flint' },
  { id: 'fixture-sparrow', name: 'Red Sparrow' },
  { id: 'fixture-storm', name: 'Storm Rider' },
  { id: 'fixture-wolf', name: 'Sea Wolf' },
  { id: 'fixture-bonny', name: 'Anne Bonny' },
  { id: 'fixture-kidd', name: 'William Kidd' },
] as const;

/** Setups with fixture matches: the default one gets the most, so its ranking has pages. */
const SETUPS = [
  { sessionSeconds: 120, spawnIntervalSeconds: 3, matches: 14 },
  { sessionSeconds: 60, spawnIntervalSeconds: 3, matches: 6 },
  { sessionSeconds: 180, spawnIntervalSeconds: 2, matches: 5 },
] as const;

function fixtureRecord(
  index: number,
  sessionSeconds: number,
  spawnIntervalSeconds: number,
): MatchRecord {
  const captain = CAPTAINS[index % CAPTAINS.length] ?? CAPTAINS[0];
  // Simple arithmetic instead of randomness: the data is the same on every machine.
  const score = 38 - ((index * 7) % 30);
  const endReason: EndReason = index % 3 === 0 ? 'defeated' : 'time_up';
  const durationMs =
    endReason === 'time_up' ? sessionSeconds * 1000 : (40 + ((index * 13) % 60)) * 1000;
  const day = 1 + (index % 8);
  const hour = 18 + (index % 5);
  const options = { sessionSeconds, spawnIntervalSeconds };
  return {
    matchId: `fixture-${sessionSeconds}-${spawnIntervalSeconds}-${String(index).padStart(2, '0')}`,
    playerId: captain.id,
    playerName: captain.name,
    playedAt: `2026-09-${String(day).padStart(2, '0')}T${hour}:${String((index * 11) % 60).padStart(2, '0')}:00.000Z`,
    score,
    durationMs,
    endReason,
    config: { ...options, balanceVersion: BALANCE_VERSION },
    configKey: configKey(options),
  };
}

export const FIXTURE_MATCHES: readonly MatchRecord[] = SETUPS.flatMap((setup, setupIndex) =>
  Array.from({ length: setup.matches }, (_, i) =>
    fixtureRecord(setupIndex * 20 + i, setup.sessionSeconds, setup.spawnIntervalSeconds),
  ),
);

/**
 * Extra matches for the "multiple pages" scenario, generated for whoever asks, so even a new
 * player sees several pages of history. They are not stored.
 */
export function generatedMatches(
  playerId: string,
  playerName: string,
  key: string,
  count: number,
): MatchRecord[] {
  const [, session = '120', spawn = '3'] = /^v\d+-(\d+)s-([\d.]+)s$/.exec(key) ?? [];
  const sessionSeconds = Number(session);
  const spawnIntervalSeconds = Number(spawn);
  return Array.from({ length: count }, (_, i) => ({
    ...fixtureRecord(i, sessionSeconds, spawnIntervalSeconds),
    matchId: `generated-${playerId}-${i}`,
    playerId,
    playerName,
  }));
}
