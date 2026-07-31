# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Rounded-corner players (both ends) with two thin white stripes on the front edge to visually distinguish facing direction at a glance.
- Console logging (unconditional) around the play lifecycle — snap, tackles, down/first-down/turnover resolution, and possession changes are tagged `[DEBUG]` via `console.log`; the high-volume per-collision trace is tagged `[DEBUG:collision]` via `console.debug` so it can be filtered out (or hidden by turning off "Verbose" in the browser console) without losing the rest — to help diagnose in-game rules bugs going forward.
- Save game progress to `localStorage` so a Standard Game survives a page refresh. A "Resume
  Game" button appears on the main menu whenever a save exists; starting a fresh Standard Game
  or Free Play, or finishing all four quarters, leaves no stale save behind.

### Fixed

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
