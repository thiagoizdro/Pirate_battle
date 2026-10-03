import type { MatchRecord } from '../api/contracts';
import type { MatchResult } from '../game/bridge';
import { BALANCE_VERSION, configKey } from '../game/config';
import type { PlayerProfile } from '../storage/player';

/**
 * Turns the end of a match into the record that is stored and registered. The matchId is created
 * here, once, so every later resend of this record is recognised as the same match (R81, R82).
 */
export function createMatchRecord(
  result: MatchResult,
  player: PlayerProfile,
  now: Date,
  matchId: string = crypto.randomUUID(),
): MatchRecord {
  return {
    matchId,
    playerId: player.id,
    playerName: player.name,
    playedAt: now.toISOString(),
    score: result.score,
    durationMs: Math.round(result.elapsedMs),
    endReason: result.endReason,
    config: {
      sessionSeconds: result.options.sessionSeconds,
      spawnIntervalSeconds: result.options.spawnIntervalSeconds,
      balanceVersion: BALANCE_VERSION,
    },
    configKey: configKey(result.options),
  };
}
