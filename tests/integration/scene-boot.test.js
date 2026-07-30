// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { StandardGameScene } from '../../src/game/scenes/StandardGameScene.js';
import { getAllPlayers, getHomePlayers, getAwayPlayers } from '../../src/game/helpers.js';
import { hasSave, loadGame } from '../../src/game/saveGame.js';

let game;
let scene;

function bootScene() {
    return new Promise((resolve) => {
        game = new Phaser.Game({
            type: Phaser.HEADLESS,
            width: 1600,
            height: 900,
            physics: { default: 'matter', matter: { gravity: { y: 0 }, setBounds: true } },
            scene: [StandardGameScene],
            audio: { noAudio: true },
            banner: false,
            callbacks: {
                postBoot: () => {
                    scene = game.scene.getScene('StandardGame');
                    scene.events.once('create', () => resolve());
                },
            },
        });
    });
}

beforeEach(async () => {
    await bootScene();
});

afterEach(() => {
    game.destroy(true);
    game = null;
    scene = null;
});

describe('scene boot', () => {
    // createPlayers joins two independent config trees by player id. Nothing else in the
    // suite proves config.json, Player and the scene actually fit together.
    it('spawns 22 players, 11 a side, each with an offensive and defensive assignment', () => {
        const players = getAllPlayers(scene);

        expect(players).toHaveLength(22);
        expect(getHomePlayers(scene)).toHaveLength(11);
        expect(getAwayPlayers(scene)).toHaveLength(11);

        for (const player of players) {
            expect(player.offensivePosition, `player ${player.id} offense`).toBeTruthy();
            expect(player.defensivePosition, `player ${player.id} defense`).toBeTruthy();
        }

        expect(players.filter((p) => p.hasBall)).toHaveLength(1);
    });

    // BaseGameScene keeps one-line delegating methods so call sites stay on this.game.*
    // (a documented convention). This proves that delegation is actually wired, not that
    // the down rule works -- the unit tests own the rule.
    it('routes handleTackle through to the play state manager', () => {
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);
        scene.lineOfScrimmage.x = 600;
        scene.firstDownMarker.x = 900;
        ballCarrier.x = 650;

        scene.handleTackle(ballCarrier, null, 'Tackle');

        expect(scene.down).toBe(2);
        expect(scene.lineOfScrimmage.x).toBe(680);
    });
});

describe('game clock', () => {
    it('runs only while a play is live', () => {
        expect(scene.gameClock).toBe(scene.quarterLength);

        scene.startPlay();
        expect(scene.clockRunning).toBe(true);

        scene.update(0, 1000);
        expect(scene.gameClock).toBeCloseTo(scene.quarterLength - 1, 5);

        scene.pausePlay();
        expect(scene.clockRunning).toBe(false);

        scene.update(1000, 1000);
        expect(scene.gameClock).toBeCloseTo(scene.quarterLength - 1, 5);
    });
});

describe('field bounds after resetPosition', () => {
    // Defensive formation offsets (up to 260px, for deep safeties) never got the field-bounds
    // clamp offense already had. A drive pinned at the goal line -- exactly where
    // handleNonTouchdown's own LOS clamp (145/1455) kicks in -- pushed defenders hundreds of
    // pixels past the 1600-wide canvas.
    it('keeps every player on-canvas after a snap deep in the red zone', () => {
        scene.possession = 'Home';
        scene.targetEndzone = 'Right';
        scene.offenseMovingRight = true;
        scene.down = 3;
        scene.lineOfScrimmage.x = 1440;
        scene.firstDownMarker.x = 1470;

        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);
        ballCarrier.x = 1440;
        scene.handleTackle(ballCarrier, null, 'Tackle');
        scene.nextPlay();

        for (const player of getAllPlayers(scene)) {
            expect(player.x, `player ${player.id} x`).toBeGreaterThanOrEqual(10);
            expect(player.x, `player ${player.id} x`).toBeLessThanOrEqual(1590);
        }
    });

    it('keeps every player on-canvas after a turnover on downs pinned deep', () => {
        scene.possession = 'Home';
        scene.targetEndzone = 'Right';
        scene.offenseMovingRight = true;
        scene.down = 4;
        scene.lineOfScrimmage.x = 1440;
        scene.firstDownMarker.x = 1470;

        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);
        ballCarrier.x = 1440;
        scene.handleTackle(ballCarrier, null, 'Tackle');
        expect(scene.turnoverOnDowns).toBe(true);

        scene.nextPlay();
        expect(scene.possession).toBe('Away');

        for (const player of getAllPlayers(scene)) {
            expect(player.x, `player ${player.id} x`).toBeGreaterThanOrEqual(10);
            expect(player.x, `player ${player.id} x`).toBeLessThanOrEqual(1590);
        }
    });
});

describe('save on tackle', () => {
    beforeEach(() => {
        const store = new Map();
        globalThis.localStorage = {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k),
        };
    });

    // A refresh during the end-of-play UI (the "Down!"/"Touchdown" popup, before Next Play is
    // clicked) used to lose that play's result -- handleTackle never wrote a save, only
    // formation/possession/nextPlay changes did.
    it('persists the play result immediately, before Next Play is clicked', () => {
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);
        scene.lineOfScrimmage.x = 600;
        scene.firstDownMarker.x = 900;
        ballCarrier.x = 650;

        scene.handleTackle(ballCarrier, null, 'Tackle');

        expect(hasSave('StandardGame')).toBe(true);
        const reloaded = { scene: { key: 'StandardGame' }, lineOfScrimmage: {}, firstDownMarker: {} };
        loadGame(reloaded);
        expect(reloaded.down).toBe(scene.down);
    });
});

describe('end of quarter', () => {
    it('swaps direction and hands the ball to Away at halftime', () => {
        scene.quarter = 2;
        scene.down = 3;
        scene.lineOfScrimmage.x = 600;

        scene.endQuarter();

        expect(scene.halftime).toBe(true);
        expect(scene.quarter).toBe(3);
        expect(scene.possession).toBe('Away');
        expect(scene.targetEndzone).toBe('Left');
        expect(scene.down).toBe(1);
        expect(scene.lineOfScrimmage.x).toBe(scene.canvasWidth - 600);
        expect(scene.gameClock).toBe(scene.quarterLength);
    });

    it('ends the game after the fourth quarter', () => {
        scene.quarter = 4;

        scene.endQuarter();

        expect(scene.quarterText.text).toBe('FINAL');
        // The clock must not roll over into a fifth quarter.
        expect(scene.quarter).toBe(4);
    });
});
