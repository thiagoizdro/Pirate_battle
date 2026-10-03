# Progress

| Phase | Scope                                                                            | Status      |
| ----- | -------------------------------------------------------------------------------- | ----------- |
| 0     | Analysis: requirements, conventions, stack and structure proposal                | Done        |
| 1     | Foundation: tooling, config, RNG, clock, Pixi lifecycle, asset loader, arena     | Done        |
| 2     | Core gameplay and simulation unit tests                                          | Done        |
| 3     | Feedback and polish: health bars, deterioration, effects, sounds, touch controls | Done        |
| 4     | React UI: screens, HUD, options, result persistence, accessibility, mobile       | Not started |
| 5     | API: contracts, Axios, TanStack Query, pending queue, MSW scenarios              | Not started |
| 6     | Playwright: instrumentation, 12 areas, visual baselines                          | Not started |
| 7     | Delivery: deploy, docs, reports, final checklist                                 | Not started |

## Phase 0: Analysis

- Read `challenge/README.md`, inspected atlases, ship sheet, tilesheet, sounds and reference screenshots.
- Created `docs/REQUIREMENTS.md` (R1–R135, rubric, asset findings, assumptions A1–A25) and `CLAUDE.md`.
- Approved: stack, folder structure, API contracts and assumptions A1–A25. UI uses the system font stack.

## Phase 1: Foundation

Done:

- Tooling: Vite 8, React 19, TypeScript 6.0 (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`), ESLint (typescript-eslint strict-type-checked, react-hooks, an import rule that keeps `simulation/` free of React/PixiJS), Prettier, Vitest. Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `sync-assets`.
- `scripts/sync-assets.mjs` copies the used assets to `public/assets`, converts the ship XML atlas to PixiJS JSON, and rebuilds the tile sheet with 2 px extruded edges to remove seams between tiles when the arena is scaled.
- `src/game/config.ts`: all balancing, option limits, validation, `configKey`, frozen per-match snapshot.
- `simulation/`: seeded RNG (mulberry32), fixed-step clock with accumulator, clamping and pause, geometry (rounded-rect collision), arena map and obstacles.
- `render/`: asset loader with progress and retry, `PixiStage` (async init, DPR-aware resize via ResizeObserver, letterboxing, pointer mapping, full destroy), `ArenaView` (water, shallow-water rings, islands, rocks; dev-only collider outlines with `?debugColliders`).
- `ui/`: `GameCanvas` (Strict-Mode-safe mount/unmount), `useGameAssets`, `GameScreen` (progress bar, error with Retry), dev lifecycle panel (live stages and canvases, Remount button).
- 44 unit tests (RNG, clock, config, geometry, viewport, arena).

Verified in Chromium: 1 canvas and 1 stage after 5 remounts and 5 menu/game cycles; blocked `ships.png` shows the error, Retry recovers; production preview has no dev panel and no console messages.

Pending for later phases: simulation loop and entities (Phase 2), final menu UI (Phase 4).

## Phase 2: Core gameplay

Done:

- Simulation (`src/game/simulation/`, no React/PixiJS): `Match` runs one fixed step in a fixed order (player → AI → projectiles → contacts → cleanup → spawn → end check) and freezes after the end. Systems: movement (rotation, thrust, push-out of islands, arena clamp), player weapons (front + two broadsides, separate cooldowns), projectiles (range, lifetime, island block, arena exit, damage once), damage (single place where health and score change), AI (Chaser rams, Shooter approaches/holds/aims/fires, whisker obstacle avoidance), contacts (Chaser explodes on the player without scoring, ships push apart), spawn (interval, one of each type first, seeded ratio, cap, safe points). Typed `GameEvent` union drained after each frame.
- `KeyboardInput` (physical keys via `event.code`, captured only during gameplay, reset on pause/resume/blur), `HudStore` for `useSyncExternalStore` (publishes only on change), `EntityRenderer` (ship views per enemy id, pooled projectile sprites), `GameSession` (ticker loop, pause/auto-pause on blur and hidden tab, restart, full teardown).
- Provisional React HUD, pause dialog and end dialog (Phase 4 restyles them).
- 85 unit tests: movement, weapons, projectiles, scoring, AI, spawn, match end, determinism, restart.

Verified in Chromium: movement, firing, pause with frozen timer, auto-pause on blur, end by defeat with frozen state, Play Again resets health/score/timer; window/document listeners return to 0 after 5 menu/game cycles; no console errors.

Pending: health bars, effects, deterioration, sounds, touch controls (Phase 3); options persistence and final UI (Phase 4).

## Phase 3: Feedback and polish

Done:

- Health bars in PixiJS above the player and every enemy, built from the UI atlas; the fill is cropped from the left using `ui.layout.fill_rect` (green/amber/red for the player, green/red for enemies). The cropped texture is rebuilt only when health changes.
- Ship deterioration: intact → damaged (one flame) → heavily damaged (two flickering flames) → wreck, using the `ship_N` damage variants and `fire_1/2`.
- Pooled effects (`EffectsRenderer`): muzzle flash, hit spark, water splash, puff on islands, explosion flipbook, sinking wreck. Red flash on damaged ships and a short camera shake when the player is hit (skipped with `prefers-reduced-motion`). Effects freeze while paused.
- Audio with the Web Audio API: one shared `AudioContext` unlocked by the Play click, sounds decoded once, master gain for volume/mute (persisted), event-driven `GameAudio` per session (cannons, hits, splashes, explosions, score, low health, time warnings at 30/10 s, pause/resume, end jingles, ocean ambience and a sailing loop while moving). Everything stops on leave.
- Touch controls with the pack's round buttons and icons, multi-touch via pointer capture, merged with the keyboard; quick taps are latched for one step (also fixes very short key presses).
- 99 unit tests (new: input latching, damage-state thresholds).

Verified in Chromium: effects, bars and deterioration visible; all 27 sounds load; volume/mute persist after reload; on a Pixel 7 landscape emulation, holding "forward" and "fire" with two fingers moves and fires at the same time; no console errors.

Pending for Phase 4: final HUD/dialog styling and layout so touch buttons and HUD never cover the arena on small screens, options screen, result persistence, accessibility pass.
