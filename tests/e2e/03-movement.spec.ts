import { distanceToRoundedRect } from '../../src/game/simulation/geometry';
import { expect, hold, NO_SPAWNS, openApp, startBattle, state, step, test } from './support';

test.describe('Area 3: movement, rotation, arena bounds and islands', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
  });

  test('sails forward and rotates both ways @main', async ({ page }) => {
    const start = await state(page);
    const { moveSpeedPx, rotationSpeedRad } = start.config.player;

    await hold(page, 'KeyW', 1000);
    const moved = await state(page);
    expect(moved.player.x - start.player.x).toBeCloseTo(moveSpeedPx, 0);
    expect(moved.player.y).toBeCloseTo(start.player.y, 5);

    await hold(page, 'KeyD', 500);
    expect((await state(page)).player.rotation).toBeCloseTo(rotationSpeedRad * 0.5, 2);
    await hold(page, 'ArrowLeft', 1000);
    expect((await state(page)).player.rotation).toBeCloseTo(-rotationSpeedRad * 0.5, 2);
  });

  test('moves and turns at the same time (simultaneous keys)', async ({ page }) => {
    const start = await state(page);
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    await step(page, 500);
    await page.keyboard.up('KeyD');
    await page.keyboard.up('KeyW');
    const after = await state(page);
    expect(after.player.x).toBeGreaterThan(start.player.x);
    expect(after.player.y).toBeGreaterThan(start.player.y);
  });

  test('cannot leave the visible arena', async ({ page }) => {
    // Turn around (the way to the left edge is open water) and sail until the edge.
    const { config } = await state(page);
    await hold(page, 'KeyD', (Math.PI / config.player.rotationSpeedRad) * 1000);
    await hold(page, 'ArrowUp', 8000);
    const { player } = await state(page);
    expect(player.x).toBe(player.radius);
  });

  test('cannot sail through an island and slides along its coast', async ({ page }) => {
    const start = await state(page);
    // Pick the sand island to the upper right and turn towards its centre.
    const island = start.obstacles.find((o) => o.x > 1400 && o.y < 400 && o.width > 100);
    if (!island) throw new Error('island not found');
    const target = { x: island.x + island.width / 2, y: island.y + island.height / 2 };
    const angle = Math.atan2(target.y - start.player.y, target.x - start.player.x);
    await hold(page, 'KeyA', (Math.abs(angle) / start.config.player.rotationSpeedRad) * 1000);

    // Sail for 6 s with W held, sampling the position every 100 ms inside the page
    // (one call instead of 120 keeps the test fast and its trace small).
    await page.keyboard.down('KeyW');
    const samples = await page.evaluate(() => {
      const positions: { x: number; y: number }[] = [];
      for (let i = 0; i < 60; i++) {
        window.__PIRATE_TEST__?.step(100);
        const player = window.__PIRATE_TEST__?.state()?.player;
        if (player) positions.push({ x: player.x, y: player.y });
      }
      return positions;
    });
    await page.keyboard.up('KeyW');

    expect(samples).toHaveLength(60);
    const gaps = samples.map((position) => distanceToRoundedRect(position, island));
    // Never inside the island...
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(start.player.radius - 0.01);
    // ...and it really reached the coast, instead of stopping far away.
    expect(Math.min(...gaps)).toBeLessThan(start.player.radius + 1);
  });
});
