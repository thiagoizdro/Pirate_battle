import { STORAGE_PREFIX } from '../storage/localStore';
import { MockDb, type TextStore } from './db';
import { FIXTURE_MATCHES } from './fixtures';
import { DEFAULT_TIMING, MockNetwork } from './network';
import { isScenarioId, type ScenarioId } from './scenarios';
import { API_TIMEOUT_MS } from '../api/client';

const DB_KEY = `${STORAGE_PREFIX}mock-db`;
const SCENARIO_KEY = `${STORAGE_PREFIX}mock-scenario`;
const DEFAULT_SEED = 1;

/** localStorage-backed store for the mock database, so confirmed records survive a refresh. */
const browserStore: TextStore = {
  read: () => {
    try {
      return window.localStorage.getItem(DB_KEY);
    } catch {
      return null;
    }
  },
  write: (value) => {
    try {
      window.localStorage.setItem(DB_KEY, value);
    } catch {
      // Storage full or blocked: the mock keeps working in memory.
    }
  },
};

/**
 * Scenario and seed come from the URL (?scenario=timeout&seed=42) when present, otherwise from
 * the last choice saved in localStorage, otherwise "success" with seed 1.
 */
function initialScenario(): { scenario: ScenarioId; seed: number } {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('scenario');
  const seedParam = Number(params.get('seed'));
  const seed = Number.isInteger(seedParam) && params.has('seed') ? seedParam : DEFAULT_SEED;
  if (isScenarioId(fromUrl)) return { scenario: fromUrl, seed };
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(SCENARIO_KEY) ?? 'null');
    if (typeof saved === 'object' && saved !== null && 'scenario' in saved && 'seed' in saved) {
      const { scenario, seed: savedSeed } = saved;
      if (isScenarioId(scenario) && typeof savedSeed === 'number') {
        return { scenario, seed: params.has('seed') ? seed : savedSeed };
      }
    }
  } catch {
    // Ignore broken saved data.
  }
  return { scenario: 'success', seed };
}

function saveScenario(scenario: ScenarioId, seed: number): void {
  try {
    window.localStorage.setItem(SCENARIO_KEY, JSON.stringify({ scenario, seed }));
  } catch {
    // Not critical.
  }
}

const initial = initialScenario();
// Remember the choice (including one made through the URL) for the next page load.
saveScenario(initial.scenario, initial.seed);

/** The single mock "server" of the app: its database and its network conditions. */
export const mockDb = new MockDb(browserStore, FIXTURE_MATCHES);
// "Slow" answers take half the client timeout, so they are slow but never time out.
export const mockNetwork = new MockNetwork(initial.scenario, initial.seed, {
  ...DEFAULT_TIMING,
  timeoutMs: API_TIMEOUT_MS,
  slowLatencyMs: Math.round(API_TIMEOUT_MS / 2),
});

/** Persists the selected scenario and keeps the URL in sync, so a refresh keeps it. */
export function selectScenario(scenario: ScenarioId): void {
  mockNetwork.setScenario(scenario);
  saveScenario(scenario, mockNetwork.seed);
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', scenario);
  window.history.replaceState(null, '', url);
}

/** "Reset mock data": back to the fixtures and fresh scenario counters (R94). */
export function resetMockData(): void {
  mockDb.reset();
  mockNetwork.reset();
}
