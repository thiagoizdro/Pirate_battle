import { expect, NO_SPAWNS, openApp, startBattle, state, test } from './support';

test.describe('Area 1: options navigation, validation and persistence', () => {
  test('rejects invalid values accessibly and persists valid ones after refresh @main', async ({
    page,
  }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Options' }).click();
    await expect(page.getByRole('heading', { name: 'Options' })).toBeFocused();

    const session = page.getByLabel('Game session time', { exact: true });
    const spawn = page.getByLabel('Enemy spawn time', { exact: true });
    await session.fill('45');
    await spawn.fill('0');
    await page.getByRole('button', { name: 'Save' }).click();

    // The first invalid field gets focus, is marked invalid and points to its error message.
    await expect(session).toBeFocused();
    await expect(session).toHaveAttribute('aria-invalid', 'true');
    const describedBy = (await session.getAttribute('aria-describedby')) ?? '';
    const errorId = describedBy.split(' ').find((id) => id.endsWith('-error')) ?? '';
    await expect(page.locator(`[id="${errorId}"]`)).toHaveText(
      'Enter a whole number of seconds between 60 and 180.',
    );
    await expect(spawn).toHaveAttribute('aria-invalid', 'true');

    await session.fill('150');
    await spawn.fill('2.5');
    await page.getByLabel('Captain name').fill('Red Sparrow');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Options saved' })).toBeVisible();

    await page.reload();
    await expect(session).toHaveValue('150');
    await expect(spawn).toHaveValue('2.5');
    await expect(page.getByLabel('Captain name')).toHaveValue('Red Sparrow');

    await page.getByRole('button', { name: 'Main Menu' }).click();
    await expect(page.getByText('Captain: Red Sparrow')).toBeVisible();
  });

  test('stepper buttons stay within the limits', async ({ page }) => {
    await openApp(page, { route: 'options' });
    const session = page.getByLabel('Game session time', { exact: true });
    const increase = page.getByRole('button', { name: 'Increase game session time' });
    for (let i = 0; i < 8; i++) await increase.click();
    await expect(session).toHaveValue('180');
    const decrease = page.getByRole('button', { name: 'Decrease enemy spawn time' });
    for (let i = 0; i < 6; i++) await decrease.click();
    await expect(page.getByLabel('Enemy spawn time', { exact: true })).toHaveValue('1');
  });

  test('changes made during a battle apply to the next battle only', async ({ page }) => {
    await openApp(page, {
      frozen: true,
      balance: NO_SPAWNS,
      options: { sessionSeconds: 90, spawnIntervalSeconds: 5 },
    });
    await startBattle(page);
    expect((await state(page)).config.sessionMs).toBe(90_000);

    await page.keyboard.press('KeyP');
    await page.getByRole('dialog').getByRole('button', { name: 'Options' }).click();
    await page.getByLabel('Game session time', { exact: true }).fill('120');
    // Game keys are not captured while typing: "p" (pause key) and "e"/"q" stay in the field.
    const name = page.getByLabel('Captain name');
    await name.fill('');
    await name.pressSequentially('Pepe Quest');
    await expect(name).toHaveValue('Pepe Quest');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Resume' }).click();
    expect((await state(page)).config.sessionMs).toBe(90_000);

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await startBattle(page);
    expect((await state(page)).config.sessionMs).toBe(120_000);
  });
});
