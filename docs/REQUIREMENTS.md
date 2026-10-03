# Requirements

Source of truth: [`challenge/README.md`](../challenge/README.md) (written in Portuguese). Every requirement below cites the README section it comes from (`§n`). Items tagged **(brief)** come from the project brief and go beyond the README; they never override it.

Status legend for the final checklist (Phase 7): each `Rn` will be mapped to its implementation and its test.

## 1. Stack (§1)

| ID  | Requirement                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------- |
| R1  | React for interface and menus.                                                                                                  |
| R2  | TypeScript in strict mode.                                                                                                      |
| R3  | PixiJS for game rendering.                                                                                                      |
| R4  | TanStack Query for remote state of ranking and history.                                                                         |
| R5  | Axios as HTTP client for ranking and history.                                                                                   |
| R6  | MSW to mock the ranking and history APIs.                                                                                       |
| R7  | Playwright for E2E and visual regression tests.                                                                                 |
| R8  | Every listed technology must take an effective part in the solution.                                                            |
| R9  | Single-player, fully in the browser. Gameplay and settings are local; only ranking and history go through the mocked REST APIs. |

## 2. Gameplay (§2)

### Player

| ID  | Requirement                                                                                    |
| --- | ---------------------------------------------------------------------------------------------- |
| R10 | Moves forward and rotates both ways.                                                           |
| R11 | Front shot with one projectile.                                                                |
| R12 | Side shot with three parallel projectiles, with separate commands for the left and right side. |
| R13 | Limited health, reduced by enemy projectiles and by Chaser impact.                             |
| R14 | Movement restricted to the visible arena; cannot pass through islands.                         |
| R15 | Keyboard controls and touch controls for movement, rotation and attacks.                       |
| R16 | Moving and shooting simultaneously is possible.                                                |
| R17 | Controls are shown in the interface.                                                           |

### Enemies

| ID  | Requirement                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------- |
| R18 | **Chaser**: chases the player, damages the player on collision and explodes on impact.                   |
| R19 | **Shooter**: approaches the player and fires when within attack range.                                   |
| R20 | Both types move forward, rotate, take damage and respect island collisions.                              |
| R21 | Both types appear during a default match.                                                                |
| R22 | Enemies spawn every configured interval until the match ends.                                            |
| R23 | Spawn points are free of obstacles and far enough from the player to avoid unavoidable immediate damage. |

### Arena, collisions and combat

| ID  | Requirement                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------- |
| R24 | Arena contains water and at least one island that blocks ships and projectiles.                                                  |
| R25 | Projectiles respect direction, speed, damage and range or lifetime.                                                              |
| R26 | Player shots hit enemies; enemy shots hit the player.                                                                            |
| R27 | Each projectile applies damage exactly once and is removed on hitting a target or obstacle, on expiry or when leaving the arena. |
| R28 | Each weapon respects its own fire interval (cooldown).                                                                           |
| R29 | Destroyed enemies stop dealing damage, firing and taking part in collisions.                                                     |

### Match rules

| ID  | Requirement                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------- |
| R30 | Configurable duration between 60 and 180 seconds of active play.                                                 |
| R31 | Each enemy destroyed by player attacks is worth 1 point. A Chaser self-destructing on the player gives no point. |
| R32 | The match ends when time runs out or player health reaches zero.                                                 |
| R33 | Ending stops movement, attacks, damage, spawns and scoring.                                                      |
| R34 | Restart creates a new match with health, score, timer and entities restored.                                     |
| R35 | Health shown above the player ship and above every enemy.                                                        |
| R36 | HUD shows score and remaining time (and health).                                                                 |
| R37 | Manual pause.                                                                                                    |
| R38 | Automatic pause on focus loss or hidden tab.                                                                     |
| R39 | While paused, timer, cooldowns and simulation are suspended.                                                     |
| R40 | Resuming requires a player action and does not accumulate movement or shots from the paused period.              |

### Animation and feedback

