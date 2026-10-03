# Architecture

This document explains how Pirate Battle is put together and why: the React/PixiJS integration, the simulation loop, collisions, resource management, local persistence, and the ranking/history integration (contracts, cache and pending registrations). It ends with balancing decisions and known limitations.

## 1. Layers

```
                ┌─────────────────────────── React (src/ui, src/app) ───────────────────────────┐
                │ screens, HUD, dialogs, forms, touch buttons, live region, ranking/history tabs │
                └──────▲─────────────────────────────▲───────────────────────────────▲──────────┘
       HUD snapshots   │ (useSyncExternalStore)       │ pause/resume/restart          │ TanStack Query
                ┌──────┴─────────────────────────────┴──────┐                 ┌──────┴─────────────┐
                │ GameSession (src/game/GameSession.ts)      │                 │ src/api            │
                │  PixiJS ticker → fixed-step clock → Match  │                 │ Axios + contracts  │
                │  input → InputState, events → render/audio │                 │ pending queue      │
                └───┬──────────────┬──────────────┬─────────┘                 └──────┬─────────────┘
                    │              │              │                                  │ HTTP
     ┌──────────────▼───┐ ┌────────▼────────┐ ┌───▼────────────┐              ┌──────▼─────────────┐
     │ simulation/      │ │ render/         │ │ input/, audio/ │              │ src/mocks (MSW)    │
     │ pure TS rules    │ │ PixiJS views    │ │ keyboard, touch│              │ handlers, mock DB, │
     │ no React/PixiJS  │ │ read-only       │ │ Web Audio      │              │ scenarios          │
     └──────────────────┘ └─────────────────┘ └────────────────┘              └────────────────────┘
```

