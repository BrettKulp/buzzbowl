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
- Menu navigation no longer replays stale scene state: returning to the menu and switching scenes now always goes through `scene.start()`, which fully re-runs `init()`/`create()`, instead of `sleep()`/`wake()`, which silently resumed whatever was left in memory (most visibly, a tackle almost instantly on the next Start after leaving mid-play and hitting Resume).
- Touchdowns were firing about 3 yards early (on the ball carrier's leading edge reaching the end zone sensor, not their center reaching the goal line), most noticeably on the left end zone. The end zone sensors are now pulled back by half the player width so the touchdown fires when the carrier's actual position crosses the goal line, consistent with how the line of scrimmage already uses the carrier's raw x.
- Player collision bodies are now chamfered to match the rounded corners of the drawn base, so a tackle can no longer register on a sharp rectangular corner while the rounded visual corners still show daylight between the two players.
- Whichever team's roster is created without possession no longer starts with a phantom ball carrier: `createPlayers()` set `hasBall` on the home player matching the offensive formation's `ballCarrier` position unconditionally (and hardcoded `false` for away), instead of checking who actually had possession. When Away had the ball, Home's QB/RB spawned already flagged as carrying it; since every later ball-carrier update (`checkBallCarrier`, `togglePlayType`) only touches the *offensive* team, that stale flag survived untouched on defense. The collision handler treats any `hasBall === true` player as the ball carrier regardless of possession, so the first contact that defender made with anyone — almost immediately after snap — was scored as an instant tackle, over and over, with the down count advancing but no real play ever developing.

## [0.1.0] - 2026-07-28

### Added
- Initial Buzz Bowl prototype: Phaser 3 game rendered inside a React/Vite shell.
- Main menu with mode selection.
- Free play mode (manual possession, no game clock).
- Standard game mode (quarters, game clock, downs).
- Firebase Hosting deploy script.
- GitHub Pages preview deploy workflow.