| ID  | Requirement                                                                             |
| --- | --------------------------------------------------------------------------------------- |
| R41 | Firing effects.                                                                         |
| R42 | Destruction explosion.                                                                  |
| R43 | Visual deterioration of ships according to remaining health.                            |
| R44 | Attacks, impacts and damage have perceptible feedback while keeping the arena readable. |
| R45 | **(brief)** Sounds from `assets/sounds/` with a volume/mute option.                     |

## 3. Screens and settings (§3)

| ID  | Requirement                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R46 | Main menu: **Play** and **Options** actions, control instructions, **Ranking** and **Match History** tabs.                                                                                                                                                     |
| R47 | Options: **Game session time** and **Enemy spawn time**, with validation, saving and persistence after refresh.                                                                                                                                                |
| R48 | Match screen: PixiJS arena, HUD, controls and pause.                                                                                                                                                                                                           |
| R49 | Result screen: total score, time played, end reason, match registration status, **Play Again** and **Main Menu** actions.                                                                                                                                      |
| R50 | Ranking: rank position, player identification, score and pagination.                                                                                                                                                                                           |
| R51 | Match History: player history with date, score, duration, end reason and pagination.                                                                                                                                                                           |
| R52 | Gameplay parameters centralized in a typed, adjustable config: duration, spawn interval and distribution, health, move and rotation speeds, damage, projectile range/speed/lifetime, cooldowns, Shooter range. Balancing changes need no system logic changes. |
| R53 | Spawn interval must be positive with documented limits.                                                                                                                                                                                                        |
| R54 | Each match uses a snapshot of the config at start; later changes apply to new matches only.                                                                                                                                                                    |
| R55 | Reloading the page or leaving the combat screen ends the running match.                                                                                                                                                                                        |
| R56 | Player options and the last completed match result are persisted locally.                                                                                                                                                                                      |
| R57 | An abandoned match is not registered in ranking or history.                                                                                                                                                                                                    |
| R58 | UI, code identifiers and documentation in English.                                                                                                                                                                                                             |
| R59 | Menu visual identity coherent with the game assets.                                                                                                                                                                                                            |

## 4. PixiJS and architecture (§4)

| ID  | Requirement                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| R60 | PixiJS renders arena, ships, projectiles, effects and ship indicators; React renders menus, forms, panels and dialogs. |
| R61 | Separation between game rules, rendering, input and UI state.                                                          |
| R62 | Time-based simulation: movement, damage and spawns independent of frame rate.                                          |
| R63 | UI synchronized with the game without React renders every frame.                                                       |
| R64 | Textures loaded and reused, with failure handling before combat starts.                                                |
| R65 | Canvas fits the screen and pixel density, preserving aspect ratio, input coordinates and arena bounds.                 |
| R66 | Listeners, ticker, timers, entities and resources released on exit or restart.                                         |
| R67 | Correct init and teardown under React Strict Mode.                                                                     |
| R68 | Continuous combat state lives in the simulation.                                                                       |
| R69 | Movement, combat, collision and enemy behaviour rules implemented by the candidate (no physics engine).                |
| R70 | `ARCHITECTURE.md` describes the main decisions.                                                                        |

## 5. Ranking and match history (§5)

| ID  | Requirement                                                                                       |
| --- | ------------------------------------------------------------------------------------------------- |
| R71 | Ranking and Match History tabs in the main menu, with typed contracts.                            |
| R72 | Ranking: paginated query sorted by score.                                                         |
| R73 | History: register a completed match and query the player's paginated history.                     |
| R74 | Each record has match id, player id, date, score, effective duration, end reason and config used. |
| R75 | Ranking only compares matches with the same config, with a deterministic tie-break.               |
| R76 | Other players are fixtures.                                                                       |
| R77 | Axios for HTTP; TanStack Query for queries and match registration.                                |
| R78 | Handles loading, empty, error, background refresh, cache, invalidation and retries.               |
| R79 | Both tabs update after registering a match and when shown again.                                  |
| R80 | Late responses never overwrite newer data.                                                        |
| R81 | One completed match produces exactly one history record and one ranking entry.                    |
| R82 | Resends and repeated clicks recover the existing record without duplication.                      |
| R83 | Pending records survive failures and refresh; the player can retry.                               |
| R84 | The player can start another match while a record is pending.                                     |
| R85 | API failures never block the game, the settings or interrupt combat.                              |

