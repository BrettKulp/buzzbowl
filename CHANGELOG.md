# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Firebase Analytics is now initialized via `getAnalytics(app)` in `src/firebase.js`
  (`isSupported()`-gated, exported as `analytics`), so page views and events actually
  report to the `G-K1299BBCG7` web stream instead of the app initializing silently.
  Collection is restricted to `buzzbowl.org` and `www.buzzbowl.org` so local/dev
  environments don't pollute the stream.
- The pre-commit hook now blocks commits that stage `src/game/config.json` with
  `debug.enabled: true` (`scripts/check-debug-disabled.mjs`). It inspects the staged copy of
  the file, so local debugging with logging on stays unblocked as long as the file isn't
  staged.

### Fixed

- A completed pass to a receiver who was already touching a defender or the sideline no
  longer goes undetected: `collisionstart` only fires when a contact *begins*, and that pair's
  original contact was skipped because neither body had the ball yet, so no tackle registered
  until the bodies separated and re-collided. The collision pair logic was extracted into
  `src/game/collisionHandling.js` and is now also wired to Matter's `collisionactive`
  event, which fires every tick for ongoing contacts. A `scored` guard prevents the touchdown
  branch from re-firing (and re-awarding points) each tick during the celebration window, and
  the per-tick `collision` log only runs on `collisionstart` (new contacts) so the console is
  not flooded once the category is enabled.

### Changed

- Reworked debug logging: `log` is gated by `debug.enabled` in
  `config.json` and emits a `[DEBUG:<category>]` prefix, and each log category
  (`collision`, `collisionWithBallCarrier`, `play`, `stuck`, `player`) can be
  toggled individually under `debug.categories`; `warn` and `error` always log
  (tagged `[WARN]`/`[ERROR]`) regardless of the switch. Log arguments are lazily evaluated (pass a
  thunk) so disabled logs cost nothing. Raw `console.log`/`console.debug` calls in
  `PlayStateManager` and `BaseGameScene` were routed through the logger,
  `Player.logPlayer()` was condensed to a single line, a general `collision` log was added
  alongside the ball-carrier collision detail, and per-frame/verbose logs (per-click player
  dumps and the per-player `updateTargetCircle` dump) were removed.
- The LOS enforcement log is back as a `los` debug category so it can be toggled from
  `debug.categories` in `config.json`.
- The `collisionWithBallCarrier` debug log now skips collisions with same-team players, and
  `PlayStateManager.handleTackle` no longer throws when the "tackler" is an EndZone or SideLine
  entity (they have no `logPlayer` method).

### Removed

- Removed the unused `rotationHandle` circle (created per-player in `Player`, positioned from
  `currentAngle` in the scene `update` loop, but never shown), its `rotationHandle` color in
  `config.json`, the never-read `initialAngle` recorded when the rotation-arrow handle starts
  being dragged, and the never-called `Player.setBaseAngle`. None of these were referenced
  anywhere at runtime.
- Removed the never-read `rotatingPlayer` field from `BaseGameScene`, and the duplicate
  rotation-handle cleanup branch in `dragend` that the arrow sprite's `.player` early-return
  had already made unreachable (dropping the handle never cleared `draggingRotationHandle` or
  restored its alpha).

### Fixed

