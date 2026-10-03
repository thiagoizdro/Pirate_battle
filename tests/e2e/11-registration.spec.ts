import {
  expect,
  finishQuietMatch,
  mockRecords,
  NO_SPAWNS,
  openApp,
  pendingCount,
  QUICK_OPTIONS,
  test,
  TEST_PLAYER,
} from './support';

const quiet = { frozen: true, balance: NO_SPAWNS, options: QUICK_OPTIONS };

test.describe('Area 11: registration, both tabs updated, pending recovery after refresh', () => {
  test('a finished match is registered once and appears in both tabs @main', async ({ page }) => {
    await openApp(page, quiet);
    await finishQuietMatch(page);
    await expect(page.getByTestId('registration-status')).toContainText('Registered');

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await page.getByRole('button', { name: 'Ranking' }).click();
    const mine = page.getByTestId('ranking-table').locator('tbody tr', { hasText: 'You' });
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText(TEST_PLAYER.name);

    await page.getByRole('tab', { name: 'Match History' }).click();
    const rows = page.getByTestId('history-table').locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Time up');
    expect((await mockRecords(page)).filter((r) => r.playerId === TEST_PLAYER.id)).toHaveLength(1);
  });

  test('a failed registration is kept and sent after a refresh @main', async ({ page }) => {
    await openApp(page, { ...quiet, scenario: 'connection-failure' });
    await finishQuietMatch(page);
    await expect(page.getByTestId('registration-status')).toContainText('Registration failed', {
      timeout: 20_000,
    });
    expect(await pendingCount(page)).toBe(1);

    // Reload with a working network: the queued match is sent when the app starts.
    await page.goto('/?scenario=success&seed=1#/result');
    await expect(page.getByTestId('registration-status')).toContainText('Registered');
    expect(await pendingCount(page)).toBe(0);
    expect((await mockRecords(page)).filter((r) => r.playerId === TEST_PLAYER.id)).toHaveLength(1);
  });

  test('API unavailable at the end of the match, registered after it recovers', async ({
    page,
  }) => {
    await openApp(page, { ...quiet, scenario: 'unavailable-then-recover' });
    await finishQuietMatch(page);
    const status = page.getByTestId('registration-status');
    await expect(status).toContainText('Registration failed', { timeout: 20_000 });
    await status.getByRole('button', { name: 'Retry' }).click();
    await expect(status).toContainText('Registered');
  });

  test('a new battle can start while a registration is pending', async ({ page }) => {
    await openApp(page, { ...quiet, scenario: 'connection-failure' });
    await finishQuietMatch(page);
    await page.getByRole('button', { name: 'Play Again' }).click();
    await expect
      .poll(() => page.evaluate(() => window.__PIRATE_TEST__?.state()?.status ?? null))
      .toBe('running');
    expect(await pendingCount(page)).toBe(1);
  });
});
