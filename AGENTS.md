# Agents

- Do not run `npm run build` or any build commands. The user will handle building and testing manually.
- Use descriptive variable names. Never use numbered suffixes like `infoBtn1`, `infoBtn2`. Instead use names that describe what the variable represents, e.g. `standardGameInfoButton`, `freePlayInfoButton`.
- When adding a feature, fixing a bug, or making another notable change, add an entry to `CHANGELOG.md` under `[Unreleased]` (Keep a Changelog format: `### Added` / `### Changed` / `### Fixed` / `### Removed` as applicable).

## Architecture

The project uses **Phaser 3** for game rendering and physics, with **React** as the UI shell via Vite.

### Main Game File

`src/game/scenes/BaseGameScene.js` is the base class containing shared game logic (field setup, player creation, input handling, collision detection, update loop). `FreePlayScene.js` and `StandardGameScene.js` extend it with mode-specific behavior.

### Manager Classes

If there is a large group of logic that can be moved into its own class or manager file (like `FormationManager.js` or `PlayStateManager.js`), move that logic out of `BaseGameScene.js` into its own dedicated file. This keeps `BaseGameScene.js` focused on orchestration while managers handle specific responsibilities.

### Key Modules

- `src/game/scenes/BaseGameScene.js` - Base game scene (shared logic)
- `src/game/scenes/FreePlayScene.js` - Free play mode (manual possession, no clock)
- `src/game/scenes/StandardGameScene.js` - Standard game mode (quarters, game clock)
- `src/game/FormationManager.js` - Offensive/defensive formation toggling and setup
- `src/game/PlayStateManager.js` - Play lifecycle (start, pause, tackle, down management)
- `src/game/Player.js` - Player entity, physics body, veering/movement
- `src/game/configLoader.js` - Loads and exports the game config
- `src/game/config.json` - All game configuration (dimensions, colors, formations, physics)
- `src/game/helpers.js` - Utility functions (player filtering, coordinate conversion)
- `src/game/EventBus.js` - Event emitter bridging Phaser and React
- `src/game/Button.js` - Reusable UI button component
- `src/game/Popup.js` - In-game popup notifications
- `src/game/Scoreboard.js` - Scoreboard display
- `src/game/FieldMarker.js` - Line of scrimmage / first down markers
- `src/game/EndZone.js` - End zone and sideline collision areas
