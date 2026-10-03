import type { Page } from '@playwright/test';

import type { MatchRecord } from '../../src/api/contracts';
import {
  expect,
  finishQuietMatch,
  mockRecords,
  NO_SPAWNS,
  openApp,
  QUICK_OPTIONS,
  test,
} from './support';

const quiet = { frozen: true, balance: NO_SPAWNS, options: QUICK_OPTIONS };

async function lastMatchId(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('pirate-battle:last-result') ?? '{}') as MatchRecord)
        .matchId,
  );
}

test.describe('Area 12: resend after timeout, repeated clicks, late responses', () => {
  test('a timeout after the server saved the match recovers without duplicating @main', async ({
    page,
  }) => {
    let puts = 0;
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().includes('/api/matches/')) puts++;
    });
    await openApp(page, { ...quiet, scenario: 'timeout-after-save' });
    await finishQuietMatch(page);
    await expect(page.getByTestId('registration-status')).toContainText('Registered', {
      timeout: 20_000,
    });
    // At least one resend happened, yet the server holds a single record for this match.
    expect(puts).toBeGreaterThanOrEqual(2);
    const id = await lastMatchId(page);
    expect((await mockRecords(page)).filter((r) => r.matchId === id)).toHaveLength(1);

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await page.getByRole('button', { name: 'Match History' }).click();
    await expect(page.getByTestId('history-table').locator('tbody tr')).toHaveCount(1);
  });

  test('clicking Retry many times sends a single request', async ({ page }) => {
    await openApp(page, { ...quiet, scenario: 'unavailable-then-recover' });
    await finishQuietMatch(page);
    const status = page.getByTestId('registration-status');
    await expect(status).toContainText('Registration failed', { timeout: 20_000 });

    let puts = 0;
    page.on('request', (request) => {
      if (request.method() === 'PUT') puts++;
    });
    // Five clicks in the same instant (faster than any person).
    await status.getByRole('button', { name: 'Retry' }).evaluate((button) => {
      for (let i = 0; i < 5; i++) (button as HTMLButtonElement).click();
    });
    await expect(status).toContainText('Registered');
    expect(puts).toBe(1);
    const id = await lastMatchId(page);
    expect((await mockRecords(page)).filter((r) => r.matchId === id)).toHaveLength(1);
  });

  test('a late answer for another page never replaces the page on screen', async ({ page }) => {
    // In this scenario every other list request is slow, so answers come back out of order.
    await openApp(page, { route: 'log/ranking', scenario: 'out-of-order' });
    const firstRank = page.getByTestId('ranking-table').locator('tbody tr').first();
    await expect(firstRank).toContainText('01');

    await page.getByRole('button', { name: 'Next page' }).click(); // fast answer
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await expect(firstRank).toContainText('06');

    await page.getByRole('button', { name: 'Next page' }).click(); // slow answer for page 3
    await page.getByRole('button', { name: 'Previous page' }).click(); // back to cached page 2
    await expect(page.getByText(/^Page 2 of 3/)).toBeVisible();

    // Wait until the slow page 3 answer has certainly arrived: page 2 must still be shown.
    await page.waitForTimeout(2500);
    await expect(page.getByText(/^Page 2 of 3/)).toBeVisible();
    await expect(firstRank).toContainText('06');
  });
});
