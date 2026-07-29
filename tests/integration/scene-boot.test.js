// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { StandardGameScene } from '../../src/game/scenes/StandardGameScene.js';
import { getAllPlayers, getHomePlayers, getAwayPlayers } from '../../src/game/helpers.js';

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
