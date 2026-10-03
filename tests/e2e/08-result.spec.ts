import {
  expect,
  NO_SPAWNS,
  openApp,
  QUICK_OPTIONS,
  spawnEnemy,
  startBattle,
  state,
  step,
  test,
} from './support';

test.describe('Area 8: result display and persistence after refresh', () => {
  test('shows score, time played, end reason and survives a refresh @main', async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS, options: QUICK_OPTIONS });
    await startBattle(page);
    const start = await state(page);
    await spawnEnemy(page, 'chaser', start.player.x + 250, start.player.y, Math.PI);
    await page.keyboard.down('Space');
    await step(page, 1500);
    await page.keyboard.up('Space');
    expect((await state(page)).score).toBe(1);

    const now = await state(page);
    await step(page, now.remainingMs);
    await page.waitForURL(/#\/result/);

    const check = async () => {
      await expect(page.getByTestId('result-score')).toContainText('1');
      await expect(page.getByTestId('result-duration')).toHaveText('01:00');
      await expect(page.getByTestId('result-reason')).toHaveText('Time up');
      await expect(page.getByTestId('registration-status')).toContainText('Registered');
    };
    await check();
    await page.reload();
    await check();

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByText('Last battle: 1 points · Time up')).toBeVisible();
  });
});
