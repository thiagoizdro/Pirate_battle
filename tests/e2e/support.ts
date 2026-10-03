import { expect, test as base, type Page } from '@playwright/test';

import type { MatchRecord } from '../../src/api/contracts';
import type { GameOptions } from '../../src/game/config';
import type { BalanceOverrides, TestSnapshot } from '../../src/game/testHooks';
import type { ScenarioId } from '../../src/mocks/scenarios';

/**
 * Browser network logs that are expected in failure scenarios (A37): Chrome prints them for
 * mocked 4xx/5xx/network errors and for assets blocked on purpose. Anything else fails the test.
 */
const EXPECTED_CONSOLE = [/Failed to load resource/];

/** Every test automatically fails if the page logs an unexpected error (R128). */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (EXPECTED_CONSOLE.some((pattern) => pattern.test(message.text()))) return;
        errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'unexpected console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Balancing used by most combat tests: no automatic spawns, so the test decides who is there. */
export const NO_SPAWNS: BalanceOverrides = { spawn: { maxEnemies: 0 } };

export interface OpenOptions {
  /** Hash route, e.g. "menu" or "log/ranking". */
  route?: string;
  scenario?: ScenarioId;
  /** Seed for the mock network's random latency. */
  networkSeed?: number;
  /** Seed of the match (enemy spawns). */
  gameSeed?: number;
  balance?: BalanceOverrides;
  /** Start every battle with the clock frozen (it only moves with step/advance). */
  frozen?: boolean;
  options?: GameOptions;
  player?: { id: string; name: string };
  lastResult?: MatchRecord;
}

export const TEST_PLAYER = { id: 'e2e-player', name: 'Captain Test' };

/**
 * Opens the app in a known state. Storage is written once per tab (a sessionStorage flag stops
 * the init script from overwriting what the app saves when a test reloads the page).
 */
export async function openApp(page: Page, open: OpenOptions = {}): Promise<void> {
  const storage: Record<string, unknown> = { 'pirate-battle:player': open.player ?? TEST_PLAYER };
  if (open.options) storage['pirate-battle:options'] = open.options;
  if (open.lastResult) storage['pirate-battle:last-result'] = open.lastResult;
  const setup = {
    seed: open.gameSeed ?? 1,
    balance: open.balance ?? null,
    startFrozen: open.frozen ?? false,
  };
  await page.addInitScript(
    ({ storage: values, setup: testSetup }) => {
      if (!sessionStorage.getItem('e2e-seeded')) {
        sessionStorage.setItem('e2e-seeded', '1');
        for (const [key, value] of Object.entries(values)) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
      window.__PIRATE_TEST_SETUP__ = testSetup;
    },
    { storage, setup },
  );
  const params = new URLSearchParams({
    scenario: open.scenario ?? 'success',
    seed: String(open.networkSeed ?? 1),
  });
  await page.goto(`/?${params.toString()}#/${open.route ?? 'menu'}`);
  await expect(page.locator('main')).toBeVisible();
}

/** Clicks Play and waits until the battle is running. */
export async function startBattle(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  // Generous: loading textures and decoding sounds is slower when tests run in parallel.
  await expect
    .poll(() => page.evaluate(() => window.__PIRATE_TEST__?.hasSession() ?? false), {
      timeout: 30_000,
    })
    .toBe(true);
}

export async function state(page: Page): Promise<TestSnapshot> {
  const snapshot = await page.evaluate(() => window.__PIRATE_TEST__?.state() ?? null);
  if (!snapshot) throw new Error('No battle running');
  return snapshot;
}

/** Advances the frozen simulation by `ms` of simulated time. */
export async function step(page: Page, ms: number): Promise<void> {
  await page.evaluate((duration) => {
    window.__PIRATE_TEST__?.step(duration);
  }, ms);
}

/**
 * Advances time and reads the state in ONE synchronous call. Needed when the step ends the match,
 * because the app leaves the battle screen right after the end.
 */
export async function stepAndRead(page: Page, ms: number): Promise<TestSnapshot> {
  const snapshot = await page.evaluate((duration) => {
    window.__PIRATE_TEST__?.step(duration);
    return window.__PIRATE_TEST__?.state() ?? null;
  }, ms);
  if (!snapshot) throw new Error('No battle running');
  return snapshot;
}

/** Holds a key while `ms` of simulated time pass, then releases it. */
export async function hold(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await step(page, ms);
  await page.keyboard.up(key);
}

export async function spawnEnemy(
  page: Page,
  kind: 'chaser' | 'shooter',
  x: number,
  y: number,
  rotation = 0,
): Promise<number> {
  return page.evaluate(
    (args) => window.__PIRATE_TEST__?.spawnEnemy(args.kind, args.x, args.y, args.rotation) ?? -1,
    { kind, x, y, rotation },
  );
}

/** Plays a whole short match with no enemies, so it ends by time (score 0). */
export async function finishQuietMatch(page: Page): Promise<void> {
  await startBattle(page);
  const { config } = await state(page);
  await step(page, config.sessionMs);
  await page.waitForURL(/#\/result/);
}

/** Records stored by the mock server (its "database"). */
export async function mockRecords(page: Page): Promise<MatchRecord[]> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem('pirate-battle:mock-db') ?? '[]') as MatchRecord[],
  );
}

export async function pendingCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('pirate-battle:pending-matches') ?? '[]') as unknown[])
        .length,
  );
}

/** Picks a scenario in the Network demo panel (the same control a reviewer would use). */
export async function chooseScenario(page: Page, scenario: ScenarioId): Promise<void> {
  const toggle = page.getByRole('button', { name: /^Network:/ });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await page.getByLabel('Scenario').selectOption(scenario);
}

export const QUICK_OPTIONS: GameOptions = { sessionSeconds: 60, spawnIntervalSeconds: 10 };
