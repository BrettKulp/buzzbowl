# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Save game progress to `localStorage` so a Standard Game survives a page refresh. A "Resume
  Game" button appears on the main menu whenever a save exists; starting a fresh Standard Game
  or Free Play, or finishing all four quarters, leaves no stale save behind.

### Fixed

- Menu navigation (`MainMenu` and the in-game "Menu" button) now always restarts the target
  scene instead of waking a previously slept one. Waking never re-ran a scene's `init()`, so
  once you'd visited Standard Game or Free Play once, every later visit silently replayed
  whatever state was left in memory — most visibly, starting a new Standard Game after
  bouncing through Free Play would resume the old game instead of starting fresh.

## [0.1.0] - 2026-07-28

### Added
- Initial Buzz Bowl prototype: Phaser 3 game rendered inside a React/Vite shell.
- Main menu with mode selection.
- Free play mode (manual possession, no game clock).
- Standard game mode (quarters, game clock, downs).
- Firebase Hosting deploy script.
- GitHub Pages preview deploy workflow.
