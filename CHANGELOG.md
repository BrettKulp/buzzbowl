# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Split `App.jsx` into `Header`, `Footer`, `EmailSignup`, and `OtherWork` components under
  `src/components/`, and moved the Firebase app/Firestore setup into `src/firebase.js`.
  `EmailSignup` now owns its own email/submitted state instead of `App` holding it. The email
  input is now a controlled component (it was missing `value`, so it never visually cleared
  after a successful submission).
- The "My Other Work & Partners" section only renders when the app is served from
  `buzzbowl.org`/`www.buzzbowl.org`, so forks and local dev builds don't show Brett Kulp's
  partner links.

## [0.1.0] - 2026-07-28

### Added
- Initial Buzz Bowl prototype: Phaser 3 game rendered inside a React/Vite shell.
- Main menu with mode selection.
- Free play mode (manual possession, no game clock).
- Standard game mode (quarters, game clock, downs).
- Firebase Hosting deploy script.
- GitHub Pages preview deploy workflow.
