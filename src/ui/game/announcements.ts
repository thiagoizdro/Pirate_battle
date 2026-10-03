import type { HudSnapshot } from '../../game/bridge';
import { END_REASON_LABEL } from '../format';

const TIME_ANNOUNCEMENTS = new Set([60, 30, 10]);
const LOW_HEALTH_RATIO = 0.25;

const PAUSE_REASON_TEXT = {
  manual: 'Game paused.',
  blur: 'Game paused because the window lost focus.',
  hidden: 'Game paused because the tab was hidden.',
  orientation: 'Game paused. Rotate your device to landscape to continue.',
} as const;

/**
 * What a screen reader should hear when the HUD changes (R104). Only meaningful changes produce
 * text: score changes, a few time marks, low health, pause, resume and the end. The timer
 * ticking every second, or health changing, is NOT announced (it would be every few frames).
 * Returns an empty string when nothing is worth announcing.
 */
export function describeHudChange(previous: HudSnapshot, next: HudSnapshot): string {
  if (next.status === 'ended' && previous.status !== 'ended' && next.result) {
    return `Battle over: ${END_REASON_LABEL[next.result.endReason]}. Final score ${next.result.score}.`;
  }
  if (next.status === 'paused' && previous.status !== 'paused') {
    return PAUSE_REASON_TEXT[next.pauseReason ?? 'manual'];
  }
  if (next.status === 'running' && previous.status === 'paused') return 'Game resumed.';

  const parts: string[] = [];
  if (next.score !== previous.score) parts.push(`Score ${next.score}.`);
  if (next.secondsLeft !== previous.secondsLeft && TIME_ANNOUNCEMENTS.has(next.secondsLeft)) {
    parts.push(`${next.secondsLeft} seconds left.`);
  }
  const lowNow = next.maxHealth > 0 && next.health / next.maxHealth < LOW_HEALTH_RATIO;
  const lowBefore =
    previous.maxHealth > 0 && previous.health / previous.maxHealth < LOW_HEALTH_RATIO;
  if (lowNow && !lowBefore && next.health > 0) parts.push('Health low.');
  return parts.join(' ');
}
