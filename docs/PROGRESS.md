# Progress

| Phase | Scope                                                                            | Status        |
| ----- | -------------------------------------------------------------------------------- | ------------- |
| 0     | Analysis: requirements, conventions, stack and structure proposal                | Done          |
| 1     | Foundation: tooling, config, RNG, clock, Pixi lifecycle, asset loader, arena     | Done          |
| 2     | Core gameplay and simulation unit tests                                          | Not started   |
| 3     | Feedback and polish: health bars, deterioration, effects, sounds, touch controls | Not started   |
| 4     | React UI: screens, HUD, options, result persistence, accessibility, mobile       | Not started   |
| 5     | API: contracts, Axios, TanStack Query, pending queue, MSW scenarios              | Not started   |
| 6     | Playwright: instrumentation, 12 areas, visual baselines                          | Not started   |
| 7     | Delivery: deploy, docs, reports, final checklist                                 | Not started   |

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
