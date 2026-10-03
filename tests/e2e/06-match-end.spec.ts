import {
  expect,
  hold,
  NO_SPAWNS,
  openApp,
  QUICK_OPTIONS,
  spawnEnemy,
  startBattle,
  state,
  step,
  stepAndRead,
  test,
} from './support';

test.describe('Area 6: end by time and by death, frozen simulation, clean restart', () => {
  test('ends when time runs out, freezes, and Play Again starts a clean match @main', async ({
    page,
  }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS, options: QUICK_OPTIONS });
    await startBattle(page);
    // Make the match "dirty" first: move and fire.
    await page.keyboard.down('Space');
    await hold(page, 'KeyW', 1000);
    await page.keyboard.up('Space');

    const { config } = await state(page);
    await step(page, config.sessionMs - 1000 - 1000);
    expect((await state(page)).status).toBe('running');
    // End the match and keep pushing time with W held, in one synchronous call: the app
    // switches to the result screen shortly after the end.
    await page.keyboard.down('KeyW');
    const { ended, later } = await page.evaluate(() => {
      const hooks = window.__PIRATE_TEST__;
      if (!hooks) throw new Error('no test hooks');
      hooks.step(1000);
      const atEnd = hooks.state();
      hooks.step(1000);
      return { ended: atEnd, later: hooks.state() };
    });
    await page.keyboard.up('KeyW');
    expect(ended?.status).toBe('ended');
    expect(ended?.endReason).toBe('time_up');
    expect(ended?.elapsedMs).toBe(config.sessionMs);
    // Nothing moves after the end, even with keys held and time passing.
    expect(later?.player).toEqual(ended?.player);
    expect(later?.elapsedMs).toBe(ended?.elapsedMs);

    await page.waitForURL(/#\/result/);
    await expect(page.getByRole('heading', { name: 'Battle complete' })).toBeVisible();
    await expect(page.getByTestId('result-duration')).toHaveText('01:00');
    await expect(page.getByTestId('result-reason')).toHaveText('Time up');

    await page.getByRole('button', { name: 'Play Again' }).click();
    await expect
      .poll(() => page.evaluate(() => window.__PIRATE_TEST__?.state()?.status ?? null))
      .toBe('running');
    const fresh = await state(page);
    expect(fresh.elapsedMs).toBe(0);
    expect(fresh.score).toBe(0);
    expect(fresh.player.health).toBe(fresh.player.maxHealth);
    expect(fresh.enemies).toEqual([]);
    expect(fresh.projectiles).toEqual([]);
    expect(fresh.display.ships).toBe(1);
  });

  test('ends when the player is destroyed', async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
    const { player } = await state(page);
    // Five Chasers around the player: 5 x 20 contact damage = 100.
    const offsets = [
      [90, 0],
      [-90, 0],
      [0, 90],
      [0, -90],
      [70, 70],
    ] as const;
    for (const [dx, dy] of offsets) {
      await spawnEnemy(page, 'chaser', player.x + dx, player.y + dy, Math.atan2(-dy, -dx));
    }
    const ended = await stepAndRead(page, 2000);
    expect(ended.player.health).toBe(0);
    expect(ended.status).toBe('ended');
    expect(ended.endReason).toBe('defeated');
    await page.waitForURL(/#\/result/);
    await expect(page.getByRole('heading', { name: 'Ship sunk' })).toBeVisible();
    await expect(page.getByTestId('result-reason')).toHaveText('Defeated');
  });
});
