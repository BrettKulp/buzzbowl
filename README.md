# Buzz Bowl

A Football Simulation Game built with Phaser 3, React, and Vite.

## Features

- Football simulation with offensive and defensive formations
- Drag-and-drop player positioning
- Run and Pass play types
- Touchdown scoring and possession changes
- Configurable defensive formations (4-3, 3-4, etc.)

**Play it now:** <a href="https://buzzbowl.org/" target="_blank" rel="noopener noreferrer">buzzbowl.org</a>

**Test in-progress features:** <a href="https://brettkulp.github.io/buzzbowl/" target="_blank" rel="noopener noreferrer">brettkulp.github.io/buzzbowl</a>

**Join the Discord:** <a href="https://discord.gg/xen4wNYMGt" target="_blank" rel="noopener noreferrer">buzz-bowl channel</a>

## Contributing

Interested in contributing? Please read our [Contributing Guide](CONTRIBUTING.md).

## Prerequisites

- **Node.js** v18 or higher (recommended: v20+)
- npm (comes with Node)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/BrettKulp/buzzbowl.git
   cd buzzbowl
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the URL shown in the terminal (usually `http://localhost:5173`)

## Tests

```bash
npm test          # unit + headless scene tests (Vitest)
npm run test:e2e  # browser smoke tests (Playwright)
```

`npm run test:e2e` needs a browser once: `npx playwright install chromium`. It starts its own dev
server, so you don't need `npm run dev` running.

The suite has three layers: unit tests for the game rules, a headless Phaser boot that checks the
scene actually assembles, and Playwright smoke tests that click through the menus in a real browser.
See [CONTRIBUTING.md](CONTRIBUTING.md) for what belongs in each.

## Project Structure

The shared game logic lives in `src/game/scenes/BaseGameScene.js`. The two playable modes,
`FreePlayScene` and `StandardGameScene`, extend it.

### Key Files

- `src/game/scenes/BaseGameScene.js` - Shared game scene (field, players, input, update loop)
- `src/game/scenes/StandardGameScene.js` - Standard mode (quarters and a game clock)
- `src/game/scenes/FreePlayScene.js` - Free play mode (manual possession, no clock)
- `src/game/FormationManager.js` - Manages offensive/defensive formations
- `src/game/PlayStateManager.js` - Handles play state (start, pause, tackle, etc.)
- `src/game/Player.js` - Player entity with physics and movement
- `src/game/config.json` - Game configuration (field dimensions, colors, formations)

## Firebase

Firebase is used only for hosting and testing deployments. You do **not** need Firebase to develop or contribute to the game. Simply run `npm run dev` and all game features will work locally.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. See [LICENSE](LICENSE) for details.

Noncommercial use (personal projects, education, hobby use, etc.) is free and encouraged.

**Commercial use** (selling, SaaS, revenue-generating products) requires a separate commercial license. If you're interested in a commercial license, please open an issue with details about your intended use.
