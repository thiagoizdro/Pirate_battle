import { expect, openApp, test } from './support';

test.describe('Area 2: asset loading, failure and retry', () => {
  test('shows progress, reports a failed atlas and recovers with Retry @main', async ({
    page,
    context,
  }) => {
    let blockShips = true;
    // The atlas fails only after a delay, so the progress bar is on screen first.
    await context.route('**/assets/sheets/ships.png', async (route) => {
      if (!blockShips) {
        await route.continue();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.abort();
    });

    await openApp(page);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('progressbar', { name: 'Loading the fleet…' })).toBeVisible();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('The game assets could not be loaded.');
    await expect(page.locator('canvas')).toHaveCount(0);

    blockShips = false;
    await alert.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => window.__PIRATE_TEST__?.hasSession() ?? false))
      .toBe(true);
    await expect(page.getByTestId('hud-health')).toHaveText('100 / 100');
  });
});
