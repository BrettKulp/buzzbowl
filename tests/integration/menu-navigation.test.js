// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { MainMenu } from '../../src/game/scenes/MainMenu.js';
import { FreePlayScene } from '../../src/game/scenes/FreePlayScene.js';
import { StandardGameScene } from '../../src/game/scenes/StandardGameScene.js';
import { StandardGameConfigScene } from '../../src/game/scenes/StandardGameConfigScene.js';
import { saveGame } from '../../src/game/saveGame.js';
import { saveSettings, loadSettings, saveTeamColors } from '../../src/game/gameSettings.js';
import { getHomePlayers, getAwayPlayers } from '../../src/game/helpers.js';
import config from '../../src/game/configLoader.js';

let game;

function bootGame() {
    return new Promise((resolve) => {
        game = new Phaser.Game({
            type: Phaser.HEADLESS,
            width: 1600,
            height: 900,
            physics: { default: 'matter', matter: { gravity: { y: 0 }, setBounds: true } },
            scene: [MainMenu, FreePlayScene, StandardGameScene, StandardGameConfigScene],
            audio: { noAudio: true },
            banner: false,
            callbacks: {
                // MainMenu's preload() is empty, so the very first boot can run straight
                // through to create() before this callback even fires -- an
                // `events.once('create', ...)` attached after the fact would then wait
                // forever for an event that already happened. Every later transition in this
                // file attaches its listener before triggering the transition, so only this
                // one-time initial race needs the status check.
                postBoot: () => {
                    const mainMenu = game.scene.getScene('MainMenu');
                    if (mainMenu.sys.settings.status === Phaser.Scenes.RUNNING) {
                        resolve();
                    } else {
                        mainMenu.events.once('create', resolve);
                    }
                },
            },
        });
    });
}

function waitForCreate(scene) {
    return new Promise((resolve) => scene.events.once('create', resolve));
}

beforeEach(async () => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
    };
    await bootGame();
});

afterEach(() => {
    game.destroy(true);
    game = null;
});

describe('menu navigation', () => {
    // MainMenu.switchScene and BaseGameScene.returnToMenu both used to sleep/wake scenes
    // instead of starting them, so a scene that had been visited once never re-ran init()
    // again -- every later visit silently replayed whatever state was left in memory,
    // regardless of which button the user actually clicked. This reproduces the exact
    // report: play a Standard Game, back out through the menu into Free Play (which
    // resets), then start Standard Game again and confirm it's a new game, not the old one.
    it('starts a fresh Standard Game after a Free Play round trip, even if Standard Game was played before', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');
        const freePlay = game.scene.getScene('FreePlay');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        standardGame.down = 3;
        standardGame.homeScore = 14;
        standardGame.quarter = 2;

        created = waitForCreate(mainMenu);
        standardGame.returnToMenu();
        await created;

        created = waitForCreate(freePlay);
        mainMenu.switchScene('FreePlay');
        await created;

        created = waitForCreate(mainMenu);
        freePlay.returnToMenu();
        await created;

        created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        expect(standardGame.down).toBe(1);
        expect(standardGame.homeScore).toBe(0);
        expect(standardGame.quarter).toBe(1);
    });

    // The minimal case: the sleep/wake bug never actually needed Free Play in the middle --
    // any second visit to a scene that had been slept once would replay its old state. This
    // isolates that from the multi-scene round trip above.
    it('starts a fresh Standard Game the second time it is opened via the menu, with no other scene visited in between', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        standardGame.down = 3;
        standardGame.homeScore = 14;
        standardGame.quarter = 2;

        created = waitForCreate(mainMenu);
        standardGame.returnToMenu();
        await created;

        created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        expect(standardGame.down).toBe(1);
        expect(standardGame.homeScore).toBe(0);
        expect(standardGame.quarter).toBe(1);
    });

    // The fix replaced sleep/wake with scene.start() everywhere, so it's just as easy to
    // imagine a regression that goes too far the other way -- always starting fresh and
    // never honoring `resume`. This is the other half of the contract: clicking "Resume
    // Game" must still load the saved game, not reset it.
    it('honors an explicit Resume, loading the saved game instead of starting fresh', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        standardGame.down = 3;
        standardGame.homeScore = 14;
        standardGame.quarter = 2;
        saveGame(standardGame);

        created = waitForCreate(mainMenu);
        standardGame.returnToMenu();
        await created;

        created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame', true); // "Resume Game"
        await created;

        expect(standardGame.down).toBe(3);
        expect(standardGame.homeScore).toBe(14);
        expect(standardGame.quarter).toBe(2);
    });

    // scene.restart() with no argument keeps whatever data the scene was originally started
    // with (Phaser's own doc: "If no value is given it will not overwrite any previous data
    // that may exist"). A scene entered via Resume was started with {resume: true}, so an
    // unparented restart() silently replayed the same save every time -- the in-game Restart
    // button looked like it did nothing.
    it('starts fresh when Restart is clicked after Resume, instead of reloading the same save', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        standardGame.down = 3;
        standardGame.homeScore = 14;
        standardGame.quarter = 2;
        saveGame(standardGame);

        created = waitForCreate(mainMenu);
        standardGame.returnToMenu();
        await created;

        created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame', true); // "Resume Game"
        await created;

        expect(standardGame.down).toBe(3); // sanity check: resume actually loaded the save

        created = waitForCreate(standardGame);
        standardGame.restart();
        await created;

        expect(standardGame.down).toBe(1);
        expect(standardGame.homeScore).toBe(0);
        expect(standardGame.quarter).toBe(1);
    });
});

