# Agents

- Do not run `npm run build` or any build commands. The user will handle building and testing manually.

## Architecture

The project uses **Phaser 3** for game rendering and physics, with **React** as the UI shell via Vite.

### Main Game File

`src/game/scenes/Game.js` is the main file that the game runs off of. It is the primary Phaser scene containing field setup, player creation, input handling, collision detection, and the update loop.

### Manager Classes

If there is a large group of logic that can be moved into its own class or manager file (like `FormationManager.js` or `PlayStateManager.js`), move that logic out of `Game.js` into its own dedicated file. This keeps `Game.js` focused on orchestration while managers handle specific responsibilities.

### Key Modules

- `src/game/scenes/Game.js` - Main game scene (entry point for game logic)
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
