import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
const pixel7 = devices['Pixel 7'];

/**
 * E2E tests run against the optimized e2e build (`npm run build:e2e`), served by `vite preview`.
 * That build is the production build plus window.__PIRATE_TEST__ (see src/game/testHooks.ts).
 * Every test gets a fresh browser context: clean localStorage, its own service worker.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // WebGL rendering is heavy in headless Chromium; a few workers keep timings stable.
  workers: 2,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile-chromium',
      // The main flows (tagged @main) also run on a touch phone (R118).
      grep: /@main/,
      // Pixel 7 held in landscape (the supported orientation, A21).
      use: {
        ...pixel7,
        viewport: { width: pixel7.viewport.height, height: pixel7.viewport.width },
      },
    },
  ],
  webServer: {
    command: 'npm run build:e2e && npm run preview:e2e',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
