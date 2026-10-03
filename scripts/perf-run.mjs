/* global window, document -- these run inside the page, via Playwright evaluate */
// Automated profiling (R124–R127). Runs against the optimized e2e build served by `vite preview`.
//
//   npm run build:e2e
//   npm run perf -- [--headed] [--seconds=180] [--cycles=5] [--width=1280 --height=720]
//
// 1. Plays a full 3-minute match (180 s session, 1 s spawn interval, so the arena fills up to the
//    enemy cap) while recording FPS, p95 frame time and entity counts every second.
//    The player gets very high health for this run only, so the match lasts the whole 3 minutes
//    (a balancing override through the test build; the rules themselves are unchanged).
// 2. Runs N cycles of start → play → exit and measures the JS heap after a forced GC, plus
//    canvases, live PixiJS stages (one ticker each) and window/document listeners.
//
// Results: docs/reports/perf/perf-run-<date>.json, and a Markdown summary printed to the console.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);
const SECONDS = Number(args.seconds ?? 180);
const CYCLES = Number(args.cycles ?? 5);
const WIDTH = Number(args.width ?? 1280);
const HEIGHT = Number(args.height ?? 720);
const PORT = 4175;
const BASE = `http://localhost:${PORT}`;

function startPreview() {
  const server = spawn(
    'npx',
    ['vite', 'preview', '--outDir', 'dist-e2e', '--port', String(PORT), '--strictPort'],
    { cwd: root, shell: true, stdio: 'ignore' },
  );
  return server;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(BASE);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('vite preview did not start (did you run npm run build:e2e?)');
}

/** Opens the app with the given options and test setup, in a fresh context. */
async function openPage(browser, setup, options) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const page = await context.newPage();
  await page.addInitScript(
    ({ testSetup, gameOptions }) => {
      window.__PIRATE_TEST_SETUP__ = testSetup;
      localStorage.setItem('pirate-battle:options', JSON.stringify(gameOptions));
      localStorage.setItem(
        'pirate-battle:player',
        JSON.stringify({ id: 'perf-player', name: 'Perf Captain' }),
      );
      // Count live window/document listeners to check that cycles do not leak them.
      const live = new Map();
      for (const [name, target] of [
        ['window', window],
        ['document', document],
      ]) {
        const add = target.addEventListener.bind(target);
        const remove = target.removeEventListener.bind(target);
        target.addEventListener = (type, listener, opts) => {
          live.set(listener, `${name}:${type}`);
          add(type, listener, opts);
        };
        target.removeEventListener = (type, listener, opts) => {
          live.delete(listener);
          remove(type, listener, opts);
        };
      }
      window.__liveListeners = () => live.size;
    },
    { testSetup: setup, gameOptions: options },
  );
  await page.goto(`${BASE}/?perf&scenario=success#/menu`);
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  return { context, page };
}

async function startBattle(page) {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => window.__PIRATE_TEST__?.hasSession(), null, { timeout: 60_000 });
}

/** Sails, turns and fires every weapon, so there is constant combat on screen. */
async function playFor(page, seconds) {
  const end = Date.now() + seconds * 1000;
  await page.keyboard.down('KeyW');
  await page.keyboard.down('Space');
  let turnLeft = true;
  while (Date.now() < end) {
    const turnKey = turnLeft ? 'KeyA' : 'KeyD';
    await page.keyboard.down(turnKey);
    await page.waitForTimeout(700);
    await page.keyboard.up(turnKey);
    await page.keyboard.press('KeyQ');
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(1300);
    turnLeft = !turnLeft;
  }
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyW');
}

async function heapAfterGc(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  await cdp.detach();
  return Math.round((usedSize / 1024 / 1024) * 100) / 100;
}

async function lifecycleCounts(page) {
  return page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    liveStages: window.__PIRATE_PERF__?.liveStages() ?? -1,
    listeners: window.__liveListeners?.() ?? -1,
  }));
}

async function recordMatch(browser) {
  console.log(`Recording a ${SECONDS} s match...`);
  const { context, page } = await openPage(
    browser,
    { seed: 42, balance: { player: { maxHealth: 1_000_000 } }, startFrozen: false },
    { sessionSeconds: Math.min(180, SECONDS), spawnIntervalSeconds: 1 },
  );
  await startBattle(page);
  // Record a little longer than the match: the recording closes itself when the battle ends.
  const recording = page.evaluate((ms) => window.__PIRATE_PERF__?.record(ms), (SECONDS + 5) * 1000);
  await playFor(page, SECONDS + 2);
  const result = await recording;
  await context.close();
  return result;
}

async function memoryCycles(browser) {
  console.log(`Running ${CYCLES} start/play/exit cycles...`);
  const { context, page } = await openPage(
    browser,
    { seed: 7, balance: null, startFrozen: false },
    { sessionSeconds: 180, spawnIntervalSeconds: 2 },
  );
  const baseline = { heapMb: await heapAfterGc(page), ...(await lifecycleCounts(page)) };
  const cycles = [];
  for (let i = 1; i <= CYCLES; i++) {
    await startBattle(page);
    await playFor(page, 10);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Main Menu' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
    await page.waitForTimeout(500);
    cycles.push({ cycle: i, heapMb: await heapAfterGc(page), ...(await lifecycleCounts(page)) });
  }
  await context.close();
  return { baseline, cycles };
}

function markdown(match, memory) {
  const lines = [];
  lines.push('| Metric | Value |', '| --- | --- |');
  lines.push(`| Duration recorded | ${(match.durationMs / 1000).toFixed(1)} s |`);
  lines.push(`| Frames | ${match.frames.frames} |`);
  lines.push(`| Average FPS | ${match.frames.avgFps.toFixed(1)} |`);
  lines.push(`| p95 frame time | ${match.frames.p95FrameMs.toFixed(2)} ms |`);
  lines.push(`| Max frame time | ${match.frames.maxFrameMs.toFixed(2)} ms |`);
  lines.push(`| Max entities (player + enemies + projectiles) | ${match.maxEntities} |`);
  lines.push(`| Average entities | ${match.avgEntities} |`);
  lines.push(
    `| Max PixiJS display objects (ships + shots + effects) | ${match.maxDisplayObjects} |`,
  );
  lines.push('', '| Moment | Heap after GC (MB) | Canvases | Live stages | Listeners |');
  lines.push('| --- | --- | --- | --- | --- |');
  const row = (label, m) =>
    `| ${label} | ${m.heapMb} | ${m.canvases} | ${m.liveStages} | ${m.listeners} |`;
  lines.push(row('Menu before any battle', memory.baseline));
  for (const c of memory.cycles) lines.push(row(`After cycle ${c.cycle}`, c));
  return lines.join('\n');
}

const server = startPreview();
try {
  await waitForServer();
  const browser = await chromium.launch({ headless: args.headed !== 'true' });
  const match = await recordMatch(browser);
  const memory = await memoryCycles(browser);
  const version = browser.version();
  await browser.close();

  const report = {
    date: new Date().toISOString(),
    browser: `Chromium ${version}${args.headed === 'true' ? ' (headed)' : ' (headless)'}`,
    viewport: `${WIDTH}x${HEIGHT}`,
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    match,
    memory,
  };
  const dir = join(root, 'docs', 'reports', 'perf');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `perf-run-${report.date.slice(0, 10)}.json`);
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nSaved ${file}\n`);
  console.log(markdown(match, memory));
} finally {
  server.kill();
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F']);
}