## 6. MSW (§6)

| ID  | Requirement                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------- |
| R86 | Mocks at the network layer, sharing contracts, fixtures and handlers between development, tests and demo. |
| R87 | Confirmed records appear in later queries, consistent across both tabs.                                   |
| R88 | Scenarios: success, empty lists, multiple pages.                                                          |
| R89 | Scenarios: slowness, variable latency, out-of-order responses.                                            |
| R90 | Scenarios: timeout, connection failure, HTTP 4xx/5xx.                                                     |
| R91 | Scenarios: ranking fetch failure, history fetch failure.                                                  |
| R92 | Scenario: timeout after registering a match, recovered without duplication.                               |
| R93 | Scenario: API unavailable at match end, registered after recovery.                                        |
| R94 | A way to select scenarios and to restore the initial state.                                               |
| R95 | Randomness and latency controlled in tests.                                                               |
| R96 | Mocks work in the published build.                                                                        |
| R97 | Local persistence keeps confirmed records and pending submissions after refresh.                          |

## 7. Interface, assets and accessibility (§7)

| ID   | Requirement                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| R98  | Use the provided assets as visual base (atlas `ui` metadata in logical 1× units).                                               |
| R99  | Include sources and licenses of assets and any added resources.                                                                 |
| R100 | Works on desktop and mobile, with usable touch controls and no clipping of arena or HUD.                                        |
| R101 | Supported mobile orientation is defined; layout adapts to resize without changing match rules.                                  |
| R102 | Visible progress or loading state while match assets load.                                                                      |
| R103 | Keyboard navigation in menus, visible focus, focus management in dialogs, labels, adequate contrast, accessible error messages. |
| R104 | Score, time and match state also exposed in semantic UI, without per-frame announcements.                                       |
| R105 | Game keys captured only while gameplay is active.                                                                               |

## 8. Playwright (§8)

| ID   | Requirement                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R106 | Area 1: navigation, validation and persistence of options.                                                                                                  |
| R107 | Area 2: asset loading, failures and retry.                                                                                                                  |
| R108 | Area 3: match start, movement, rotation, arena bounds, island collision.                                                                                    |
| R109 | Area 4: front and side shots, damage, cooldown, score without duplication.                                                                                  |
| R110 | Area 5: Chaser and Shooter behaviour, spawn interval.                                                                                                       |
| R111 | Area 6: end by time and by death, simulation halt, clean restart.                                                                                           |
| R112 | Area 7: pause, focus loss, resume without improper timer advance.                                                                                           |
| R113 | Area 8: result display and persistence after refresh.                                                                                                       |
| R114 | Area 9: match abandonment, repeated navigation between screens, touch controls.                                                                             |
| R115 | Area 10: Ranking and Match History queries and pagination, with loading, empty and error.                                                                   |
| R116 | Area 11: match registration, both tabs updated, pending recovery after refresh.                                                                             |
| R117 | Area 12: resend after timeout without duplication; late responses don't overwrite recent data.                                                              |
| R118 | Main flows run on Chromium desktop and mobile.                                                                                                              |
| R119 | Visual regression of menu, arena in a stable state and result screen, with versioned baselines.                                                             |
| R120 | Seeded scenarios and simulation-time control; instrumentation may observe state and control the clock, keeping real rules, input, collisions and rendering. |
| R121 | Combat tests trigger game controls and verify their effects.                                                                                                |
| R122 | Each test starts from an isolated state.                                                                                                                    |
| R123 | HTML report and traces of failures.                                                                                                                         |

## 9. Performance (§9)

