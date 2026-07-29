# Contributing to Buzz Bowl

Thank you for your interest in contributing!

## Large Changes / Features

For large changes or new features, please **open an issue first** to discuss what you'd like to add. This helps us coordinate and ensures your contribution aligns with the project's direction.

## Bug Fixes / Small Features

For smaller changes like bug fixes or minor features, feel free to **submit a pull request directly**.

## Branch Naming

Please create a descriptive branch with one of these prefixes:

- `feature/` - New features (e.g., `feature/qb-scrramble`)
- `fix/` - Bug fixes (e.g., `fix/touchdown-detection`)
- `docs/` - Documentation changes (e.g., `docs/update-readme`)
- `refactor/` - Code restructuring (e.g., `refactor/extract-collision-logic`)
- `test/` - Adding or updating tests

## Development Setup

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run the linter: `npm run lint`
5. Run the tests: `npm test` (and `npm run test:e2e` if you changed anything the running game
   touches — it needs `npx playwright install chromium` the first time)
6. Commit your changes with a clear message
7. Push to your fork and open a pull request

## Code Style

- Follow the existing code style in the project
- Keep the linter happy (`npm run lint`)

## Tests

Tests live in `tests/`: `unit/` for the game rules (plain Node, no Phaser), `integration/` for a
headless scene boot, `e2e/` for Playwright smoke tests against the real game.

Aim for tests that would fail for a reason a reviewer cares about. A test that mirrors the
implementation line for line fails whenever the code is edited rather than when it breaks, so
things like one-line getters, ternary toggles and `Math.min`/`Math.max` helpers are deliberately
left untested.

## License

By contributing, you agree that your contributions will be licensed under the same PolyForm Noncommercial License as the rest of the project.
