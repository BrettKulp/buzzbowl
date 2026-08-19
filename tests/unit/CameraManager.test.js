import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
    default: {
        Math: {
            Clamp: (val, min, max) => Math.min(Math.max(val, min), max),
            Linear: (a, b, t) => a + (b - a) * t,
        },
    },
}));

vi.mock('../../src/game/logger.js', () => ({
    log: vi.fn(),
}));

const mockGetBallCarrierX = vi.fn();
vi.mock('../../src/game/helpers.js', () => ({
    getBallCarrierX: (...args) => mockGetBallCarrierX(...args),
}));

import { CameraManager } from '../../src/game/CameraManager.js';

function makeFakeCamera() {
    return {
        scrollX: 0,
        scrollY: 0,
        width: 1600,
        height: 900,
        centerX: 800,
        centerY: 450,
        centerOn: vi.fn(),
    };
}

function makeFakeGame(overrides = {}) {
    return {
        playStarted: false,
        playPaused: false,
        cameraCenteredOnBallCarrierPreSnap: false,
        offenseMovingRight: true,
        camera: makeFakeCamera(),
        passManager: {
            ballInFlight: vi.fn(() => false),
            ball: { x: 500 },
        },
        ...overrides,
    };
}

describe('CameraManager', () => {
    beforeEach(() => {
        mockGetBallCarrierX.mockReset();
    });

    describe('updateCameraPosition', () => {
        it('skips update when playPaused and not overriding', () => {
            const game = makeFakeGame({ playPaused: true });
            const cam = new CameraManager(game);

            cam.updateCameraPosition();

            expect(game.camera.centerOn).not.toHaveBeenCalled();
        });

        it('does update when playPaused but overridePlayStartedCheck is true', () => {
            mockGetBallCarrierX.mockReturnValue(700);
            const game = makeFakeGame({ playPaused: true });
            const cam = new CameraManager(game);

            cam.updateCameraPosition(true);

            expect(game.camera.centerOn).toHaveBeenCalled();
            expect(game.cameraCenteredOnBallCarrierPreSnap).toBe(true);
        });

        it('instant center on override (nextPlay path)', () => {
            mockGetBallCarrierX.mockReturnValue(700);
            const game = makeFakeGame({ playStarted: false });
            const cam = new CameraManager(game);

            cam.updateCameraPosition(true);

            expect(game.cameraCenteredOnBallCarrierPreSnap).toBe(true);
            expect(game.camera.centerOn).toHaveBeenCalled();
            const [x] = game.camera.centerOn.mock.calls[0];
            expect(x).toBe(700);
        });

        it('skips when play not started and already centered pre-snap', () => {
            mockGetBallCarrierX.mockReturnValue(700);
            const game = makeFakeGame({
                playStarted: false,
                cameraCenteredOnBallCarrierPreSnap: true,
            });
            const cam = new CameraManager(game);

            cam.updateCameraPosition();

            expect(game.camera.centerOn).not.toHaveBeenCalled();
        });

        it('lerps toward ball carrier when play is running', () => {
            mockGetBallCarrierX.mockReturnValue(800);
            const game = makeFakeGame({ playStarted: true, playPaused: false });
            const cam = new CameraManager(game);

            cam.updateCameraPosition();

            expect(game.camera.centerOn).toHaveBeenCalled();
            const [newX] = game.camera.centerOn.mock.calls[0];
            expect(newX).toBeGreaterThanOrEqual(600);
            expect(newX).toBeLessThanOrEqual(1000);
        });

        it('follows in-flight ball instead of ball carrier', () => {
            mockGetBallCarrierX.mockReturnValue(600);
            const game = makeFakeGame({ playStarted: true, playPaused: false });
            game.passManager.ballInFlight.mockReturnValue(true);
            game.passManager.ball.x = 900;
            const cam = new CameraManager(game);

            cam.updateCameraPosition();

            expect(game.camera.centerOn).toHaveBeenCalled();
        });
    });

    describe('instantCenterOn', () => {
        it('clamps x to field bounds', () => {
            const game = makeFakeGame();
            const cam = new CameraManager(game);

            cam.instantCenterOn(200);
            expect(game.camera.centerOn).toHaveBeenCalledWith(600, 450);

            game.camera.centerOn.mockClear();
            cam.instantCenterOn(1500);
            expect(game.camera.centerOn).toHaveBeenCalledWith(1000, 450);
        });

        it('does nothing when x is falsy', () => {
            const game = makeFakeGame();
            const cam = new CameraManager(game);

            cam.instantCenterOn(null);
            expect(game.camera.centerOn).not.toHaveBeenCalled();
        });
    });

    describe('setCameraPosition', () => {
        it('clamps target to field bounds', () => {
            const game = makeFakeGame();
            const cam = new CameraManager(game);

            cam.setCameraPosition(200);
            const [newX] = game.camera.centerOn.mock.calls[0];
            expect(newX).toBeGreaterThanOrEqual(600);

            game.camera.centerOn.mockClear();
            cam.setCameraPosition(1500);
            const [clampedX] = game.camera.centerOn.mock.calls[0];
            expect(clampedX).toBeLessThanOrEqual(1000);
        });

        it('lerps toward target', () => {
            const game = makeFakeGame();
            game.camera.scrollX = 0;
            const cam = new CameraManager(game);

            cam.setCameraPosition(800);
            const [newX] = game.camera.centerOn.mock.calls[0];
            expect(newX).toBe(800);
        });

        it('does nothing when x is falsy', () => {
            const game = makeFakeGame();
            const cam = new CameraManager(game);

            cam.setCameraPosition(null);
            expect(game.camera.centerOn).not.toHaveBeenCalled();
        });
    });
});
