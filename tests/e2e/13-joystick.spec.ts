import { expect, NO_SPAWNS, openApp, startBattle, state, step, test } from './support';

test.describe('mobile joystick', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Joystick is a mobile control');
    await openApp(page, { frozen: true, balance: NO_SPAWNS });
    await startBattle(page);
    await expect(page.getByTestId('sailing-joystick')).toBeVisible();
  });

  test('slides continuously forward, left and right, then stops on release @main', async ({
    page,
  }) => {
    const joystick = page.getByTestId('sailing-joystick');
    const box = await joystick.boundingBox();
    if (!box) throw new Error('Joystick not visible');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const radius = box.width * 0.3;
    const cdp = await page.context().newCDPSession(page);
    const start = await state(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y: y - radius, id: 1 }],
    });
    await step(page, 250);
    const forward = await state(page);
    expect(forward.player.x - start.player.x).toBeCloseTo(
      start.config.player.moveSpeedPx * 0.25,
      1,
    );
    expect(forward.player.y).toBe(start.player.y);
    expect(forward.player.rotation).toBe(start.player.rotation);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - radius, y: y - radius, id: 1 }],
    });
    await step(page, 250);
    const left = await state(page);
    expect(left.player.x).toBeGreaterThan(forward.player.x);
    expect(left.player.y).toBeLessThan(forward.player.y);
    expect(left.player.rotation).toBeCloseTo(-start.config.player.rotationSpeedRad * 0.25, 2);

    // Capture continues outside the base and the thumb remains within its travel radius.
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + box.width, y: y - box.height, id: 1 }],
    });
    const displacement = await joystick.evaluate((element) => ({
      x: parseFloat(element.style.getPropertyValue('--stick-x')),
      y: parseFloat(element.style.getPropertyValue('--stick-y')),
    }));
    expect(displacement.x).toBeGreaterThan(0);
    expect(displacement.y).toBeLessThan(0);
    expect(Math.hypot(displacement.x, displacement.y)).toBeCloseTo(radius, 3);
    await step(page, 500);
    const right = await state(page);
    expect(right.player.x).toBeGreaterThan(left.player.x);
    expect(right.player.rotation).toBeCloseTo(start.config.player.rotationSpeedRad * 0.25, 2);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('joystick-stick')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, 0)',
    );
    await step(page, 500);
    const stopped = await state(page);
    expect(stopped.player.x).toBe(right.player.x);
    expect(stopped.player.y).toBe(right.player.y);
    expect(stopped.player.rotation).toBe(right.player.rotation);
  });

  test('ignores another steering finger and fires while moving and rotating @main', async ({
    page,
  }) => {
    const joystick = page.getByTestId('sailing-joystick');
    const box = await joystick.boundingBox();
    const fire = await page.getByRole('button', { name: 'Fire front cannon' }).boundingBox();
    if (!box || !fire) throw new Error('Controls not visible');
    const steering = { x: box.x + box.width * 0.7, y: box.y + box.height * 0.3, id: 1 };
    const intruder = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3, id: 2 };
    const firing = { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 3 };
    const cdp = await page.context().newCDPSession(page);
    await joystick.evaluate((element) => {
      element.addEventListener('pointerdown', (event) => {
        if (event instanceof PointerEvent) element.dataset.latestPointer = String(event.pointerId);
      });
    });
    const start = await state(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [steering] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [steering, intruder, firing],
    });
    await step(page, 250);
    const after = await state(page);
    expect(after.player.x).toBeGreaterThan(start.player.x);
    expect(after.player.y).toBeGreaterThan(start.player.y);
    expect(after.player.rotation).toBeCloseTo(start.config.player.rotationSpeedRad * 0.25, 2);
    expect(after.projectiles.length).toBeGreaterThan(0);

    // CDP touchEnd ends the entire gesture. Dispatch only the ignored pointer's release
    // using its browser-assigned id, to verify that it cannot release the steering pointer.
    await joystick.dispatchEvent('pointerup', {
      pointerId: Number(await joystick.getAttribute('data-latest-pointer')),
      pointerType: 'touch',
    });
    await step(page, 250);
    expect((await state(page)).player.rotation).toBeGreaterThan(after.player.rotation);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    const cancelled = await state(page);
    await step(page, 1000);
    const stopped = await state(page);
    expect(stopped.player).toEqual({
      ...cancelled.player,
      cooldowns: { front: 0, left: 0, right: 0 },
    });
    await expect(page.getByTestId('joystick-stick')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, 0)',
    );
  });

  test('pointer capture loss resets the joystick @main', async ({ page }) => {
    const joystick = page.getByTestId('sailing-joystick');
    const box = await joystick.boundingBox();
    if (!box) throw new Error('Joystick not visible');
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await page.mouse.down();
    // Capture is pending after pointerdown; the next pointer event activates it.
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await step(page, 250);
    const moved = await state(page);
    expect(moved.player.rotation).toBeGreaterThan(0);
    // Use a real mouse pointer to exercise Pointer Events independently of touch.
    await joystick.evaluate((element) => {
      if (!element.hasPointerCapture(1)) throw new Error('Mouse pointer was not captured');
      element.releasePointerCapture(1);
    });
    await page.mouse.move(box.x + box.width, box.y);
    await expect(page.getByTestId('joystick-stick')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, 0)',
    );
    await step(page, 500);
    const stopped = await state(page);
    expect(stopped.player.x).toBe(moved.player.x);
    expect(stopped.player.y).toBe(moved.player.y);
    expect(stopped.player.rotation).toBe(moved.player.rotation);
    await page.mouse.up();
  });

  test('controls fit small and large landscape viewports @main', async ({ page }) => {
    for (const viewport of [
      { width: 568, height: 320 },
      { width: 1024, height: 600 },
    ]) {
      await page.setViewportSize(viewport);
      const joystick = await page.getByTestId('sailing-joystick').boundingBox();
      const weapons = await page.getByRole('button', { name: 'Fire left broadside' }).boundingBox();
      const pause = await page.getByRole('button', { name: /pause/i }).boundingBox();
      if (!joystick || !weapons || !pause) throw new Error('Controls not visible');
      expect(joystick.width).toBeGreaterThanOrEqual(120);
      expect(joystick.x).toBeGreaterThanOrEqual(0);
      expect(joystick.y).toBeGreaterThanOrEqual(pause.y + pause.height);
      expect(joystick.x + joystick.width).toBeLessThan(weapons.x);
      expect(joystick.y + joystick.height).toBeLessThanOrEqual(viewport.height);
      expect(weapons.x + weapons.width).toBeLessThanOrEqual(viewport.width);
    }
  });
});
