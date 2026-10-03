import { chooseScenario, expect, openApp, test } from './support';

test.describe('Area 10: Ranking and Match History, pagination, loading, empty and error', () => {
  test('ranking paginates through the fixtures @main', async ({ page }) => {
    await openApp(page, { route: 'log/ranking' });
    const table = page.getByTestId('ranking-table');
    await expect(table.locator('tbody tr')).toHaveCount(5);
    await expect(table.locator('tbody tr').first()).toContainText('01');
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await expect(table.locator('tbody tr').first()).toContainText('06');

    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  test('match history paginates (multiple pages scenario)', async ({ page }) => {
    await openApp(page, { route: 'log/history', scenario: 'multiple-pages' });
    await expect(page.getByTestId('history-table').locator('tbody tr')).toHaveCount(5);
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
  });

  test('shows a loading state while a slow request runs', async ({ page }) => {
    await openApp(page, { route: 'log/ranking', scenario: 'slow' });
    await expect(page.getByRole('status').filter({ hasText: 'Loading ranking…' })).toBeVisible();
    await expect(page.getByTestId('ranking-table')).toBeVisible();
  });

  test('shows empty states in both tabs', async ({ page }) => {
    await openApp(page, { route: 'log/ranking', scenario: 'empty' });
    await expect(page.getByText('No battles recorded with this setup yet')).toBeVisible();
    await page.getByRole('tab', { name: 'Match History' }).click();
    await expect(page.getByText('No battles registered yet')).toBeVisible();
  });

  test('a ranking failure shows an error with Retry, and recovers @main', async ({ page }) => {
    let rankingRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/ranking')) rankingRequests++;
    });
    await openApp(page, { route: 'log/ranking', scenario: 'ranking-failure' });
    const alert = page.getByRole('alert').filter({ hasText: 'Could not load the ranking' });
    await expect(alert).toBeVisible();

    const before = rankingRequests;
    await alert.getByRole('button', { name: 'Retry' }).click();
    await expect.poll(() => rankingRequests).toBeGreaterThan(before);

    await chooseScenario(page, 'success');
    await expect(page.getByTestId('ranking-table')).toBeVisible();
  });

  test('a history failure does not affect the ranking', async ({ page }) => {
    await openApp(page, { route: 'log/history', scenario: 'history-failure' });
    await expect(
      page.getByRole('alert').filter({ hasText: 'Could not load the match history' }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Ranking' }).click();
    await expect(page.getByTestId('ranking-table')).toBeVisible();
  });
});
