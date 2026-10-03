import { expect, NO_SPAWNS, openApp, spawnEnemy, startBattle, state, step, test } from './support';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

test.describe('Area 5: Chaser and Shooter behaviour, spawn interval', () => {
  test('a Chaser hunts the player, rams, explodes and gives no point @main', async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
    const start = await state(page);
    await spawnEnemy(page, 'chaser', start.player.x + 340, start.player.y, Math.PI);

    await step(page, 1000);
    const closing = await state(page);
    expect(distance(closing.enemies[0] ?? closing.player, closing.player)).toBeLessThan(340);

    await step(page, 2000);
    const after = await state(page);
    expect(after.player.health).toBe(
      start.config.player.maxHealth - start.config.chaser.contactDamage,
    );
    expect(after.enemies).toHaveLength(0);
    expect(after.score).toBe(0);
  });

  test('a Shooter approaches and fires only within its attack range', async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
    const start = await state(page);
    // From the left: open water between the Shooter and the player.
    await spawnEnemy(page, 'shooter', start.player.x - 740, start.player.y, 0);

    await step(page, 1000);
    const far = await state(page);
    expect(far.projectiles.filter((p) => p.owner === 'enemy')).toHaveLength(0);
    expect(distance(far.enemies[0] ?? far.player, far.player)).toBeGreaterThan(
      start.config.shooter.attackRangePx,
    );

    await step(page, 5000);
    const after = await state(page);
    expect(after.player.health).toBeLessThan(start.config.player.maxHealth);
    const gap = distance(after.enemies[0] ?? after.player, after.player);
    expect(gap).toBeLessThanOrEqual(start.config.shooter.attackRangePx);
    expect(gap).toBeGreaterThan(start.config.shooter.preferredDistancePx - 15);
  });

  test('enemies spawn at every interval, one of each type first, away from the player', async ({
    page,
  }) => {
    await openApp(page, {
      frozen: true,
      gameSeed: 3,
      options: { sessionSeconds: 120, spawnIntervalSeconds: 2 },
    });
    await startBattle(page);
    const { config } = await state(page);

    await step(page, 2000 - config.simulation.stepMs);
    expect((await state(page)).enemies).toHaveLength(0);

    await step(page, config.simulation.stepMs);
    const first = await state(page);
    expect(first.enemies.map((e) => e.kind)).toEqual(['chaser']);
    expect(distance(first.enemies[0] ?? first.player, first.player)).toBeGreaterThanOrEqual(
      config.spawn.minDistanceFromPlayerPx,
    );

    await step(page, 2000);
    const second = await state(page);
    expect(second.enemies.map((e) => e.kind).sort()).toEqual(['chaser', 'shooter']);
  });
});
