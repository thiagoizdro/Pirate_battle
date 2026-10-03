import { SeededRng } from '../game/simulation/rng';
import type { ScenarioId } from './scenarios';

export type RequestKind = 'ranking' | 'history' | 'register';

/** What the mock server should do with one request. */
export type Behaviour =
  | { type: 'respond'; delayMs: number }
  | { type: 'network-error'; delayMs: number }
  | { type: 'status'; status: number; delayMs: number }
  /** Store the match, then answer only after the client has already timed out. */
  | { type: 'save-then-hang'; delayMs: number };

export interface NetworkTiming {
  /** The client timeout; "timeout" scenarios wait longer than this. */
  timeoutMs: number;
  /** Latency of a normal response. */
  baseLatencyMs: number;
  slowLatencyMs: number;
}

export const DEFAULT_TIMING: NetworkTiming = {
  timeoutMs: 4000,
  baseLatencyMs: 120,
  slowLatencyMs: 2000,
};

/** How many registrations fail in "unavailable-then-recover" before the API is back. */
const FAILURES_BEFORE_RECOVERY = 3;

/**
 * Decides latency and failures for the current scenario. All randomness comes from a seeded RNG
 * and all counters reset when the scenario changes, so every run is reproducible (R95).
 */
export class MockNetwork {
  private scenarioId: ScenarioId;
  private seedValue: number;
  private rng: SeededRng;
  private listRequests = 0;
  private registerAttempts = 0;
  /** matchIds already answered late once in "timeout-after-save"; the resend answers normally. */
  private readonly hungOnce = new Set<string>();
  private readonly timing: NetworkTiming;
  private readonly listeners = new Set<() => void>();

  constructor(scenario: ScenarioId, seed: number, timing: NetworkTiming = DEFAULT_TIMING) {
    this.scenarioId = scenario;
    this.seedValue = seed;
    this.rng = new SeededRng(seed);
    this.timing = timing;
  }

  get scenario(): ScenarioId {
    return this.scenarioId;
  }

  get seed(): number {
    return this.seedValue;
  }

  setScenario(scenario: ScenarioId, seed = this.seedValue): void {
    this.scenarioId = scenario;
    this.seedValue = seed;
    this.reset();
  }

  /** Restarts counters and the RNG (used by "Reset mock data" too). */
  reset(): void {
    this.rng = new SeededRng(this.seedValue);
    this.listRequests = 0;
    this.registerAttempts = 0;
    this.hungOnce.clear();
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** True when list endpoints should return empty pages. */
  get emptyLists(): boolean {
    return this.scenarioId === 'empty';
  }

  get extraPages(): boolean {
    return this.scenarioId === 'multiple-pages';
  }

  behaviourFor(kind: RequestKind, matchId?: string): Behaviour {
    const { timeoutMs, baseLatencyMs, slowLatencyMs } = this.timing;
    const respond = (delayMs = baseLatencyMs): Behaviour => ({ type: 'respond', delayMs });
    const tooLate = timeoutMs + 1500;

    switch (this.scenarioId) {
      case 'slow':
        return respond(slowLatencyMs);
      case 'variable-latency':
        return respond(Math.round(this.rng.range(100, 2500)));
      case 'out-of-order': {
        if (kind === 'register') return respond();
        // 1st list request slow, 2nd fast, 3rd slow... so answers arrive in reverse order.
        const slowOne = this.listRequests++ % 2 === 0;
        return respond(slowOne ? slowLatencyMs : baseLatencyMs);
      }
      case 'timeout':
        return { type: 'respond', delayMs: tooLate };
      case 'connection-failure':
        return { type: 'network-error', delayMs: baseLatencyMs };
      case 'client-error':
        return { type: 'status', status: kind === 'register' ? 422 : 400, delayMs: baseLatencyMs };
      case 'server-error':
        return { type: 'status', status: 500, delayMs: baseLatencyMs };
      case 'ranking-failure':
        return kind === 'ranking'
          ? { type: 'status', status: 500, delayMs: baseLatencyMs }
          : respond();
      case 'history-failure':
        return kind === 'history'
          ? { type: 'status', status: 500, delayMs: baseLatencyMs }
          : respond();
      case 'timeout-after-save':
        if (kind === 'register' && matchId !== undefined && !this.hungOnce.has(matchId)) {
          this.hungOnce.add(matchId);
          return { type: 'save-then-hang', delayMs: tooLate };
        }
        return respond();
      case 'unavailable-then-recover':
        if (kind === 'register' && this.registerAttempts++ < FAILURES_BEFORE_RECOVERY) {
          return { type: 'status', status: 503, delayMs: baseLatencyMs };
        }
        return respond();
      case 'success':
      case 'empty':
      case 'multiple-pages':
        return respond();
    }
  }
}
