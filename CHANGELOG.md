# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

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

## [0.1.0] - 2026-07-28

### Added
- Initial Buzz Bowl prototype: Phaser 3 game rendered inside a React/Vite shell.
- Main menu with mode selection.
- Free play mode (manual possession, no game clock).
- Standard game mode (quarters, game clock, downs).
- Firebase Hosting deploy script.
- GitHub Pages preview deploy workflow.
