import { describe, expect, it } from 'vitest';

import {
  configKey,
  createMatchConfig,
  DEFAULT_OPTIONS,
  validateOptions,
} from '../../src/game/config';

describe('validateOptions', () => {
  it('accepts the defaults', () => {
    expect(validateOptions(DEFAULT_OPTIONS)).toEqual({});
  });

  it.each([59, 181, 90.5, Number.NaN])('rejects session time %s', (sessionSeconds) => {
    const errors = validateOptions({ ...DEFAULT_OPTIONS, sessionSeconds });
    expect(errors.sessionSeconds).toBeDefined();
  });

  it.each([60, 180, 95])('accepts session time %s', (sessionSeconds) => {
    expect(validateOptions({ ...DEFAULT_OPTIONS, sessionSeconds })).toEqual({});
  });

  it.each([0, -1, 0.5, 10.5, 2.3, Number.NaN])('rejects spawn interval %s', (spawn) => {
    const errors = validateOptions({ ...DEFAULT_OPTIONS, spawnIntervalSeconds: spawn });
    expect(errors.spawnIntervalSeconds).toBeDefined();
  });

  it.each([1, 1.5, 10])('accepts spawn interval %s', (spawn) => {
    expect(validateOptions({ ...DEFAULT_OPTIONS, spawnIntervalSeconds: spawn })).toEqual({});
  });
});

describe('createMatchConfig', () => {
  it('converts options to milliseconds', () => {
    const config = createMatchConfig({ sessionSeconds: 90, spawnIntervalSeconds: 2.5 });
    expect(config.sessionMs).toBe(90000);
    expect(config.spawnIntervalMs).toBe(2500);
  });

  it('returns a deeply frozen snapshot', () => {
    const config = createMatchConfig(DEFAULT_OPTIONS);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.player.front)).toBe(true);
    expect(() => {
      (config.player as { maxHealth: number }).maxHealth = 1;
    }).toThrow(TypeError);
  });

  it('is not affected by later changes to the source options', () => {
    const options = { ...DEFAULT_OPTIONS };
    const config = createMatchConfig(options);
    options.sessionSeconds = 60;
    expect(config.sessionMs).toBe(120000);
  });

  it('throws on invalid options', () => {
    expect(() => createMatchConfig({ sessionSeconds: 10, spawnIntervalSeconds: 3 })).toThrow();
  });
});

describe('configKey', () => {
  it('includes the balance version and both options', () => {
    expect(configKey({ sessionSeconds: 120, spawnIntervalSeconds: 3 }, 1)).toBe('v1-120s-3s');
  });
});
