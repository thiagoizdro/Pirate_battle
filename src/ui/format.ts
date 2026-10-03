/** 125 -> "02:05". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const END_REASON_LABEL = {
  time_up: 'Time up',
  defeated: 'Defeated',
} as const;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * "2026-09-08T21:42:00Z" -> { date: "08 SEP", time: "21:42" } in the player's time zone.
 * Month names come from a fixed table so the text is identical in every browser.
 */
export function formatPlayedAt(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '' };
  return {
    date: `${pad(date.getDate())} ${MONTHS[date.getMonth()] ?? ''}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}
