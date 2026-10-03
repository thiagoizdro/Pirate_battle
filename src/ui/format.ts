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