describe('preferences screen', () => {
    // The "Preferences" button is a new, separate entry point from "Standard Game" -- this
    // has to click the actual button to prove the routing exists, not just call switchScene()
    // directly (which would trivially "work" regardless of whether any button wires to it).
    it('routes the Preferences button to the config screen', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');

        const created = waitForCreate(configScene);
        mainMenu.preferencesButton.rect.emit('pointerdown');
        await created;

        expect(game.scene.isActive('StandardGameConfig')).toBe(true);
    });

    // "Standard Game" used to route through the config screen first; it now starts the game
    // directly, same as Resume Game does, with the config screen reachable only via the
    // separate Preferences button tested above.
    it('starts Standard Game directly from the main menu, without the config screen', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        const created = waitForCreate(standardGame);
        mainMenu.standardGameButton.rect.emit('pointerdown');
        await created;

        expect(game.scene.isActive('StandardGame')).toBe(true);
        expect(game.scene.isActive('StandardGameConfig')).toBe(false);
    });

    it('auto-saves a changed setting immediately, with no separate save step', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');

        const created = waitForCreate(configScene);
        mainMenu.switchScene('StandardGameConfig');
        await created;

        configScene.toggleQuarterMode();
        configScene.adjustQuarterValue(1);

        const saved = loadSettings();
        expect(saved.quarterMode).toBe('plays');
    });

    it('applies previously saved preferences the next time Standard Game starts', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        saveSettings({
            quarterMode: 'plays', quarterPlayCount: 7,
            stuckTimeoutEnabled: false, stuckBackwardYards: 9,
        });

        const created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        expect(standardGame.quarterMode).toBe('plays');
        expect(standardGame.quarterPlayCount).toBe(7);
        expect(standardGame.stuckTimeoutEnabled).toBe(false);
        expect(standardGame.stuckBackwardYards).toBe(9);
    });

    it('lets Resume Game load the saved game state, not stored preferences', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        standardGame.down = 3;
        saveGame(standardGame);

        created = waitForCreate(mainMenu);
        standardGame.returnToMenu();
        await created;

        created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame', true); // "Resume Game"
        await created;

        expect(game.scene.isActive('StandardGame')).toBe(true);
        expect(standardGame.down).toBe(3);
    });
});

