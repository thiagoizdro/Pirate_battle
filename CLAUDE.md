# Pirate Battle: project conventions

Hiring test for Jungle Gaming. A 2D top-down naval shooter in React + TypeScript + PixiJS.

## Working agreement

- Claude is the senior pair programmer; the user is a junior developer who must be able to explain every line in an interview. Prefer simple, readable solutions over clever ones.
- Summaries to the user are in **simple Portuguese**. Everything else (code, identifiers, UI text, commits, docs) is in **English**.
- Work in phases (see `docs/PROGRESS.md`). At the start of a phase, present a short plan (files and why) and wait for approval. At the end, run lint, typecheck and tests, summarize in Portuguese (what was done, how to test manually, decisions, pending items) and update `docs/PROGRESS.md`. Stop after each phase.
- Small Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`). Never commit with a failing typecheck.
- Ask before adding a library outside the agreed stack. No physics engine: collision and AI are our own code.
- When the README is ambiguous, ask. If an assumption is unavoidable, log it in `docs/REQUIREMENTS.md` (Ambiguities table) and in the README.

## Source of truth

- `challenge/README.md` (Portuguese) overrides everything else. Assets in `challenge/assets/`; reference screenshots `challenge/assets/sample*.png` and `preview.png`. Look at them before designing a screen.
- `docs/REQUIREMENTS.md` lists R1…Rn with README sections, the rubric and the agreed assumptions.

## Stack

React 19, TypeScript (strict, pinned to the 6.0.x line because typescript-eslint supports `<6.1`), Vite, PixiJS v8 (v8 API only, never v7 patterns), TanStack Query v5, Axios, MSW, Playwright, Vitest, ESLint + typescript-eslint + Prettier, CSS Modules. Audio uses the native Web Audio API.

PixiJS v8 reminders: `new Application()` then `await app.init({...})`; `app.canvas` (not `app.view`); `Assets.load` / bundles; `Graphics` chained API (`.rect().fill()`); only `Container` has children; ticker callbacks receive a `Ticker`; destroy with `app.destroy({ removeView: true }, { children: true })`.

## Architecture rules (non-negotiable)

- `src/game/simulation/`: pure TypeScript rules. Never imports React or PixiJS. Deterministic given seed, inputs and clock.
- `src/game/render/`: PixiJS. Reads simulation state each frame and draws it. Never decides rules.
- `src/game/input/`: keyboard and touch produce an `InputState` (forward, turnLeft, turnRight, fireFront, fireLeft, fireRight). Game keys are captured only while gameplay is active.
- `src/game/audio/`: sound playback driven by simulation events.
- `src/ui/`: React screens and components. `src/api/`, `src/mocks/`, `src/storage/`: contracts, MSW, local persistence.
- Fixed timestep with an accumulator; all gameplay time is simulated time (never wall clock or frame count); clamp large deltas. Injectable clock and seeded RNG.
- React receives only throttled snapshots (score, whole seconds left, health, status) through a subscribe API (`useSyncExternalStore`). No React re-render per frame. The game emits typed events.
- All balancing lives in `src/game/config.ts`. Systems never hardcode numbers. Each match freezes a snapshot of the config at start.
- Load textures once, show progress, handle failure with Retry. Resize to container and devicePixelRatio with a fixed logical arena and letterboxing. Destroy everything on exit/restart; must survive React Strict Mode double mount. Pool projectiles and effects.
- Test hooks (`window.__PIRATE_TEST__`) exist only behind a test flag; tests drive real input and never mutate state to fake outcomes.

## Code quality

`strict: true`, no `any`, no `@ts-ignore`, ESLint and Prettier clean, zero unhandled console errors in every flow.
