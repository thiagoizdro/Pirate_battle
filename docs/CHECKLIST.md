# Final checklist: requirement → implementation → test

Requirement ids come from [REQUIREMENTS.md](REQUIREMENTS.md). Test columns name the file: `U:` = Vitest in `tests/unit/`, `E:` = Playwright in `tests/e2e/`. "Manual" means verified by hand or by a measurement script, not by an automated assertion.

## 1. Stack

| ID  | Requirement                                                    | Implementation                                                                                                 | Tests                          |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| R1  | React for UI and menus                                         | `src/ui/`, `src/app/App.tsx`                                                                                   | E: all specs                   |
| R2  | TypeScript strict                                              | `tsconfig.app.json`, `tsconfig.node.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | `npm run typecheck`            |
| R3  | PixiJS rendering                                               | `src/game/render/` (PixiJS 8.22, v8 API)                                                                       | E: `visual.spec.ts` (arena)    |
| R4  | TanStack Query                                                 | `src/api/queries.ts`, `src/api/registration.tsx`                                                               | E: `10-log`, `11-registration` |
| R5  | Axios                                                          | `src/api/client.ts`                                                                                            | U: `api.test.ts`               |
| R6  | MSW                                                            | `src/mocks/`                                                                                                   | U: `api.test.ts`; E: `10`–`12` |
| R7  | Playwright E2E + visual                                        | `playwright.config.ts`, `tests/e2e/`                                                                           | `npm run test:e2e`             |
| R8  | Every technology has a real role                               | see ARCHITECTURE.md §1                                                                                         | —                              |
| R9  | Single-player, local gameplay, mocked REST for ranking/history | `src/game/`, `src/mocks/`                                                                                      | E: all                         |

## 2. Gameplay

| ID  | Requirement                                          | Implementation                                                                          | Tests                                                   |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| R10 | Forward and rotation                                 | `simulation/systems/player.ts`, `movement.ts`                                           | U: `movement.test.ts`; E: `03-movement`                 |
| R11 | Front shot, 1 projectile                             | `systems/player.ts` (`fireFront`)                                                       | U: `weapons.test.ts`; E: `04-combat`                    |
| R12 | Broadsides, 3 parallel, left and right               | `systems/player.ts` (`fireBroadside`)                                                   | U: `weapons.test.ts`; E: `04-combat`                    |
| R13 | Health reduced by enemy shots and Chaser impact      | `systems/damage.ts`, `projectiles.ts`, `contacts.ts`                                    | U: `projectiles`, `scoring`; E: `05-enemies`            |
| R14 | Stays in the arena, no passing through islands       | `systems/movement.ts` (`keepInsideWorld`)                                               | U: `movement.test.ts`; E: `03-movement`                 |
| R15 | Keyboard and touch controls                          | `input/KeyboardInput.ts`, `input/TouchInput.ts`, `ui/game/TouchControls.tsx`            | U: `input.test.ts`; E: `03`, `09` (touch)               |
| R16 | Move and fire simultaneously                         | `input/HeldActions.ts`                                                                  | U: `weapons.test.ts`, `input.test.ts`; E: `03`, `09`    |
| R17 | Controls shown in the UI                             | `ui/components/ControlsHelp.tsx` (menu), battle hint in `GameScreen.tsx`, touch buttons | E: `visual.spec.ts` (menu, arena)                       |
| R18 | Chaser chases, damages on contact, explodes          | `systems/ai.ts`, `contacts.ts`                                                          | U: `ai.test.ts`, `scoring.test.ts`; E: `05-enemies`     |
| R19 | Shooter approaches and fires in range                | `systems/ai.ts` (`updateShooter`)                                                       | U: `ai.test.ts`; E: `05-enemies`                        |
| R20 | Enemies move, rotate, take damage, respect islands   | `systems/ai.ts` (whiskers), `movement.ts`                                               | U: `ai.test.ts` (islands)                               |
| R21 | Both types in a default match                        | `systems/spawn.ts` (`nextEnemyKind`)                                                    | U: `spawn.test.ts`; E: `05-enemies`                     |
| R22 | Spawn every configured interval until the end        | `systems/spawn.ts`, `Match.ts`                                                          | U: `spawn.test.ts`, `match.test.ts`; E: `05-enemies`    |
| R23 | Spawn points free and far from the player            | `systems/spawn.ts` (`findSpawnPoint`)                                                   | U: `spawn.test.ts`; E: `05-enemies`                     |
| R24 | Water + island blocking ships and projectiles        | `simulation/arena.ts`, `render/ArenaView.ts`                                            | U: `arena`, `movement`, `projectiles`; E: `03-movement` |
| R25 | Direction, speed, damage, range/lifetime             | `systems/weapons.ts`, `projectiles.ts`                                                  | U: `projectiles.test.ts`                                |
| R26 | Player shots hit enemies, enemy shots hit the player | `systems/projectiles.ts`                                                                | U: `projectiles.test.ts`; E: `04`, `05`                 |
| R27 | Damage once; removed on hit/obstacle/expiry/exit     | `systems/projectiles.ts`                                                                | U: `projectiles.test.ts`, `scoring.test.ts`             |
| R28 | Weapon cooldowns                                     | `systems/player.ts`, `ai.ts`, `weapons.ts`                                              | U: `weapons`, `ai`; E: `04-combat`                      |
| R29 | Destroyed enemies stop damaging/firing/colliding     | `systems/damage.ts`, `Match.ts` (removal)                                               | U: `scoring.test.ts`                                    |
| R30 | Duration 60–180 s                                    | `config.ts` (`OPTION_LIMITS`, `validateOptions`)                                        | U: `config.test.ts`; E: `01-options`                    |
| R31 | 1 point per kill; Chaser self-destruct scores 0      | `systems/damage.ts`                                                                     | U: `scoring.test.ts`; E: `04`, `05`                     |
| R32 | Ends on time or death                                | `Match.ts` (`end`)                                                                      | U: `match.test.ts`; E: `06-match-end`                   |
| R33 | End freezes everything                               | `Match.step` no-op after end                                                            | U: `match.test.ts`; E: `06-match-end`                   |
| R34 | Restart = clean new match                            | `App.tsx` (new battle key), `GameSession.restart`                                       | U: `match.test.ts`; E: `06-match-end`                   |
| R35 | Health above player and enemies                      | `render/HealthBar.ts`, `ShipView.ts`                                                    | E: `visual.spec.ts` (arena)                             |
| R36 | HUD with health, score, time                         | `ui/game/Hud.tsx`                                                                       | E: `04`, `06`, `visual`                                 |
| R37 | Manual pause                                         | `GameSession.pause`, HUD button, `P`/`Esc`                                              | E: `07-pause`                                           |
| R38 | Auto pause on blur / hidden                          | `GameSession` (`blur`, `visibilitychange`), portrait in `GameScreen.tsx`                | E: `07-pause`                                           |
| R39 | Timer, cooldowns, simulation suspended               | `FixedStepClock.pause`, session status                                                  | U: `clock.test.ts`; E: `07-pause`                       |
| R40 | Resume needs an action; no replayed input            | `setGameplayActive` resets input                                                        | U: `clock.test.ts`, `input.test.ts`; E: `07-pause`      |
| R41 | Firing effects                                       | `render/EffectsRenderer.ts` (`muzzleFlash`)                                             | Manual (screenshots in PROGRESS)                        |
| R42 | Destruction explosion                                | `EffectsRenderer` (`explosion`, `wreck`)                                                | Manual                                                  |
| R43 | Visual deterioration by health                       | `render/shipArt.ts`, `ShipView.ts`                                                      | U: `shipArt.test.ts`                                    |
| R44 | Perceptible feedback (hits, damage)                  | flash, shake, hit sparks, splashes, sounds                                              | Manual                                                  |
| R45 | Sounds + volume/mute (brief)                         | `game/audio/`, `ui/game/AudioControls.tsx`, `storage/audioSettings.ts`                  | Manual (persistence verified in Phase 3)                |

## 3. Screens and settings

| ID  | Requirement                                                             | Implementation                                                 | Tests                                   |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| R46 | Main menu: Play, Options, controls, Ranking/History                     | `ui/screens/MainMenu.tsx`                                      | E: `visual.spec.ts`, `09`, `11`         |
| R47 | Options with validation, save, persistence                              | `ui/options/OptionsForm.tsx`, `storage/options.ts`             | U: `config`, `storage`; E: `01-options` |
| R48 | Match screen: arena, HUD, controls, pause                               | `ui/screens/GameScreen.tsx`                                    | E: `03`–`07`, `09`                      |
| R49 | Result: score, time, reason, registration status, Play Again, Main Menu | `ui/screens/ResultScreen.tsx`, `ui/log/RegistrationStatus.tsx` | E: `06`, `08`, `11`, `visual`           |
| R50 | Ranking: rank, player, score, pagination                                | `ui/log/RankingTab.tsx`, `Pagination.tsx`                      | E: `10-log`                             |
| R51 | History: date, score, duration, reason, pagination                      | `ui/log/HistoryTab.tsx`                                        | E: `10-log`, `11`                       |
| R52 | Typed central config                                                    | `src/game/config.ts`                                           | U: `config.test.ts`                     |
| R53 | Spawn interval positive with limits                                     | `config.ts` (1–10 s, step 0.5)                                 | U: `config.test.ts`; E: `01-options`    |
| R54 | Config snapshot per match                                               | `createMatchConfig` (deep-frozen), `GameScreen` snapshot       | U: `config.test.ts`; E: `01-options`    |
| R55 | Reload / leaving ends the match                                         | `router.ts` (`leaveBattleOnLoad`), session teardown            | E: `09-navigation-touch`                |
| R56 | Options and last result persisted                                       | `storage/options.ts`, `storage/lastResult.ts`                  | U: `storage.test.ts`; E: `01`, `08`     |
| R57 | Abandoned matches not registered                                        | only `onMatchEnded` saves/sends                                | E: `09-navigation-touch`                |
| R58 | English UI, code and docs                                               | whole repository                                               | —                                       |
| R59 | Visual identity coherent with assets                                    | atlas-based `Panel`, `GameButton`, HUD                         | E: `visual.spec.ts`                     |

## 4. PixiJS and architecture

| ID  | Requirement                                         | Implementation                                       | Tests                                                 |
| --- | --------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| R60 | PixiJS for game, React for UI                       | `render/` vs `ui/`                                   | —                                                     |
| R61 | Separation rules/render/input/UI                    | folder layers + ESLint import rule for `simulation/` | `npm run lint`                                        |
| R62 | Time-based, frame-rate independent                  | `simulation/clock.ts`                                | U: `clock.test.ts`, `match.test.ts` (determinism)     |
| R63 | No React render per frame                           | `bridge.ts` (`HudStore`), `useHud.ts`                | Manual (HUD store only notifies on change)            |
| R64 | Textures loaded once, failure handled before combat | `render/assets.ts`, `useGameAssets.ts`               | E: `02-assets`                                        |
| R65 | Canvas fits screen/DPR, aspect, input mapping       | `render/PixiStage.ts`, `viewport.ts`                 | U: `viewport.test.ts`; E: mobile project              |
| R66 | Resources released on exit/restart                  | `GameSession.destroy`, `PixiStage.destroy`           | E: `09` (canvases); `npm run perf` (stages/listeners) |
| R67 | Strict Mode safe                                    | `GameCanvas.tsx` (`disposed` flag)                   | Manual (dev panel: 1 stage after remounts)            |
| R68 | Continuous state in the simulation                  | `Match.state`                                        | —                                                     |
| R69 | Own rules, no physics engine                        | `simulation/`                                        | U: all simulation tests                               |
| R70 | ARCHITECTURE.md                                     | [ARCHITECTURE.md](../ARCHITECTURE.md)                | —                                                     |

## 5. Ranking and history

| ID  | Requirement                                                             | Implementation                                              | Tests                                               |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| R71 | Tabs with typed contracts                                               | `api/contracts.ts`, `ui/screens/CaptainsLogScreen.tsx`      | E: `10-log`                                         |
| R72 | Paginated ranking sorted by score                                       | `mocks/db.ts` (`ranking`)                                   | U: `mockDb.test.ts`; E: `10-log`                    |
| R73 | Register + paginated history                                            | `PUT`/`GET` handlers, `api/client.ts`                       | U: `api.test.ts`; E: `11`                           |
| R74 | Record fields                                                           | `MatchRecord`, `app/matchRecord.ts`                         | U: `ui-logic.test.ts`                               |
| R75 | Same-config comparison, deterministic tie-break                         | `compareRanking`, `configKey`                               | U: `mockDb.test.ts`                                 |
| R76 | Fixtures for other players                                              | `mocks/fixtures.ts`                                         | E: `10-log`                                         |
| R77 | Axios + TanStack Query for queries and registration                     | `api/`                                                      | U: `api.test.ts`; E: `10`–`12`                      |
| R78 | Loading, empty, error, background refresh, cache, invalidation, retries | `ui/log/QueryState.tsx`, `queries.ts`                       | E: `10-log`                                         |
| R79 | Both tabs updated after registration and when shown                     | `registration.tsx` invalidation, `refetchOnMount: 'always'` | E: `11-registration`                                |
| R80 | Late responses never overwrite newer data                               | per-page keys, abort, requested-page pagination             | U: `api.test.ts` (out-of-order); E: `12-resilience` |
| R81 | One record and one ranking entry per match                              | client `matchId` + idempotent upsert                        | U: `mockDb`, `api`, `pendingQueue`; E: `11`, `12`   |
| R82 | Resends and repeated clicks recover without duplicating                 | `pendingQueue.tryStartSending`, upsert                      | U: `api.test.ts`; E: `12-resilience`                |
| R83 | Pending records survive failure/refresh; retry                          | `api/pendingQueue.ts`                                       | U: `pendingQueue.test.ts`; E: `11-registration`     |
| R84 | New match while a record is pending                                     | registration never blocks                                   | E: `11-registration`                                |
| R85 | API failures never block game/options                                   | error states only in lists/result                           | E: `10`, `11`                                       |

## 6. MSW

| ID  | Requirement                                             | Implementation                                           | Tests                                            |
| --- | ------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| R86 | Shared contracts/fixtures/handlers for dev, tests, demo | `mocks/handlers.ts` (browser + `msw/node`)               | U: `api.test.ts`                                 |
| R87 | Confirmed records consistent in both tabs               | `mocks/db.ts` (persisted)                                | U: `api`, `mockDb`; E: `11`                      |
| R88 | Success, empty, multiple pages                          | `mocks/network.ts` scenarios                             | U: `api.test.ts`; E: `10-log`                    |
| R89 | Slow, variable latency, out-of-order                    | `network.ts`                                             | U: `api.test.ts`; E: `10`, `12`                  |
| R90 | Timeout, connection failure, 4xx/5xx                    | `network.ts`                                             | U: `api.test.ts`; E: `11`                        |
| R91 | Ranking or history failure                              | `network.ts`                                             | U: `api.test.ts`; E: `10-log`                    |
| R92 | Timeout after save, recovered without duplication       | `save-then-hang` behaviour                               | U: `api.test.ts`; E: `12-resilience`             |
| R93 | Unavailable at the end, registered after recovery       | `unavailable-then-recover`, pending queue                | U: `api.test.ts`; E: `11-registration`           |
| R94 | Select scenarios and reset                              | `ui/dev/NetworkPanel.tsx`, `?scenario=`, `resetMockData` | U: `mockDb.test.ts` (reset); E: `10-log` (panel) |
| R95 | Controlled randomness and latency                       | seeded `MockNetwork`, `?seed=`                           | U: `api.test.ts`                                 |
| R96 | Mocks in the published build                            | `main.tsx` starts the worker in every build              | E: all (production build)                        |
| R97 | Persisted confirmed and pending records                 | `mocks/runtime.ts`, `api/pendingQueue.ts`                | U: `mockDb`, `pendingQueue`; E: `11`             |

## 7. Interface, assets, accessibility

| ID   | Requirement                                                       | Implementation                                                     | Tests                                                                               |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| R98  | Provided assets as visual base                                    | `scripts/sync-assets.mjs`, atlas metadata in `uiAtlas.ts`          | E: `visual.spec.ts`                                                                 |
| R99  | Asset sources and licenses                                        | [CREDITS.md](CREDITS.md)                                           | —                                                                                   |
| R100 | Desktop + mobile, usable touch, no clipping                       | responsive CSS, `TouchControls.tsx`                                | E: mobile project, `visual.spec.ts`                                                 |
| R101 | Defined orientation, adapts to resize                             | landscape + rotate message (`GameScreen`), `ResizeObserver`        | Manual (Phase 4 screenshots)                                                        |
| R102 | Visible loading progress                                          | progress bar in `GameScreen.tsx`                                   | E: `02-assets`                                                                      |
| R103 | Keyboard nav, focus, dialogs, labels, contrast, accessible errors | `Dialog.tsx`, `OptionsForm.tsx`, global focus styles, tabs pattern | E: `01-options`, `07-pause`                                                         |
| R104 | Semantic score/time/state, no per-frame announcements             | `Hud.tsx`, `GameAnnouncer.tsx`, `announcements.ts`                 | U: `ui-logic.test.ts`; E: `07-pause`                                                |
| R105 | Game keys only during gameplay                                    | `KeyboardInput` (`gameplayActive`, editable targets)               | E: `01-options` (typing "p", "e", "q" in the pause options does not resume or fire) |

## 8. Playwright

| ID   | Requirement                                                | Tests                                                       |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| R106 | Area 1 options                                             | `01-options.spec.ts`                                        |
| R107 | Area 2 assets                                              | `02-assets.spec.ts`                                         |
| R108 | Area 3 movement, rotation, bounds, islands                 | `03-movement.spec.ts`                                       |
| R109 | Area 4 shots, damage, cooldown, score                      | `04-combat.spec.ts`                                         |
| R110 | Area 5 Chaser, Shooter, spawn interval                     | `05-enemies.spec.ts`                                        |
| R111 | Area 6 end by time/death, freeze, restart                  | `06-match-end.spec.ts`                                      |
| R112 | Area 7 pause, focus loss, resume                           | `07-pause.spec.ts`                                          |
| R113 | Area 8 result and refresh                                  | `08-result.spec.ts`                                         |
| R114 | Area 9 abandon, navigation, touch                          | `09-navigation-touch.spec.ts`                               |
| R115 | Area 10 ranking/history, pagination, loading, empty, error | `10-log.spec.ts`                                            |
| R116 | Area 11 registration, both tabs, pending after refresh     | `11-registration.spec.ts`                                   |
| R117 | Area 12 resend after timeout, late responses               | `12-resilience.spec.ts`                                     |
| R118 | Chromium desktop and mobile                                | `playwright.config.ts` projects                             |
| R119 | Visual regression with versioned baselines                 | `visual.spec.ts` + `visual.spec.ts-snapshots/`              |
| R120 | Seeded scenarios and simulation clock control              | `src/game/testHooks.ts`, `tests/e2e/support.ts`             |
| R121 | Combat via real controls                                   | `03`, `04`, `05`, `09` (keyboard and touch only)            |
| R122 | Isolated tests                                             | fresh context per test, `openApp`                           |
| R123 | HTML report and failure traces                             | `playwright.config.ts` (`html`, `trace: retain-on-failure`) |

## 9. Performance and delivery

| ID   | Requirement                                                             | Implementation / evidence                                                             |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| R124 | Optimized build, 60 FPS target, documented environment                  | [PERFORMANCE.md](PERFORMANCE.md) (reference run: 60.0 FPS)                            |
| R125 | FPS, p95 frame time, entities over 3 minutes                            | `?perf` overlay, `npm run perf`, `docs/reports/perf/`                                 |
| R126 | Memory after 5 cycles                                                   | `npm run perf` + heap snapshot comparison in PERFORMANCE.md                           |
| R127 | Profiling evidence with environment and limitations                     | PERFORMANCE.md                                                                        |
| R128 | No unhandled console errors                                             | E: every test fails on unexpected console errors (`support.ts`)                       |
| R129 | Source, lockfile, assets, mocks, fixtures, tests                        | repository                                                                            |
| R130 | Public deploy                                                           | `vercel.json` ready. **Pending: the author connects the GitHub repository to Vercel** |
| R131 | README with setup, env, controls, config, scenarios, commands, failures | [README.md](../README.md)                                                             |
| R132 | ARCHITECTURE.md content                                                 | [ARCHITECTURE.md](../ARCHITECTURE.md)                                                 |
| R133 | Test and profiling reports                                              | [docs/reports/](reports/)                                                             |
| R134 | Runs from a clean checkout                                              | verified in Phase 7 (`git clone` → `npm ci` → lint, typecheck, build, unit, e2e)      |
| R135 | Time estimate before starting                                           | **Author** (sent to Jungle Gaming outside the repository)                             |