| Layer                                    | Responsibility                                                                                                                            | May import                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/game/simulation/`                   | Rules: entities, movement, combat, collisions, AI, spawn, match state, events. Deterministic for a given config, seed and input sequence. | Only itself and `config.ts`. An ESLint rule forbids React, PixiJS, render, UI and audio imports. |
| `src/game/render/`                       | PixiJS: stage, arena, ships, health bars, projectiles, effects. Reads the state every frame and draws it. Never decides a rule.           | simulation types                                                                                 |
| `src/game/input/`                        | Keyboard and touch → `InputState` (forward, turnLeft, turnRight, fireFront, fireLeft, fireRight).                                         | simulation types                                                                                 |
| `src/game/audio/`                        | Web Audio playback driven by simulation events.                                                                                           | simulation types, storage                                                                        |
| `src/game/GameSession.ts`                | Glue: owns the stage, clock, input, renderers, audio and the current `Match`; runs the loop; pause, restart, teardown.                    | all game layers                                                                                  |
| `src/ui/`, `src/app/`                    | React screens, HUD, dialogs, options, routing. Talks to the game only through `GameSession` methods, the HUD store and `session.touch`.   | game (public API), api, storage                                                                  |
| `src/api/`, `src/mocks/`, `src/storage/` | HTTP contracts and client, MSW mock server, `localStorage`.                                                                               | —                                                                                                |

## 2. React ↔ PixiJS integration

- **Mounting.** `GameScreen` loads the atlases (`useGameAssets`), then renders `GameCanvas`, which creates a `GameSession` inside a `<div>`. PixiJS v8 initialization is async (`new Application()` + `await app.init()`), so `GameCanvas` uses a `disposed` flag: if React unmounts before the init finishes (React Strict Mode mounts, unmounts and mounts again in development), the late session is destroyed as soon as it resolves. Only one canvas, one ticker and one set of listeners ever survive. This was checked with a dev panel ("stages / canvases") and in E2E after repeated navigation.
- **No React render per frame (R63).** The continuous state lives in the `Match`. Every frame the session publishes a small `HudSnapshot` (status, pause reason, score, whole seconds left, health, result) to a `HudStore`. The store only notifies React when one of those values changed, and React reads it with `useSyncExternalStore`. In practice React re-renders about once per second (timer) plus when the score or health changes.
- **Typed events.** Each simulation step records `GameEvent`s (`shotFired`, `projectileHit`, `playerDamaged`, `enemyDestroyed`, `scoreChanged`, `matchEnded`…). The session drains them once per frame and hands them to the renderer (effects), audio, camera shake, and any `onEvent` listener.
- **Screen reader output (R104).** `GameAnnouncer` subscribes to the HUD store and turns only meaningful changes into text for a polite live region (score, 60/30/10 s left, low health, pause with its reason, resume, end). The visible HUD is ordinary labelled HTML, but it is not a live region (the timer would be announced every second).
- **The battle screen is lazy-loaded**, so the menu does not download PixiJS. A `ScreenErrorBoundary` shows Retry if that chunk fails to download.

## 3. Simulation loop

- **Fixed timestep with an accumulator** (`FixedStepClock`). Each rendered frame adds its real duration to an accumulator; the match then runs as many whole 1/60 s steps as fit, keeping the remainder for the next frame. 30 FPS and 144 FPS produce exactly the same simulation. Large gaps (tab switch, debugger) are clamped to 250 ms. The clock counts integer steps, so simulated time never drifts by float rounding (a 60 s match ends at exactly 60 000 ms).
- **All gameplay time is simulated time**: movement, cooldowns, projectile lifetime, spawn timer and match timer. Nothing reads `Date.now()` or counts frames.
- **Step order** (`Match.step`): timer → player (move, cooldowns, fire) → enemy AI (steer, move, Shooter fire) → projectiles (move, hit, block, expire) → ship contacts → remove destroyed enemies → spawn → end check. A fixed order plus a seeded RNG (mulberry32) makes matches deterministic; a unit test replays 45 s of scripted input twice and compares the full state and event list.
- **End of match (R32, R33).** When the player's health reaches 0 (`defeated`) or the session time is reached (`time_up`), the match sets `status = 'ended'` and `step()` becomes a no-op: nothing moves, fires, takes damage, spawns or scores any more.
- **Pause (R37–R40).** Pausing stops the clock and drops the accumulated time, so nothing piles up. Keyboard and touch inputs are reset on pause and on resume, so a key held before the pause is not replayed. Automatic pause on `blur`, `visibilitychange` (hidden) and portrait orientation on phones. Only a player action resumes (button, `P` or `Esc`).
- **Restart (R34).** "Play Again" mounts a brand-new battle screen (new session, new `Match` from a fresh config snapshot). `GameSession.restart()` also exists and resets views and pools.
- **Config snapshot (R54).** `createMatchConfig(options)` validates the options, merges them into the balancing config and deep-freezes the result. Options saved during a battle apply to the next one.

## 4. Collisions

- **Shapes.** Ships and projectiles are circles. Islands and rocks are axis-aligned rounded rectangles defined in map data (`arena.ts`) and tuned to the art; a rock is a rounded rectangle whose corner radius is half its size, i.e. a circle. The distance from a point to a rounded rectangle is the distance to the inner "core" rectangle minus the corner radius, which keeps one function for every obstacle.
- **Ships vs islands and arena (R14, R20).** After moving, a ship that overlaps an obstacle is pushed out along the surface normal (not moved back), so it slides along the coast instead of sticking. Then it is clamped to the visible arena.
- **Projectiles (R25–R27).** Each step a projectile moves, then checks in this order: hit a valid target (player shots vs living enemies, enemy shots vs the player) → apply damage once and disappear; hit an obstacle → disappear (`projectileBlocked`); left the arena → disappear; range or lifetime exceeded → disappear (`projectileExpired`). Removal happens right after the first hit, so damage can only be applied once. Projectile speeds (≤ 8.7 px per step) are far below the smallest target radius, so there is no tunnelling.
- **Ship vs ship.** A Chaser touching the player deals contact damage and explodes without scoring. Other overlaps (Shooter–player, enemy–enemy) push ships apart.
- **Health and score** change in a single module (`systems/damage.ts`) that ignores ships already destroyed, so a destroyed enemy stops dealing damage and colliding at once (R29), and several hits in the same step can never score twice (R31).

## 5. Enemy behaviour

- **Chaser:** turns towards the player at its rotation speed (never overshooting) and rams at full speed.
- **Shooter:** approaches until its preferred distance (300 px), then stops and keeps its bow on the player; fires when the player is within attack range (380 px), roughly in front of it (±0.2 rad) and its cooldown is ready.
- **Island avoidance:** both use three "whisker" probes ahead (centre, left, right). If the way is clear they follow the desired heading; otherwise they turn towards the free side, preferring the side closer to the player. A unit test runs four enemies starting behind islands for 10 s and checks they never overlap land.
- **Spawn (R21–R23):** one enemy per configured interval, first at `t = interval`. The first two spawns are one Chaser and one Shooter (both always appear); later ones follow a seeded 60/40 ratio. Candidate points are drawn from the seeded RNG and must be in open water with clearance, at least 450 px from the player, and away from other ships. If no point is found the spawn is skipped. At most 25 enemies at once.

## 6. Rendering and resource management

- **Loading (R64, R102).** Three atlases are loaded once with `Assets.load` and reused by every battle: ships/effects (converted from the provided Starling XML to PixiJS JSON), tiles (rebuilt with 2 px extruded borders to remove seams when the arena is scaled) and the UI atlas (2× version; its `ui` metadata is read for the health bar fill rectangles). A progress bar shows while loading. If a file fails, PixiJS forgets that request, the screen shows an error with **Retry**, and retrying only re-requests what failed. Combat never starts without textures.
- **Letterboxing and DPI (R65).** The arena is always 1920×1088 logical px. A `ResizeObserver` resizes the renderer to its container at the current `devicePixelRatio` and scales a `world` container uniformly, centred, with the leftover space as letterbox bars. The same viewport maths converts pointer coordinates into arena coordinates.
- **Pooling.** Projectile sprites are a growing pool reused every frame (no allocation per shot). Effects (muzzle flash, hit, splash, puff, explosion, sinking wreck) use a pool of sprite records. Health bar fills are cropped textures rebuilt only when health changes.
- **Teardown (R66, R67).** Leaving the battle (or remounting) destroys the session: ticker callback removed, keyboard/touch/blur/visibility listeners removed, sounds stopped, HUD listeners cleared, test/perf registrations removed, then `app.destroy({ removeView: true }, { children: true, texture: false })`. Shared atlas textures are kept on purpose, because the next battle reuses them. Measured: canvases and live stages go back to 0 after every cycle (see [docs/PERFORMANCE.md](docs/PERFORMANCE.md)).
- **Feedback (R41–R44).** Damage states use the provided ship variants (intact → damaged → heavily damaged with flames → wreck), red flash on hits, camera shake when the player is hit (disabled with `prefers-reduced-motion`), and health bars from the UI atlas above every ship.

## 7. Input

- Keyboard uses `KeyboardEvent.code` (physical keys, layout-independent). Several keys can be held at once (R16). Game keys are only captured while a battle is running; keys typed into text fields or already handled by a dialog are ignored.
- Touch buttons use pointer events with pointer capture, one pointer per finger, so steering and firing work together. They write into `TouchInput`; React does not re-render on press.
- Both sources write into one `InputState`. A press shorter than a frame is "latched" until the game reads input once, so quick taps and very short key presses are never lost. Input is read only when at least one simulation step will run.

## 8. Audio

One `AudioContext` for the app, unlocked by the first user gesture. Sounds are decoded once; each plays through its own gain node into a master gain (volume and mute, persisted). `GameAudio` maps events to sounds (cannons, hits, splashes, explosions, score, low health, 30/10 s warnings, pause/resume, end) and plays the ocean ambience plus a sailing loop while moving. A sound that fails to load stays silent; it never blocks the game.

## 9. Local persistence

All keys start with `pirate-battle:` and every read is validated, falling back to defaults on missing or corrupted data.

| Key               | Content                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`         | Session time and spawn interval (R47).                                                                                                              |
| `player`          | Local player id (UUID) and display name.                                                                                                            |
| `last-result`     | The last completed match record; the result screen and the menu read it, so it survives a refresh (R56). Abandoned matches are never written (R57). |
| `pending-matches` | Matches not yet confirmed by the server (R83).                                                                                                      |
| `audio`           | Volume and mute.                                                                                                                                    |
| `mock-db`         | Mock server data: fixtures + confirmed records (R87, R97).                                                                                          |
| `mock-scenario`   | Selected network scenario and seed.                                                                                                                 |

