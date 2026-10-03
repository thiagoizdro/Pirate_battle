import {
  expect,
  mockRecords,
  NO_SPAWNS,
  openApp,
  pendingCount,
  startBattle,
  state,
  step,
  test,
  TEST_PLAYER,
} from './support';

test.describe('Area 9: abandoning, repeated navigation and touch controls', () => {
  test('leaving a battle abandons it: nothing is saved or registered @main', async ({ page }) => {
    await openApp(page, { balance: NO_SPAWNS });
    await startBattle(page);
    await page.waitForTimeout(500);
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: 'Main Menu' }).click();

    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(page.getByText('Last battle')).toHaveCount(0);
    expect(await pendingCount(page)).toBe(0);
    expect((await mockRecords(page)).filter((r) => r.playerId === TEST_PLAYER.id)).toEqual([]);
    await page.getByRole('button', { name: 'Match History' }).click();
    await expect(page.getByText('No battles registered yet')).toBeVisible();
  });

  test('reloading during a battle ends it and returns to the menu', async ({ page }) => {
    await openApp(page, { balance: NO_SPAWNS });
    await startBattle(page);
    await page.reload();
    await expect(page).toHaveURL(/#\/menu$/);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByText('Last battle')).toHaveCount(0);
  });

  test('repeated navigation never leaves extra canvases behind', async ({ page }) => {
    await openApp(page, { balance: NO_SPAWNS });
    for (let i = 0; i < 3; i++) {
      await startBattle(page);
      await expect(page.locator('canvas')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await expect(page.locator('canvas')).toHaveCount(0);
      await page.getByRole('button', { name: 'Options' }).click();
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await page.getByRole('button', { name: 'Ranking' }).click();
      await page.getByRole('button', { name: 'Main Menu' }).click();
    }
    await startBattle(page);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await page.evaluate(() => window.__PIRATE_TEST__?.hasSession())).toBe(true);
  });

  test('joystick and weapon buttons work with several fingers at once @main', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Touch controls are shown on touch screens');
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
    await expect(page.getByTestId('touch-controls')).toBeVisible();
    const start = await state(page);

    // Real touch events become pointer events: one finger steers, the other fires.
    const centre = async (name: string) => {
      const box = await page.getByRole('button', { name }).boundingBox();
      if (!box) throw new Error(`${name} not visible`);
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const joystick = await page.getByTestId('sailing-joystick').boundingBox();
    if (!joystick) throw new Error('Joystick not visible');
    const forward = {
      x: joystick.x + joystick.width / 2,
      y: joystick.y + joystick.height * 0.2,
    };
    const fire = await centre('Fire front cannon');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: forward.x, y: forward.y, id: 1 },
        { x: fire.x, y: fire.y, id: 2 },
      ],
    });
    await step(page, 1000);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    const after = await state(page);
    expect(after.player.x).toBeGreaterThan(start.player.x + 100);
    expect(after.projectiles.length).toBeGreaterThan(0);

    // A quick tap still counts once.
    await page.getByRole('button', { name: 'Fire left broadside' }).tap();
    await step(page, 20);
    const left = (await state(page)).projectiles.filter((p) => p.dirY < -0.9);
    expect(left).toHaveLength(3);
  });
});
