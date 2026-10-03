import type { Page } from '@playwright/test';

import { expect, NO_SPAWNS, openApp, startBattle, state, step, test } from './support';

const elapsed = (page: Page) =>
  page.evaluate(() => window.__PIRATE_TEST__?.state()?.elapsedMs ?? -1);

test.describe('Area 7: pause, focus loss and resume without timer drift', () => {
  test('manual pause stops the timer; resuming continues it @main', async ({ page }) => {
    await openApp(page, { balance: NO_SPAWNS });
    await startBattle(page);
    await expect.poll(() => elapsed(page)).toBeGreaterThan(300);

    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
    const pausedAt = await elapsed(page);
    await page.waitForTimeout(1500);
    expect(await elapsed(page)).toBe(pausedAt);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => elapsed(page)).toBeGreaterThan(pausedAt);
  });

  test('pauses on window blur and stays paused until the player resumes', async ({ page }) => {
    await openApp(page, { balance: NO_SPAWNS });
    await startBattle(page);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
    await expect(page.getByTestId('announcer')).toContainText('lost focus');
    const pausedAt = await elapsed(page);

    // Getting focus back is not a player action: still paused.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(1000);
    expect(await elapsed(page)).toBe(pausedAt);
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();

    await page.getByRole('button', { name: 'Resume' }).click();
    await expect.poll(() => elapsed(page)).toBeGreaterThan(pausedAt);
  });

  test('pauses when the tab is hidden', async ({ page }) => {
    await openApp(page, { balance: NO_SPAWNS });
    await startBattle(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
    await expect(page.getByTestId('announcer')).toContainText('tab was hidden');
  });

  test('keys held before the pause are not replayed after resuming', async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
    await page.keyboard.down('KeyW');
    await step(page, 200);
    const beforePause = await state(page);

    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
    await step(page, 500);
    expect((await state(page)).player.x).toBe(beforePause.player.x);

    await page.getByRole('button', { name: 'Resume' }).click();
    // W is still physically down, but it was pressed before the pause: it must be pressed again.
    await step(page, 500);
    expect((await state(page)).player.x).toBe(beforePause.player.x);
    await page.keyboard.up('KeyW');
  });
});
