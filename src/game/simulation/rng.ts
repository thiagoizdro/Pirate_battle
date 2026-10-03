/**
 * Seeded pseudo-random generator (mulberry32). The same seed always produces the same
 * sequence, which makes matches and tests reproducible. Never use Math.random in the simulation.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // `>>> 0` keeps the state an unsigned 32-bit integer.
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** True with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/** A random seed for normal play; tests pass their own seed instead. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}