- Player facing (the front stripes on each player, and the rotation-arrow handle that appears
  when a player is selected) now flips at every quarter change to match the new attack
  direction. `baseAngle` was fixed per team at construction (Home always right, Away always
  left), so Q1→Q2 and Q3→Q4 left the offense facing the wrong way when the teams swapped
  endzones. Movement is unchanged (it already used `directionSign`); only the visuals flip.
  `getPlayerUIDirection()` is a live method derived from the scene's `(possession,
  offenseMovingRight)` state, and `facingAngle` is derived from `currentAngle` plus that
  multiplier -- so facing stays correct even on a resume-from-save boot, where the old
  `resetPosition`-only derivation never ran and left everyone facing the stale Q1 direction.
  Rotation also works in the flipped direction now: dragging the rotation-arrow handle keeps a
  player running toward the arrow after a quarter swap, and dropping the handle always clears
  it and restores its opacity (the `dragend` early-return for the arrow sprite used to skip
  that cleanup).
- `error()` from `logger.js` no longer disappears in a default build: it is now unconditional
  (always routed to `console.error`) instead of being gated by `debug.enabled`, so formation and
  Matter-body failures stay visible to consoles and to the e2e error guard rail. The dead
  `error` entry was removed from `debug.categories`, and unknown log categories now default to
  off rather than on, so a typo'd category stays quiet.
- `warn()` from `logger.js` no longer disappears in a default build either: it is now
  unconditional (always routed to `console.warn`) instead of being gated by `debug.enabled`,
  so save-game and settings read/write failures stay visible to players. The dead `warn`
  entry was removed from `debug.categories`.
- `error()` and `warn()` no longer take a category argument (every call site was passing their
  own level name, which carried no information): `error` tags itself `[ERROR]` and `warn` tags
  itself `[WARN]`. Only `log()` keeps a caller-chosen category.
- In `BaseGameScene`, the `describeCollider` helper was hoisted out of the per-pair collision
  loop (it was being reallocated every pair every frame), the `elapsedMs` collision-detail
  argument is now computed lazily inside the log thunk, a redundant `!otherPlayer?.team` check
  was dropped (the `!==` comparison already covers it), and leftover indentation left after the
  per-player `updateTargetCircle` log removal was cleaned up.
- Fixed a syntax error in the stuck-ball-carrier check (unclosed paren, undefined `game`
  reference). The QB holding the ball on a Pass play is now exempt from the stuck-motionless and
  stuck-backward checks so he can drop back and scramble without triggering a false tackle.
  Split the old `checkStuckBallCarrier` into a `checkBallCarrierMotion` entry point plus separate
  `checkStuckMotionless` and `checkStuckBackwards` helpers.
- After a touchdown, the game now keeps running (players moving, clock ticking) during the
  celebration window instead of freezing; the pause now only triggers once the window ends.
  The window was also extended from 40 frames (~0.7s) to 120 frames (2s). The Matter collision
  handler no longer pauses the play immediately on the endzone hit.
- Changed the Vite `base` to `./` (relative) so the same build serves correctly from any
  subpath: `buzzbowl.org/` (Firebase deploy at the site root) and the GitHub Pages test site at
  `brettkulp.github.io/buzzbowl/`. The previous deploy placed `dist` at the site root while
  `index.html` referenced absolute `/buzzbowl/assets/*`, so asset requests were caught by the
  SPA rewrite and returned `index.html` (`text/html`), breaking module script loading.
- Updated `firebase.json` caching so `index.html` is served with `no-cache` while hashed JS/CSS
  assets use long-lived immutable caching. Previously `index.html` was cached for an hour, so
  after a deploy a stale cached page could request an old hashed bundle that no longer existed,
  and the SPA catch-all rewrite returned `index.html` (MIME `text/html`) in its place, breaking
  module script loading.

### Changed

- Split `App.jsx` into `Header`, `Footer`, `EmailSignup`, and `OtherWork` components under
  `src/components/`, and moved the Firebase app/Firestore setup into `src/firebase.js`.
  `EmailSignup` now owns its own email/submitted state instead of `App` holding it. The email
  input is now a controlled component (it was missing `value`, so it never visually cleared
  after a successful submission).
- The "My Other Work & Partners" section only renders when the app is served from
  `buzzbowl.org`/`www.buzzbowl.org`, so forks and local dev builds don't show Brett Kulp's
  partner links.
- Reworked the header and footer with a subtle retro theme (warm palette, an "Alfa Slab One"
  wordmark, a gradient accent stripe) and tightened their spacing so the game menu is visible
  without scrolling on a typical viewport. The header is now a compact badge + wordmark instead
  of two large flanking logos, the long "how to play" instructions collapse into a native
  `<details>` disclosure above the game, and the footer's contact/contributing links are a
  single condensed row.
- Added a small gap between the header's bottom accent stripe and the text below it.
- Reverted the site palette from the retro brown/mustard scheme to Vite's default gray with a
  purple accent that matches the in-game `Button` color (`#4444aa`). The header's "Buzz Bowl"
  wordmark is now white and the background is dark gray again.
- Restored the flanking mirrored football logos around the header wordmark, and restyled the
  "How to play" disclosure from a purple-outlined pill into a solid purple button that matches
  the in-game buttons. Removed the purple border around the header logos, and replaced the
  purple accent stripe below the header with a neutral gray line. Restored the layered
  `text-shadow` effect on the "Buzz Bowl" wordmark with a dark gray offset.

### Fixed

- `PhaserGame` now forces a scale recheck (`game.scale.refresh()`) when the tab becomes visible.
  Phaser's `Scale.FIT` mode only recalculates on a window resize/orientation event or its own
  ~500ms poll, and that poll rides the game's render loop, which browsers throttle in a
  background tab — a game booted while its tab wasn't visible could lock in a stale canvas size
  with nothing left to correct it.
- `#game-container` only capped its size by viewport *width*, deriving height from a fixed 16:9
  `aspect-ratio`. On a wide-but-short browser window that height overran the fold with nothing
  to shrink it. Its width now also factors in the remaining viewport height, so it never grows
  past what actually fits above the fold.
### Added

- `tests/unit/collisionHandling.test.js` covering `handleCollisionPairs` on a fake game (no
  Phaser): a receiver catching while already touching the sideline is ruled down on the next
  `collisionactive` tick, an ongoing opposing contact tackles the carrier, the `scored` guard
  suppresses the re-firing touchdown, and collisions before the snap are ignored.
- `tests/integration/scene-boot.test.js` now proves the `collisionactive` subscription reaches
  `handleTackle` by emitting the event on the Matter world directly (fails if the subscription
  is dropped).
- `tests/unit/logger.test.js` covering the debug-logger contract: `error()` emits when
  `debug.enabled` is false while `log`/`warn` stay silent, a per-category toggle silences only
  its own category, and unknown categories default to off.
- Rounded-corner players (both ends) with two thin white stripes on the front edge to visually distinguish facing direction at a glance.
- Console logging (unconditional) around the play lifecycle — snap, tackles, down/first-down/turnover resolution, and possession changes are tagged `[DEBUG]` via `console.log`; the high-volume per-collision trace is tagged `[DEBUG:collision]` via `console.debug` so it can be filtered out (or hidden by turning off "Verbose" in the browser console) without losing the rest — to help diagnose in-game rules bugs going forward.
- Save game progress to `localStorage` so a Standard Game survives a page refresh. A "Resume
  Game" button appears on the main menu whenever a save exists; starting a fresh Standard Game
  or Free Play, or finishing all four quarters, leaves no stale save behind.
- Play review: a "Review Play" button next to the Menu button lights up once a play ends.
  Drag the timeline scrubber above the field, or step through in eighths with the arrow
  buttons, to watch all 22 players retrace their exact recorded path — including any
  mid-play possession change. The button becomes "Resume" while reviewing and puts everyone
  back on their end-of-play spot. Recording runs to the true end of the play rather than the
  whistle, so a touchdown replay includes the run on into the endzone during the celebration
  window, and Review Play only lights up once everything has actually stopped moving.
  Recording is capped at 1800 frames (~30s at 60fps, about 3KB/frame) per play, so a play
  that never draws a tackle can't grow unbounded.
- "Preferences" screen, reached by its own button at the bottom of the main menu, for the
  Standard Game quarter mode (time vs. play count) and the stuck-ball-carrier house rule
  settings below. Every change is written to `localStorage` immediately as it's made — there is
  no separate save step — and is picked up the next time Standard Game is started. The main
  menu shows a "Using custom settings" / "Using default settings" indicator so it's clear which
  is in effect. "Resume Game" is unaffected — it continues to load the saved game's own state,
  not these preferences.
- "Stuck ball carrier" house rule: a play now auto-ends (dead ball, same as a tackle) if the
  ball carrier goes motionless for a configurable number of seconds, or drifts backward past a
  configurable number of yards from the furthest point already reached in the play — either
  condition alone ends the play, both independently toggleable and on by default (6s / 5 yards)
  to guard against Matter.js's zero-gravity physics letting a player circle in place
  indefinitely.
- Team color picker on the Preferences screen: choose each team's color from a 10-color preset
  palette (cycled with the same `<`/`>` selector as every other row, with a live swatch). Unlike
  the quarter/house-rule settings, this applies to both Standard Game and Free Play, and to a
  resumed game as well — it's a cosmetic preference, not part of a match's saved rules. Cycling
  skips whichever color the other team is using, so the two teams can never be set to the same
  one. The palette deliberately contains no color close to the ball carrier's highlight, the
  field green, or the white facing-direction stripes.
- "Start New Game" and "Resume Game" buttons on the Preferences screen, so settings can be tried
  without a round trip through the main menu, and so a game in progress survives a detour into
  Preferences. They mirror the main menu's equivalents, and "Resume Game" only appears when
  there is a save to resume. The rows above were tightened to make room.
- "Restore Defaults" button on the Preferences screen, smaller and below the two play buttons.
  It clears both saved settings buckets, after which every row falls back to its `config.json`
  default and the main menu goes back to reporting "Using default settings". It only appears
  once something has actually been changed — on a default setup it would be a no-op — and
  disappears again as soon as it's used.

### Removed

- Dead `Player` methods `resetColor()` and `setTeamColor()`. Neither had any callers — the live
  code sets `player.hasBall` and `player.fillColor` directly — so they were quietly diverging
  from the paths that actually run. `setHasBall()` is kept: play review's `applyRecordedFrame()`
  calls it, and it now reads the scene's team colors so a replayed hand-off repaints in the
  chosen color rather than the `config.json` default.

### Fixed

- Preferences rows no longer clip the first and last letters of their longest values ("Play
  Count", "Sky Blue") — the `<`/`>` arrow buttons were only 100px either side of the centred
  value and overlapped it; they now sit 150px out.
- Player collision body now matches the visible base (rectangle sized to the base's width/height) instead of an oversized circle that extended well past the drawn shape.
- Tackles no longer bounce the ball carrier and tackler apart before the down is called: pausing a play now freezes every player's physics body in place instead of only zeroing velocity, so Matter's collision-resolution can't shove overlapping bodies apart after contact.
- Menu navigation (`MainMenu` and the in-game "Menu" button) now always restarts the target
  scene instead of waking a previously slept one. Waking never re-ran a scene's `init()`, so
  once you'd visited Standard Game or Free Play once, every later visit silently replayed
  whatever state was left in memory — most visibly, starting a new Standard Game after
  bouncing through Free Play would resume the old game instead of starting fresh.
- Touchdowns were firing about 3 yards early on the left end zone (barely early on the right): the end zone sensors were hardcoded at positions that weren't actually symmetric relative to their own goal lines (the left sensor sat 9px past its goal line, the right one only 1px off). Both are now derived from the same goal-line formula, so a touchdown fires consistently on either side as soon as any part of the ball carrier crosses the goal line (leading edge, as before), not when their center does. The frame-by-frame tunneling backstop in `update()` used the same stale hardcoded positions and has been updated to match.
- Player collision bodies are now chamfered to match the rounded corners of the drawn base, so a tackle can no longer register on a sharp rectangular corner while the rounded visual corners still show daylight between the two players.
- The save now updates immediately after every tackle, not just on formation/possession/
  Next Play changes — refreshing while the "Down!"/"Touchdown" popup is showing no longer
  loses that play's result.
- Refreshing during the tackle popup after a touchdown or turnover on downs no longer
  loads stale possession state. The possession change for those events is deferred to
  `nextPlay`, so `scored` and `turnoverOnDowns` are now saved with the game state and
  `loadGame` applies the pending possession change on resume, keeping the state
  consistent.
- Defensive formation positions are now clamped to the canvas the same way offense already
  was. Near either goal line — most reliably right after a change of possession pins the line
  of scrimmage deep — defenders (especially deep safeties) could be placed hundreds of pixels
  off-canvas.
- The in-game "Restart" button now actually starts a fresh game after a game was entered via
  "Resume Game". `scene.restart()` with no argument keeps whatever data the scene was
  originally started with, so a resumed game kept replaying the same save every time Restart
  was clicked, making the button look like it did nothing.
- `createPlayers()` no longer hardcodes `hasBall` on the Home RB based on the offensive
  formation. After a possession-change resume, `checkBallCarrier()` only touches the current
  offense's players, leaving the now-defensive Home RB with a stale ball-carrier flag —
  which created a phantom second ball carrier and triggered an immediate tackle at play
  start. The ball carrier is now assigned exclusively by `checkBallCarrier()` during the
  formation toggle, the same way it is during normal gameplay.

## [0.1.0] - 2026-07-28

### Added
- Initial Buzz Bowl prototype: Phaser 3 game rendered inside a React/Vite shell.
- Main menu with mode selection.
- Free play mode (manual possession, no game clock).
- Standard game mode (quarters, game clock, downs).
- Firebase Hosting deploy script.
- GitHub Pages preview deploy workflow.