| ID   | Requirement                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------- |
| R124 | Combat performance measured on an optimized build, target 60 FPS on a documented reference environment. |
| R125 | Record frame rate, p95 frame time and entity count over a 3-minute match.                               |
| R126 | Memory checked after 5 cycles of start, play and exit; investigate continuous growth.                   |
| R127 | Profiling evidence with hardware, browser, resolution, match config and observed limitations.           |

## 10. Delivery (§10, §11)

| ID   | Requirement                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R128 | Unhandled-error-free console during all expected flows.                                                                                                                                                                  |
| R129 | Repository with source, lockfile, assets, mocks, fixtures and tests.                                                                                                                                                     |
| R130 | Mandatory public deploy (Vercel recommended); deployed version matches the code, runs the mocks, works on open and reload.                                                                                               |
| R131 | `README.md`: setup, env vars, controls, gameplay config, scenario selection and reset, commands, steps to reproduce failures. Scripts for dev, build, preview, lint, typecheck and Playwright.                           |
| R132 | `ARCHITECTURE.md`: React/PixiJS integration, simulation loop, collisions, resource management, local persistence, ranking/history integration (contracts, cache, pending recovery), limitations and balancing decisions. |
| R133 | Test and profiling reports included.                                                                                                                                                                                     |
| R134 | Runs from a clean checkout without private services.                                                                                                                                                                     |
| R135 | Time estimate given before starting (§ intro).                                                                                                                                                                           |

## Scoring rubric (§10)

| Criterion                                             |  Points |
| ----------------------------------------------------- | ------: |
| Gameplay, rules, collisions and enemy behaviour       |      35 |
| PixiJS, architecture and resource lifecycle           |      20 |
| Interface, feedback, responsiveness and accessibility |      15 |
| TanStack Query, Axios and ranking/history consistency |      10 |
| MSW and failure scenarios                             |       5 |
| Playwright tests                                      |      10 |
| Performance and documentation                         |       5 |
| **Total**                                             | **100** |

Also evaluated: complete match flow, clear responsibilities, code quality, reproducible execution, and a console without unhandled errors.

## Asset findings

- Ships: `ship_N.png` = 6 colours × 4 states. Colour = `(N-1) % 6` (white, black, red, green, blue, yellow); state = `floor((N-1) / 6)`: 0 intact, 1 damaged, 2 heavily damaged, 3 wrecked (grey). These drive the deterioration (R43). Hulls and sails also come in damage variants in `ship_parts/`.
- Ship sprites point **down** (bow at +y). The renderer must add a rotation offset.
- `ships_miscellaneous_sheet_retina.*` is **not** a 2× sheet: same 1024×512 size and almost the same coordinates as the default one. We use the default ship sheet only.
- `tiles_sheet_retina.png` (2048×768) and `ui_sheet_retina.png` (2048×2048) are real 2× versions. Tiles are 64×64 logical, 16×6 grid, no margin and no frame data file, so we generate the frame data ourselves.
- `ui_sheet*.json` is a TexturePacker-style atlas plus `ui` metadata: 9-slice `borders` for the panel, `label_rect` for buttons, `fill_rect` + `clip_axis` for health bars, `icon_center`/`icon_render_size` for round buttons.
- Effects: `explosion_1..3` and `fire_1..2`, used for explosions, muzzle flash and burning ships.
- Sounds: 27 WAV files (cannon, hits, explosions, UI, loops, warnings).
- Reference screenshots: the player in `sample.png` has no health bar above the ship, but §2 requires it. We follow the README.

## Ambiguities and assumptions

All assumptions below were approved on 2026-10-02 (end of Phase 0). Additional decisions from that review:

- UI font: system font stack (no extra font library).
- The project is versioned with git from Phase 0 onward.

