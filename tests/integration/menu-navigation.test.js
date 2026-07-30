// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { MainMenu } from '../../src/game/scenes/MainMenu.js';
import { FreePlayScene } from '../../src/game/scenes/FreePlayScene.js';
import { StandardGameScene } from '../../src/game/scenes/StandardGameScene.js';
import { saveGame } from '../../src/game/saveGame.js';

let game;

function bootGame() {
    return new Promise((resolve) => {
        game = new Phaser.Game({
            type: Phaser.HEADLESS,
            width: 1600,
            height: 900,
            physics: { default: 'matter', matter: { gravity: { y: 0 }, setBounds: true } },
            scene: [MainMenu, FreePlayScene, StandardGameScene],
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
    // instead of starting them, so a scene that had been visited once never ran create()
    // again -- every later visit silently woke the same stale instance, regardless of which
    // button the user actually clicked. This proves create() now fires fresh on every visit,
    // including after bouncing through Free Play in between, matching the reported repro.
    //
    // This only covers the scene-lifecycle half of the bug. Per-game fields like
    // down/homeScore/quarter are still only reset in the constructor on this branch, which
    // Phaser never re-runs -- moving that reset into init() is a separate, already-open
    // change (see PR #10) that this PR depends on for the full user-visible fix to land.
    it('re-creates Standard Game every time it is opened via the menu, even after a Free Play round trip', async () => {
        const mainMenu = game.scene.getScene('MainMenu');
        const standardGame = game.scene.getScene('StandardGame');
        const freePlay = game.scene.getScene('FreePlay');

        let createCount = 0;
        standardGame.events.on('create', () => { createCount++; });

        let created = waitForCreate(standardGame);
        mainMenu.switchScene('StandardGame');
        await created;
        expect(createCount).toBe(1);

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

        expect(createCount).toBe(2);
    });

    // The fix replaced sleep/wake with scene.start() everywhere, so it's just as easy to
    // imagine a regression that goes too far the other way -- always starting fresh and
    // never honoring `resume`. This is the other half of the contract: clicking "Resume
    // Game" must still load the saved game. Unlike the reset case above, this one doesn't
    // depend on PR #10: loadGame() assigns the saved fields directly, regardless of whether
    // init() reset them to defaults first.
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
});
