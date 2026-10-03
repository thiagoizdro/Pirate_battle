import { getLiveStageCount } from '../render/stageCounter';
import type { PerfMonitor, PerfRecording } from './PerfMonitor';

/** The monitor of the running battle, if any (only with ?perf). */
let currentMonitor: PerfMonitor | null = null;

export function setCurrentPerfMonitor(monitor: PerfMonitor | null): void {
  currentMonitor = monitor;
}

export function getCurrentPerfMonitor(): PerfMonitor | null {
  return currentMonitor;
}

export interface PiratePerfApi {
  liveStages(): number;
  live(): ReturnType<PerfMonitor['liveSummary']> | null;
  record(durationMs: number): Promise<PerfRecording>;
}

declare global {
  interface Window {
    /** Exposed only with ?perf, for the automated profiling script (scripts/perf-run.mjs). */
    __PIRATE_PERF__?: PiratePerfApi;
  }
}

export function installPerfGlobal(): void {
  window.__PIRATE_PERF__ = {
    liveStages: getLiveStageCount,
    live: () => currentMonitor?.liveSummary() ?? null,
    record: (durationMs) =>
      currentMonitor
        ? currentMonitor.record(durationMs)
        : Promise.reject(new Error('No battle is running')),
  };
}
