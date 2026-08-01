# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — Vite dev server.
- `npm run lint` — must pass before a PR (CONTRIBUTING.md).
- `npm test` — Vitest, unit + headless-scene integration. `npm run test:watch` to iterate.
- `npm run test:e2e` — Playwright smoke tests. Starts its own dev server on port 5273; run
  `npx playwright install chromium` once first.
- Branch prefixes are required: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`.

## Tests

Three layers, in `tests/`:

- `tests/unit/` — the football rules, in plain Node. `PlayStateManager` and `FormationManager`
  import no Phaser, so they run against `tests/fakes/makeFakeGame.js` rather than a real scene.
  `config.test.js` guards the `config.json` invariants that `createPlayers()` assumes.
- `tests/integration/` — boots a real `StandardGameScene` in `Phaser.HEADLESS` under jsdom.
  `tests/setup-headless.js` shims the two things jsdom lacks: a 2D canvas context (Phaser measures
  every `add.text()` through one) and image `onload` (Phaser gates its main loop on the
  TextureManager finishing base64 textures, so without the shim the game boots and never runs).
- `tests/e2e/` — Playwright. The game is all canvas, so these assert on console errors and on
  screenshots changing between scenes, not on DOM.

Scene code, input handlers and the wrapper UI classes are covered only through layers 2–3. When
adding a test, prefer one that fails for a reason a reviewer cares about over one that restates the
implementation — see the rejected-tests list in the suite's own comments.

## Pitfalls

- **`src/game/scenes/Game.js` is dead code**, despite the name. It's not in the scene list in
  `main.js` (`MainMenu`, `FreePlayScene`, `StandardGameScene`) and nothing live imports it. Real
  shared game logic lives in `BaseGameScene.js`; don't edit `Game.js` expecting it to run.
- **22 players, reused.** Ids 1–11 are home, 12–22 away (`BaseGameScene.js:327`, `:346`). The same
  objects play offense *and* defense — each carries both an `offensivePosition` and a
  `defensivePosition`, and `player.teamHasPossession(game)` decides which applies at runtime.
  Changing possession recolors and repositions those 22; it never creates or destroys players.
- **Import `configLoader.js`, never `config.json` directly.** The loader rewrites `"#RRGGBB"` strings
  into the integers Phaser needs.
- **Adding a formation is a `config.json` edit, not a code change.** Entries are
  `{ homePlayerId, awayPlayerId, xOffset, yOffset }` with offsets relative to the line of scrimmage,
  mirrored for the other team. Every id must already exist in 1–22.
- **Physics is Matter.js with zero gravity**, not Arcade.
- **Firebase is only the email form in `App.jsx`.** `npm run dev` works fully without any
  `VITE_FIREBASE_*` env vars.

## Conventions

- When extracting logic into a manager, leave a one-line delegating method on `BaseGameScene.js` —
  call sites stay on `this.game.<method>()` (e.g. `changeformation()` at line 942).
- Use the `helpers.js` accessors (`getAllPlayers`, `deselectAllPlayers`, `yardsToPixels` — 13.2 px
  per yard) rather than reaching into `game.home.children.entries`.
- Use `log`/`warn`/`error` from `logger.js` over bare `console.*`. `log` and `warn` are gated by
  `debug.enabled` and per-category toggles under `debug.categories` in `config.json`; `error`
  always logs. Unknown categories are off by default.