// Picked from the configured palette rather than hardcoded: loadTeamColors() rejects anything
// outside it, so a literal that gets dropped from config.json would fail these on a null-settings
// assertion that reads like an unrelated bug.
const PALETTE = Object.values(config.teamColorPalette);
const [FIRST_COLOR, SECOND_COLOR, THIRD_COLOR, FOURTH_COLOR] = PALETTE;

describe('team colors', () => {
    // Team color is a cross-mode preference (unlike the Standard-Game-only quarter/stuck
    // settings above), stored under its own key and read directly in BaseGameScene.init() --
    // this proves it reaches actual created players, not just the scene's color fields.
    it('applies saved team colors to newly created players in Standard Game', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        saveTeamColors({ homeColor: FIRST_COLOR, awayColor: SECOND_COLOR });

        const created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        expect(standardGame.homeColor).toBe(FIRST_COLOR);
        expect(standardGame.awayColor).toBe(SECOND_COLOR);
        expect(getHomePlayers(standardGame).find((p) => !p.hasBall).fillColor).toBe(FIRST_COLOR);
        expect(getAwayPlayers(standardGame).find((p) => !p.hasBall).fillColor).toBe(SECOND_COLOR);
    });

    // The "Both modes" decision: colors aren't Standard-Game-specific, so Free Play (which has
    // no settings screen of its own and inherits BaseGameScene.init() unmodified) must pick
    // them up too.
    it('applies saved team colors to newly created players in Free Play', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const freePlay = game.scene.getScene('FreePlay');

        saveTeamColors({ homeColor: THIRD_COLOR, awayColor: FOURTH_COLOR });

        const created = waitForCreate(freePlay);
        mainMenu.switchScene('FreePlay');
        await created;

        expect(getHomePlayers(freePlay).find((p) => !p.hasBall).fillColor).toBe(THIRD_COLOR);
        expect(getAwayPlayers(freePlay).find((p) => !p.hasBall).fillColor).toBe(FOURTH_COLOR);
    });

    // Unlike quarter mode/stuck-rule settings (only applied on a fresh game), team color is
    // cosmetic rather than part of a match's saved rules, so BaseGameScene.init() applies it
    // unconditionally -- this proves a resume reflects the *current* preference, not whatever
    // was in effect when the save was made.
    it('applies the current team color preference even when resuming a saved game', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        standardGame.down = 3;
        saveGame(standardGame);
        saveTeamColors({ homeColor: THIRD_COLOR, awayColor: FOURTH_COLOR });

        created = waitForCreate(mainMenu);
        standardGame.returnToMenu();
        await created;

        created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame', true); // "Resume Game"
        await created;

        expect(standardGame.down).toBe(3); // sanity check: still a real resume
        expect(standardGame.homeColor).toBe(THIRD_COLOR);
        expect(standardGame.awayColor).toBe(FOURTH_COLOR);
    });

    // Play review repaints players through Player.setHasBall(), whose only caller is
    // applyRecordedFrame() inside Player itself -- which makes it read as dead code from a
    // grep. It isn't, and it has to read the scene's team colors: replaying a hand-off must
    // restore the user's chosen color, not the config.json default.
    it('repaints replayed players in the saved team colors, not the config defaults', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');

        saveTeamColors({ homeColor: THIRD_COLOR, awayColor: FOURTH_COLOR });

        const created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;

        const carrier = getHomePlayers(standardGame).find((p) => p.hasBall);
        carrier.applyRecordedFrame({ x: carrier.x, y: carrier.y, angle: 0, hasBall: false });

        expect(carrier.fillColor).toBe(THIRD_COLOR);
        expect(carrier.fillColor).not.toBe(config.colors.home);
    });

    // Both teams sharing a color leaves 22 identically-colored players and two matching
    // scoreboard swatches -- an unplayable board reachable from the defaults in a single click,
    // since Navy is immediately followed by Black in the palette.
    it('never lets one team cycle onto the other team\'s color', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');

        const created = waitForCreate(configScene);
        mainMenu.switchScene('StandardGameConfig');
        await created;

        const awayColor = configScene.teamColorRows.Away.color;
        // A full lap in each direction: every palette entry gets selected, so if the exclusion
        // were missing, one of these steps would have to land on the away color.
        for (const direction of [1, -1]) {
            for (let step = 0; step < PALETTE.length; step++) {
                configScene.cycleColor('Home', direction);
                expect(configScene.teamColorRows.Home.color).not.toBe(awayColor);
            }
        }
    });

    // Clicks the real button rather than repeating its scene.start() call, so this fails if the
    // button is wired to the wrong scene or to resume: true.
    it('starts a fresh Standard Game from the Preferences Start Game button', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');
        const standardGame = game.scene.getScene('StandardGame');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;
        standardGame.down = 3;
        saveGame(standardGame);

        created = waitForCreate(configScene);
        standardGame.scene.start('StandardGameConfig');
        await created;

        created = waitForCreate(standardGame);
        configScene.startGameButton.rect.emit('pointerdown');
        await created;

        // Fresh, not a resume -- Start Game must match the main menu's "Standard Game" button,
        // not its "Resume Game" one, even though a save exists.
        expect(standardGame.down).toBe(1);
    });

    // Detouring into Preferences mid-game used to strand the player: the only way back was the
    // main menu. Resume Game keeps the game they were already playing.
    it('resumes the in-progress game from the Preferences Resume Game button', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');
        const standardGame = game.scene.getScene('StandardGame');

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;
        standardGame.down = 3;
        standardGame.homeScore = 14;
        saveGame(standardGame);

        created = waitForCreate(configScene);
        standardGame.scene.start('StandardGameConfig');
        await created;

        created = waitForCreate(standardGame);
        configScene.resumeGameButton.rect.emit('pointerdown');
        await created;

        expect(standardGame.down).toBe(3);
        expect(standardGame.homeScore).toBe(14);
    });

    // Restore Defaults clears storage and restarts the scene rather than re-assigning each
    // field, so this checks the rebuilt screen actually shows defaults again -- both the
    // Standard Game bucket and the separate team-colors one.
    it('restores every preference to its default from the Preferences screen', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');

        saveSettings({ quarterMode: 'plays' });
        saveTeamColors({ homeColor: THIRD_COLOR, awayColor: FOURTH_COLOR });

        let created = waitForCreate(configScene);
        mainMenu.switchScene('StandardGameConfig');
        await created;
        expect(configScene.quarterMode).toBe('plays'); // sanity: the custom values did load

        created = waitForCreate(configScene);
        configScene.restoreDefaultsButton.rect.emit('pointerdown');
        await created;

        expect(configScene.quarterMode).toBe(config.standardGame.quarterMode);
        expect(configScene.teamColorRows.Home.color).toBe(config.colors.home);
        expect(configScene.teamColorRows.Away.color).toBe(config.colors.away);
        expect(loadSettings()).toBeNull();
        // Nothing left to restore, so the rebuilt screen drops the button.
        expect(configScene.restoreDefaultsButton).toBeNull();
    });

    // On a default setup the button would do nothing, so it isn't offered. A team color counts
    // as a custom setting even though it lives in the other storage bucket.
    it('shows Restore Defaults only once something has been changed', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');

        let created = waitForCreate(configScene);
        mainMenu.switchScene('StandardGameConfig');
        await created;
        expect(configScene.restoreDefaultsButton).toBeNull();

        configScene.cycleColor('Home', 1);

        created = waitForCreate(configScene);
        configScene.scene.restart();
        await created;
        expect(configScene.restoreDefaultsButton).not.toBeNull();
    });

    // Nothing to resume means no button -- otherwise it would start an empty game and read as
    // broken. Same condition MainMenu.create() already applies to its own Resume Game button.
    it('omits the Preferences Resume Game button when there is no save', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const configScene = game.scene.getScene('StandardGameConfig');

        const created = waitForCreate(configScene);
        mainMenu.switchScene('StandardGameConfig');
        await created;

        expect(configScene.resumeGameButton).toBeNull();
        expect(configScene.startGameButton).toBeDefined();
    });
});