Navigation uses hash routes (`#/menu`, `#/options`, `#/log/ranking`, `#/log/history`, `#/battle`, `#/result`). Opening or reloading `#/battle` redirects to the menu before React renders, which ends any running battle (R55).

## 10. Ranking and match history

### Contracts ([src/api/contracts.ts](src/api/contracts.ts))

```ts
interface MatchRecord {
  matchId: string;        // UUID created once, when the match ends
  playerId: string;
  playerName: string;
  playedAt: string;       // ISO date
  score: number;
  durationMs: number;     // active time, pauses excluded
  endReason: 'time_up' | 'defeated';
  config: { sessionSeconds: number; spawnIntervalSeconds: number; balanceVersion: number };
  configKey: string;      // "v1-120s-3s"
}
interface Page<T> { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number }

GET /api/ranking?page&pageSize&configKey          -> Page<MatchRecord & { rank: number }>
GET /api/players/:playerId/matches?page&pageSize  -> Page<MatchRecord>          (newest first)
PUT /api/matches/:matchId   body: MatchRecord     -> 201 { record, created: true }
                                                    | 200 { record, created: false }
errors: { error: string; message: string } with 400/422/500/503
```

The ranking only compares matches with the same `configKey` (the two options plus a balance version, so a balancing change starts a new ranking). Order: score desc, duration asc, date asc, matchId asc (always unique, so the order is total).

### Client and cache

