import { expect, NO_SPAWNS, openApp, spawnEnemy, startBattle, state, step, test } from './support';

test.describe('Area 4: front and side shots, damage, cooldown and score', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
  });

  test('front cannon fires one projectile and respects its cooldown', async ({ page }) => {
    const cooldown = (await state(page)).config.player.front.cooldownMs;
    await page.keyboard.down('Space');
    await step(page, 20);
    let snapshot = await state(page);
    expect(snapshot.projectiles).toHaveLength(1);
    expect(snapshot.projectiles[0]?.dirX).toBeCloseTo(1);

    // Still held, but the cooldown has not passed: no second shot.
    await step(page, cooldown - 100);
    expect((await state(page)).projectiles).toHaveLength(1);
    await step(page, 120);
    snapshot = await state(page);
    await page.keyboard.up('Space');
    expect(snapshot.projectiles).toHaveLength(2);
  });

  test('broadsides fire three parallel projectiles to each side', async ({ page }) => {
    await page.keyboard.press('KeyQ');
    await step(page, 20);
    const left = (await state(page)).projectiles;
    expect(left).toHaveLength(3);
    for (const p of left) expect(p.dirY).toBeCloseTo(-1);

    await page.keyboard.press('KeyE');
    await step(page, 20);
    const right = (await state(page)).projectiles.filter((p) => p.dirY > 0.9);
    expect(right).toHaveLength(3);
    // Parallel: all three share the same direction.
    expect(new Set(right.map((p) => p.dirY.toFixed(3))).size).toBe(1);
  });

  test('shots damage an enemy, destroy it and score exactly once @main', async ({ page }) => {
    const start = await state(page);
    await spawnEnemy(page, 'shooter', start.player.x + 300, start.player.y, Math.PI);
    const { damage } = start.config.player.front;
    const maxHealth = start.config.shooter.maxHealth;

    await page.keyboard.down('Space');
    await step(page, 700);
    const hit = await state(page);
    expect(hit.enemies[0]?.health).toBe(maxHealth - damage);

    await step(page, 1500);
    const destroyed = await state(page);
    expect(destroyed.enemies).toHaveLength(0);
    expect(destroyed.score).toBe(1);
    await expect(page.getByTestId('hud-score')).toHaveText('1');

    // Keep firing at the empty spot: the score never counts the same enemy twice.
    await step(page, 2000);
    await page.keyboard.up('Space');
    expect((await state(page)).score).toBe(1);
    await expect(page.getByTestId('hud-score')).toHaveText('1');
  });
});