| #   | Topic                                | Assumption                                                                                                                                                                                                                                    |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Default values                       | Session 120 s and spawn 3 s (as in `sample_options.png`). Player health 100 (as in `sample.png`).                                                                                                                                             |
| A2  | Session time input                   | Integer seconds, 60–180. Stepper buttons change by 10 s; direct typing is also allowed and validated.                                                                                                                                         |
| A3  | Spawn interval limits                | 1–10 s, step 0.5 s. Below 1 s floods the arena; above 10 s makes matches empty.                                                                                                                                                               |
| A4  | Save in Options                      | The sample shows only steppers + Main Menu. We add an explicit **Save** button (needed for "validation and saving"); leaving with unsaved changes discards them.                                                                              |
| A5  | Options from the pause dialog        | The sample pause dialog has an Options button. We include it; changes apply to the next match only (R54).                                                                                                                                     |
| A6  | "Time played" / "effective duration" | Active simulated time, excluding pauses.                                                                                                                                                                                                      |
| A7  | End reasons                          | `time_up` (label "Time up") and `defeated` (label "Defeated"). Abandoned matches have no record.                                                                                                                                              |
| A8  | Ranking granularity                  | One ranking entry per match (README: "a single ranking entry" per completed match), so a player may appear more than once.                                                                                                                    |
| A9  | Config identity (`configKey`)        | `v{balanceVersion}-{sessionSeconds}s-{spawnSeconds}s`, e.g. `v1-120s-3s`. The ranking shows the config of the current Options by default.                                                                                                     |
| A10 | Tie-break                            | Score desc, duration asc, date asc, matchId asc.                                                                                                                                                                                              |
| A11 | Player identity                      | Local persistent UUID + editable display name (default "Captain" + short suffix), stored in localStorage. The name field lives in Options.                                                                                                    |
| A12 | Ship-to-ship collisions              | Ships push each other apart (no damage), except Chaser→player, which damages the player and destroys the Chaser (no point).                                                                                                                   |
| A13 | Friendly fire                        | Enemy shots pass through other enemies.                                                                                                                                                                                                       |
| A14 | Projectile limit                     | Both max range and max lifetime; whichever comes first removes it.                                                                                                                                                                            |
| A15 | Spawn distribution                   | Seeded weighted random (e.g. 60% Chaser / 40% Shooter), and the first two spawns are one of each type, so both always appear (R21).                                                                                                           |
| A16 | First spawn                          | At `t = spawnInterval` (not at t = 0), so the player gets a moment to orient.                                                                                                                                                                 |
| A17 | Enemy cap                            | Max simultaneous enemies (e.g. 25) for performance. When the cap is reached, the spawn of that tick is skipped. Documented as a balancing decision.                                                                                           |
| A18 | No valid spawn point                 | Try N seeded candidates; if none is valid, skip that spawn and try at the next interval.                                                                                                                                                      |
| A19 | Arena size                           | Fixed logical 1920×1088 (30×17 tiles of 64 px), letterboxed to the screen.                                                                                                                                                                    |
| A20 | Collision shapes                     | Ships and projectiles are circles; islands are a few circles/rectangles defined in map data, tuned to the art. No physics engine.                                                                                                             |
| A21 | Mobile orientation                   | Landscape only; portrait shows a "Rotate your device" message and auto-pauses a running match.                                                                                                                                                |
| A22 | Resume action                        | Resume button, or P/Esc. Input state is reset on pause and on resume.                                                                                                                                                                         |
| A23 | Health threshold visuals             | > 66% intact, 33–66% damaged, 1–33% heavily damaged + fire effect, 0 wrecked/explosion.                                                                                                                                                       |
| A24 | Asset licenses                       | Ship/tile art appears to be Kenney's "Pirate Pack" (CC0); UI pack and sounds were provided by Jungle Gaming for this challenge. To be confirmed and credited in `README.md`.                                                                  |
| A25 | Test-only spawn helper               | The brief asks for a helper to spawn an enemy at a position. To stay within §8 ("observe state and control the clock"), the helper only seeds named scenarios that go through the real spawn code; it never edits health, score or positions. |
| A26 | Holding a fire button                | Holding a fire button fires again whenever that weapon's cooldown allows. Shots are never queued, so nothing fires after a pause. (Phase 2)                                                                                                   |
| A27 | Shooter weapon                       | The Shooter fires its bow cannon (one projectile) when the player is within attack range and within `aimToleranceRad` of its bow. (Phase 2)                                                                                                   |
