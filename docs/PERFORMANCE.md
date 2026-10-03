# Performance

Requirements R124–R127: measure combat on an optimized build with **60 FPS as the target**, record
frame rate, **p95 frame time** and **entity count** during a **3-minute match**, and check memory after
**5 cycles of start, play and exit**.

## Tools

| Tool                                                             | What it does                                                                                                                                                                                                                                                                                                                                          | How to use it                                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Metrics overlay (`?perf`)                                        | Live FPS, p95 and max frame time (last 240 frames), simulation entities, PixiJS display objects, live PixiJS stages. **Record 3 min** saves a JSON with per-second samples.                                                                                                                                                                           | `npm run build && npm run preview`, open `http://localhost:4173/?perf`, press Play.                                   |
| `npm run perf` ([scripts/perf-run.mjs](../scripts/perf-run.mjs)) | Automated: plays a full 180 s match on the optimized e2e build (1 s spawn interval, so the arena reaches the enemy cap) while recording, then runs N start → play → exit cycles measuring JS heap after a forced GC, canvases, live stages and window/document listeners. Writes `docs/reports/perf/perf-run-<date>.json` and prints Markdown tables. | `npm run build:e2e`, then `npm run perf -- --headed` (options: `--seconds=180 --cycles=5 --width=1280 --height=720`). |
| Chrome DevTools                                                  | Heap snapshots and the Performance panel for manual evidence.                                                                                                                                                                                                                                                                                         | See "Manual memory check" below.                                                                                      |

Notes on the measurement:

- Frame time is the real time between rendered frames (`ticker.elapsedMS`), not PixiJS's capped `deltaMS`.
- The automated match gives the player very high health through the test build's balancing override, so the match lasts the full 3 minutes with the maximum number of enemies. Rules are unchanged.
- Run it **headed** (`--headed`). Headless Chromium renders WebGL in software (SwiftShader), which reports ~11 FPS and does not represent a real GPU.

## Reference run (tooling validation)

Measured with `npm run perf -- --headed` while preparing the delivery. **The author's final measurements go in the next section.**

| Item         | Value                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- |
| Hardware     | Intel Core i7-8565U (4 cores / 8 threads), 11.9 GB RAM, Intel UHD Graphics 620 (+ Radeon 520) |
| OS           | Windows 11 Home                                                                               |
| Browser      | Chromium 153.0.8010.12 (Playwright 1.63 build, headed), device pixel ratio 1                  |
| Resolution   | Viewport 1280×720 on a 1366×768 @ 60 Hz screen                                                |
| Build        | `npm run build:e2e` (production build + test hooks), served by `vite preview`                 |
| Match config | 180 s session, 1 s spawn interval, enemy cap 25, seed 42                                      |

| Metric                                               | Value    |
| ---------------------------------------------------- | -------- |
| Duration recorded                                    | 181.4 s  |
| Frames                                               | 10 884   |
| Average FPS                                          | 60.0     |
| p95 frame time                                       | 17.10 ms |
| Max frame time                                       | 33.30 ms |
| Max entities (player + enemies + projectiles)        | 37       |
| Average entities                                     | 24.6     |
| Max PixiJS display objects (ships + shots + effects) | 49       |

| Moment                 | Heap after GC (MB) | Canvases | Live PixiJS stages (tickers) | Window/document listeners |
| ---------------------- | ------------------ | -------- | ---------------------------- | ------------------------- |
| Menu before any battle | 3.34               | 0        | 0                            | 9                         |
| After cycle 1          | 7.19               | 0        | 0                            | 11                        |
| After cycle 2          | 7.42               | 0        | 0                            | 11                        |
| After cycle 3          | 7.63               | 0        | 0                            | 11                        |
| After cycle 4          | 7.74               | 0        | 0                            | 11                        |
| After cycle 5          | 7.90               | 0        | 0                            | 11                        |

Raw data: [docs/reports/perf/](reports/perf/).

### Memory investigation

- The jump after the first battle (3.3 → 7.2 MB) is expected: the battle code chunk, PixiJS, and the atlases' metadata are loaded once and reused by every later battle (textures are cached on purpose, R64).
- Canvases and live stages always return to 0, so no PixiJS application or ticker survives a cycle.
- Listeners go from 9 to 11 after the first battle and then stay at 11: TanStack Query subscribes once to focus/online events. They do not grow per cycle.
- The heap keeps growing slowly (~0.15 MB per cycle by `Runtime.getHeapUsage`, slowing down). To find out if that is a leak, two heap snapshots were compared (after 3 and after 13 cycles, `HeapProfiler.takeHeapSnapshot`, counting retained objects by constructor): retained objects grew by only **~80 KB in 10 cycles**, mostly strings and promises from the Playwright/CDP code injected into the page. No game objects (`Match`, ships, PixiJS containers or sprites, tickers) accumulate. The rest of the `getHeapUsage` growth is compiled code (JIT), not retained objects.

## Author's measurements (template)

Fill in after running on the reference machine. Use a production build: `npm run build && npm run preview`, open `/?perf`, set Options to 180 s / 1 s, play for 3 minutes and press **Record 3 min** right after the battle starts (or use `npm run perf -- --headed`).

| Item                                                | Value                             |
| --------------------------------------------------- | --------------------------------- |
| Hardware (CPU, RAM, GPU)                            |                                   |
| OS                                                  |                                   |
| Browser and version                                 |                                   |
| Screen resolution, refresh rate, device pixel ratio |                                   |
| Window/viewport size                                |                                   |
| Match config                                        | 180 s session, 1 s spawn interval |

| Metric                 | Value |
| ---------------------- | ----- |
| Average FPS            |       |
| p95 frame time (ms)    |       |
| Max frame time (ms)    |       |
| Max / average entities |       |

| Moment                 | Heap (MB) | Canvases | Live stages | Notes |
| ---------------------- | --------- | -------- | ----------- | ----- |
| Menu before any battle |           |          |             |       |
| After cycle 1          |           |          |             |       |
| After cycle 5          |           |          |             |       |

### Manual memory check (Chrome DevTools)

1. Open `http://localhost:4173/?perf` (production preview), DevTools → **Memory**.
2. Play one battle and return to the menu (warm-up). Click the trash icon (collect garbage) and take **Snapshot 1**.
3. Repeat 5 times: Play → play ~10 s → `P` → Main Menu.
4. Collect garbage and take **Snapshot 2**. Select it and choose **Comparison** with Snapshot 1.
5. Check that `Match`, `GameSession`, `Application`, `Container`, `Sprite`, `Ticker` and `HTMLCanvasElement` show no positive "# Delta". In the overlay, "stages" must read 0 in the menu.
6. Optional: DevTools → **Performance** → record 10 s of combat to look at frame times.

## Limitations observed

- Headless/software rendering is much slower (~11 FPS); always measure with a real GPU.
- The simulation runs at a fixed 60 Hz. On a 120/144 Hz screen rendering runs faster, but movement still advances in 1/60 s steps (positions are not interpolated between steps).
- Very long frames are clamped (250 ms by the clock, 100 ms by PixiJS's `deltaMS`): if the device is extremely slow, the game slows down instead of skipping simulation.
- Audio: 27 WAV files (~6.4 MB) are decoded once; decoding happens in the background after the first click and does not block combat.
- The automated script uses Chromium only; Firefox and Safari were not profiled.
