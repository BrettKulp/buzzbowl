// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { StandardGameScene } from '../../src/game/scenes/StandardGameScene.js';
import { getAllPlayers, getHomePlayers, getAwayPlayers, yardsToPixels } from '../../src/game/helpers.js';
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

    // Same delegation convention as handleTackle above -- this proves checkStuckBallCarrier is
    // wired from the scene through to the play state manager, not that the stuck rule itself
    // is correct (the unit tests own that).
    it('routes checkStuckBallCarrier through to the play state manager', () => {
        scene.stuckTimeoutEnabled = true;
        scene.stuckTimeoutSeconds = 6;
        scene.stuckBackwardEnabled = false;
        scene.lineOfScrimmage.x = 600;
        scene.firstDownMarker.x = 900;

        scene.startPlay();
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);
        ballCarrier.x = 650;
        scene.checkStuckBallCarrier(ballCarrier); // anchors the still-timer at x=650

        scene.time.now += 6000;
        scene.checkStuckBallCarrier(ballCarrier);

        expect(scene.down).toBe(2);
        expect(scene.lineOfScrimmage.x).toBe(680);
    });
});

describe('stuck ball carrier via a real update() tick', () => {
    it('ends the play once the carrier drifts back past the configured yards', () => {
        scene.stuckTimeoutEnabled = false;
        scene.stuckBackwardEnabled = true;
        scene.stuckBackwardYards = 5;
        scene.possession = 'Home';
        scene.targetEndzone = 'Right';
        scene.lineOfScrimmage.x = 600;
        scene.firstDownMarker.x = 900;

        scene.startPlay();
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);

        ballCarrier.x = 650;
        scene.update(0, 16);
        expect(scene.scored).toBe(false);

        const thresholdPx = yardsToPixels(5);
        ballCarrier.x = 650 - thresholdPx;
        scene.update(16, 16);

        expect(scene.down).toBe(2);
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

describe('touchdown at the goal line', () => {
    // The bug in #8/#17: the old touchdown trigger points were hardcoded numbers that
    // weren't actually symmetric to their own goal lines (left was 9px past its line, right
    // only 1px off), so the "fires early" bug was obvious on the left and easy to miss on
    // the right. leftGoalLineX/rightGoalLineX are now derived from one formula and shared by
    // both the Matter end zone sensor and update()'s position-based backstop below -- this
    // doesn't exercise the Matter sensor itself (that needs a physics step this harness
    // doesn't do), but since both trigger points read from these same values, pinning them
    // here still catches the actual regression: the two goal lines drifting out of sync.
    it('exposes the same goal-line x for both end zones the sensors were built from', () => {
        expect(scene.leftGoalLineX).toBe(135);
        expect(scene.rightGoalLineX).toBe(1455);
    });

    it('scores a touchdown once the ball carrier passes the right goal line, not before', () => {
        scene.possession = 'Home';
        scene.targetEndzone = 'Right';
        scene.startPlay();
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);

        ballCarrier.x = scene.rightGoalLineX;
        scene.update(0, 16);
        expect(scene.scored).toBe(false);

        ballCarrier.x = scene.rightGoalLineX + 1;
        scene.update(16, 16);
        expect(scene.scored).toBe(true);
    });

    it('scores a touchdown once the ball carrier passes the left goal line, not before', () => {
        scene.possession = 'Home';
        scene.targetEndzone = 'Left';
        scene.startPlay();
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);

        ballCarrier.x = scene.leftGoalLineX;
        scene.update(0, 16);
        expect(scene.scored).toBe(false);

        ballCarrier.x = scene.leftGoalLineX - 1;
        scene.update(16, 16);
        expect(scene.scored).toBe(true);
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

    // Normal tackles save the play result immediately so a refresh during the
    // end-of-play popup preserves down/LOS progress.
    it('saves play result on a normal tackle', () => {
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

    // Turnover on downs also saves immediately, but the possession change is
    // deferred to nextPlay. On resume, loadGame detects the saved
    // turnoverOnDowns flag and applies the pending change.
    it('saves on a tackle that causes a turnover on downs and resolves possession on resume', () => {
        scene.possession = 'Home';
        scene.down = 4;
        scene.offenseMovingRight = true;
        scene.targetEndzone = 'Right';
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);
        scene.lineOfScrimmage.x = 600;
        scene.firstDownMarker.x = 900;
        ballCarrier.x = 400;

        scene.handleTackle(ballCarrier, null, 'Tackle');

        expect(scene.turnoverOnDowns).toBe(true);
        expect(hasSave('StandardGame')).toBe(true);

        const reloaded = {
            scene: { key: 'StandardGame' },
            lineOfScrimmage: {},
            firstDownMarker: {},
            possession: 'Home',
            targetEndzone: 'Right',
            offenseMovingRight: true,
            down: 1,
        };
        loadGame(reloaded);
        expect(reloaded.possession).toBe('Away');
        expect(reloaded.down).toBe(1);
    });

    // After nextPlay resolves the deferred possession change, the save
    // always captures a fully-consistent state with no pending flags.
    it('saves on nextPlay with consistent state', () => {
        const ballCarrier = getAllPlayers(scene).find((p) => p.hasBall);
        scene.lineOfScrimmage.x = 600;
        scene.firstDownMarker.x = 900;
        ballCarrier.x = 650;

        scene.handleTackle(ballCarrier, null, 'Tackle');
        scene.nextPlay();

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

describe('quarter modes', () => {
    it('ends the quarter after the configured number of plays, not by the clock', () => {
        scene.quarterMode = 'plays';
        scene.quarterPlayCount = 3;
        scene.playsThisQuarter = 0;
        scene.quarter = 1;
        scene.stuckTimeoutEnabled = false;
        scene.stuckBackwardEnabled = false;
        const clockAtStart = scene.gameClock;

        scene.startPlay();
        scene.update(0, 5000); // even with a play live, the clock must not move in play-count mode
        expect(scene.gameClock).toBe(clockAtStart);
        scene.nextPlay();
        expect(scene.quarter).toBe(1);

        scene.startPlay();
        scene.nextPlay();
        expect(scene.quarter).toBe(1);

        scene.startPlay();
        scene.nextPlay();
        expect(scene.quarter).toBe(2);

        expect(scene.gameClock).toBe(clockAtStart);
    });
});
