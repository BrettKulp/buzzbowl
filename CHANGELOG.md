# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Save game progress to `localStorage` so a Standard Game survives a page refresh. A "Resume
  Game" button appears on the main menu whenever a save exists; starting a fresh Standard Game
  or Free Play, or finishing all four quarters, leaves no stale save behind.

## [0.0.0] - 2026-07-25

### Added

- Initial release: a Phaser 3 football simulation with Standard Game (quarters, game clock) and
  Free Play (manual possession, no clock) modes.
- Offensive and defensive formation selection, run/pass play type toggling, and drag-to-rotate
  player positioning before the snap.
- Tackle, touchdown, and sideline collision detection via Matter.js physics.
- Scoreboard, down/distance, and line-of-scrimmage/first-down field markers.
- React + Vite UI shell around the Phaser canvas.
