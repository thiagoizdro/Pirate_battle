/** Every reproducible network scenario (R88–R93), selectable in the panel or with ?scenario=. */
export const SCENARIOS = {
  success: { label: 'Success', description: 'Normal, fast responses.' },
  empty: { label: 'Empty lists', description: 'Ranking and history return no rows.' },
  'multiple-pages': {
    label: 'Multiple pages',
    description: 'Extra generated matches so every list has several pages.',
  },
  slow: { label: 'Slow', description: 'Every request takes about 2 seconds.' },
  'variable-latency': {
    label: 'Variable latency',
    description: 'Seeded random delay between 0.1 and 2.5 seconds.',
  },
  'out-of-order': {
    label: 'Out-of-order responses',
    description: 'Every other list request is slow, so older requests answer after newer ones.',
  },
  timeout: { label: 'Timeout', description: 'Every request takes longer than the client timeout.' },
  'connection-failure': {
    label: 'Connection failure',
    description: 'Every request fails at the network level.',
  },
  'client-error': { label: 'HTTP 4xx', description: 'Every request is rejected with 400/422.' },
  'server-error': { label: 'HTTP 5xx', description: 'Every request fails with 500.' },
  'ranking-failure': { label: 'Ranking fails', description: 'Only the ranking returns 500.' },
  'history-failure': { label: 'History fails', description: 'Only the history returns 500.' },
  'timeout-after-save': {
    label: 'Timeout after save',
    description:
      'The server stores the match but answers after the client timeout; a resend recovers it.',
  },
  'unavailable-then-recover': {
    label: 'Unavailable, then recovers',
    description: 'The first 3 registrations fail with 503, later ones succeed.',
  },
} as const;

export type ScenarioId = keyof typeof SCENARIOS;

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[];

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in SCENARIOS;
}