- **Axios** instance with a timeout (`VITE_API_TIMEOUT_MS`, 4 s). Errors are classified as timeout, network, client (4xx), server (5xx) or canceled.
- **TanStack Query**: one cache entry per `['ranking', configKey, page]` and `['history', playerId, page]`. `placeholderData: keepPreviousData` keeps the previous page visible while the next loads ("Updating…"). `refetchOnMount: 'always'` refreshes a tab every time it is shown (R79). Retries: up to 2 extra attempts with backoff, only for timeouts, network errors and 5xx; a 4xx is never retried.
- **States (R78):** first load → "Loading…"; error without data → reason + **Retry**; error during a background refresh → old rows stay, with a warning and Retry; empty → friendly message.
- **Late responses never overwrite newer data (R80).** Every page has its own cache key, so an old answer for page 1 can only land in page 1's entry, never in the page 2 on screen. Refetches of the same key cancel the previous request through its `AbortSignal`. Pagination uses the requested page (not the placeholder data), so clicking Previous while page 3 is loading goes to page 2. An E2E test uses the `out-of-order` scenario to prove it.
- **Both tabs refresh after a registration**: the mutation invalidates `['ranking']` and `['history']`.

### Registration and the pending queue

1. When a match ends, the app creates the `MatchRecord` (with its `matchId`) once, saves it as the last result, **adds it to the persisted pending queue**, and only then sends it.
2. The registration is a TanStack Query mutation (`PUT`, idempotent). On 201 or 200 the record leaves the queue. On failure it stays as `failed` with the error message.
3. The queue allows one request per match at a time, so repeated clicks or overlapping retries never start a second request. A retry asked for while a request is in flight runs right after it.
4. Queued records are sent on app start, on `online`, when the mock scenario changes, every 15 s while any failed, and with **Retry**.
5. Because the server upserts by `matchId`, a resend after a timeout (`timeout-after-save`) returns the existing record: one history row, one ranking entry (R81, R82).
6. The queue never blocks anything: a new battle can start while a match is pending, and API failures never touch the game or the options (R84, R85).

### MSW

- The same handlers run in the browser (service worker, started before React renders, **also in the published build**) and in Node (`msw/node`) for integration tests (R86, R96). The worker script is in `public/` and is served without caching.
- The mock DB keeps fixtures plus confirmed records in `localStorage`, so both tabs read the same data and confirmed records survive a refresh. **Reset mock data** restores the fixtures.
- Scenarios (success, empty, multiple pages, slow, variable latency, out-of-order, timeout, connection failure, 4xx, 5xx, ranking failure, history failure, timeout after save, unavailable then recovers) are chosen in the Network panel or with `?scenario=&seed=`. Latency and randomness come from a seeded RNG and counters that reset when the scenario changes (R95). "Slow" latency is half the client timeout, so it is slow without timing out in any build. Changing the scenario cancels list requests in flight (with their pending retries) and refetches, and immediately retries pending registrations.

## 11. Testing strategy

- **Unit (Vitest):** pure simulation systems and rules, determinism, input latching, storage validation, router, announcements, mock DB rules, pending queue, and the real Axios client against the real MSW handlers for every scenario.
- **E2E (Playwright):** runs on the production build plus `window.__PIRATE_TEST__` (`--mode e2e`). The hooks can observe state, freeze/step/advance the simulation clock, choose the seed and balancing for the next match, and place an enemy with the normal entity factory. Combat is always driven by real keyboard and touch input. The normal build contains none of this code (`TEST_HOOKS_ENABLED` is a build-time constant). Every test starts from a fresh context with a known scenario and seed, and fails on unexpected console errors.

## 12. Balancing decisions

- 60 Hz simulation; player 170 px/s and 2.4 rad/s turn: crossing the arena takes ~11 s, a full turn ~2.6 s.
- Front cannon: frequent (0.5 s) and long range (520 px). Broadsides: 3 × 20 damage per side, slower (1.5 s) and shorter (380 px), rewarding positioning.
- Chaser (40 HP, fast, 20 contact damage) dies to 2 front shots; Shooter (60 HP, slow) needs 3 front shots or one full broadside volley, and stays at 300 px to keep pressure.
- Enemies spawn at least 450 px away (about 3 s for a Chaser to reach the player), never on land, and at most 25 at once to keep the arena readable and the frame rate stable.
- Default 120 s session and 3 s spawn interval (as in the reference screenshots). Options limits: 60–180 s (brief) and 1–10 s for spawns (below 1 s the arena floods; above 10 s matches feel empty).

## 13. Limitations

- Collision shapes are circles and rounded rectangles: elongated hulls use a circle, and island coastlines are approximated.
- Positions are not interpolated between simulation steps, so on 120 Hz+ screens motion advances in 1/60 s steps.
- AI avoidance is local (whiskers); an enemy can occasionally take a detour around a large island instead of the shortest path.
- Ranking and history are mocked; the "server" data lives in the player's browser storage, so each browser has its own ranking (plus fixtures).
- Visual baselines were recorded on Windows; other systems need `npm run test:e2e:update` once.
- Only Chromium is covered by E2E and profiling.
