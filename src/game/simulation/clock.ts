/**
 * Fixed-timestep clock with an accumulator.
 *
 * The browser gives us frames of variable length (8 ms, 16 ms, 40 ms...). The simulation must
 * always advance in equal steps, so results do not depend on the frame rate (R62):
 * real frame time goes into an accumulator and we run as many whole steps as fit in it.
 * The leftover stays for the next frame.
 *
 * The clock counts steps (an integer), so simulated time never drifts with float rounding.
 */
export class FixedStepClock {
  readonly stepMs: number;
  private readonly maxFrameDeltaMs: number;
  private accumulatorMs = 0;
  private stepCount = 0;
  private pausedFlag = false;

  constructor(stepMs: number, maxFrameDeltaMs: number) {
    if (stepMs <= 0) throw new Error('stepMs must be positive');
    this.stepMs = stepMs;
    this.maxFrameDeltaMs = maxFrameDeltaMs;
  }

  get paused(): boolean {
    return this.pausedFlag;
  }

  /** Total simulated time in ms. */
  get elapsedMs(): number {
    return this.stepCount * this.stepMs;
  }

  get steps(): number {
    return this.stepCount;
  }

  /**
   * Feeds one real frame and returns how many fixed steps to run now.
   * Paused clocks return 0 and drop the frame time, so nothing piles up during a pause (R39, R40).
   */
  consumeFrame(frameDeltaMs: number): number {
    if (this.pausedFlag) return 0;
    const clamped = Math.min(Math.max(frameDeltaMs, 0), this.maxFrameDeltaMs);
    this.accumulatorMs += clamped;
    const steps = Math.floor(this.accumulatorMs / this.stepMs);
    this.accumulatorMs -= steps * this.stepMs;
    this.stepCount += steps;
    return steps;
  }

  /**
   * Returns how many steps cover `ms` of simulated time, ignoring pause and clamping.
   * Used by tests to advance time deterministically.
   */
  consumeExact(ms: number): number {
    const steps = Math.max(0, Math.round(ms / this.stepMs));
    this.stepCount += steps;
    return steps;
  }

  pause(): void {
    this.pausedFlag = true;
    this.accumulatorMs = 0;
  }

  resume(): void {
    this.pausedFlag = false;
    this.accumulatorMs = 0;
  }
}
