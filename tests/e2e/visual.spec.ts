import type { Page } from '@playwright/test';

import type { MatchRecord } from '../../src/api/contracts';
import { expect, NO_SPAWNS, openApp, spawnEnemy, startBattle, state, step, test } from './support';

/** A fixed last result, so the menu and result screens look the same on every run. */
const FIXED_RESULT: MatchRecord = {
  matchId: 'visual-match',
  playerId: 'e2e-player',
  playerName: 'Captain Test',
  playedAt: '2026-09-08T19:36:00.000Z',
  score: 24,
  durationMs: 120_000,
  endReason: 'time_up',
  config: { sessionSeconds: 120, spawnIntervalSeconds: 3, balanceVersion: 1 },
  configKey: 'v1-120s-3s',
};

/** Waits until every image on the page has finished loading and fonts are ready. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? Promise.resolve() : new Promise((resolve) => (img.onload = resolve)),
      ),
    );
  });
}

test.describe('visual regression (R119)', () => {
  test('main menu @main', async ({ page }) => {
    await openApp(page, { lastResult: FIXED_RESULT });
    await settle(page);
    await expect(page).toHaveScreenshot('menu.png');
  });

  test('arena in a stable seeded state @main', async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS, gameSeed: 7 });
    await startBattle(page);
    const { player } = await state(page);
    await spawnEnemy(page, 'chaser', player.x + 420, player.y - 260, Math.PI);
    await spawnEnemy(page, 'shooter', player.x - 380, player.y + 220, 0);
    await step(page, 400);
    await settle(page);
    // Let the renderer draw the stepped state.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(page).toHaveScreenshot('arena.png');
  });

  test('result screen @main', async ({ page }) => {
    await openApp(page, { route: 'result', lastResult: FIXED_RESULT });
    await expect(page.getByTestId('registration-status')).toContainText('Registered');
    await settle(page);
    await expect(page).toHaveScreenshot('result.png');
  });
});
