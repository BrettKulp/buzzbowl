import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, hasSave, clearSave } from '../../src/game/saveGame.js';

function makeFakeScene(overrides = {}) {
    return {
        scene: { key: 'StandardGame' },
        lineOfScrimmage: { x: 603 },
        firstDownMarker: { x: 735 },
        possession: 'Home',
        down: 1,
        homeScore: 0,
        awayScore: 0,
        offenseMovingRight: true,
        targetEndzone: 'Right',
        formation: 'I',
        defensiveFormation: '4-3',
        playType: 'Run',
        ...overrides,
    };
}

beforeEach(() => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
    };
});

describe('saveGame round-trip', () => {
    it('restores every saved field, including nested LOS/first-down x', () => {
        const saved = makeFakeScene({
            down: 3, homeScore: 14, awayScore: 7, possession: 'Away',
            formation: 'Gun', defensiveFormation: 'Dime', playType: 'Pass',
            offenseMovingRight: false, targetEndzone: 'Left',
            lineOfScrimmage: { x: 900 }, firstDownMarker: { x: 1030 },
        });
        saveGame(saved);

        const restored = makeFakeScene();
        expect(loadGame(restored)).toBe(true);

        expect(restored.down).toBe(3);
        expect(restored.homeScore).toBe(14);
        expect(restored.awayScore).toBe(7);
        expect(restored.possession).toBe('Away');
        expect(restored.formation).toBe('Gun');
        expect(restored.defensiveFormation).toBe('Dime');
        expect(restored.playType).toBe('Pass');
        expect(restored.offenseMovingRight).toBe(false);
        expect(restored.targetEndzone).toBe('Left');
        expect(restored.lineOfScrimmage.x).toBe(900);
        expect(restored.firstDownMarker.x).toBe(1030);
    });

    it('round-trips a scene with no quarter/gameClock (FreePlay shape) without writing undefined', () => {
        const scene = makeFakeScene();
        scene.scene.key = 'FreePlay';
        saveGame(scene);

        const raw = JSON.parse(localStorage.getItem('buzzbowl:save:FreePlay'));
        expect('quarter' in raw).toBe(false);
        expect('gameClock' in raw).toBe(false);

        const restored = makeFakeScene();
        restored.scene.key = 'FreePlay';
        expect(loadGame(restored)).toBe(true);
        expect(restored.quarter).toBeUndefined();
    });

    it('saves and restores quarter/gameClock for StandardGame shape', () => {
        const scene = makeFakeScene({ quarter: 3, gameClock: 42.5 });
        saveGame(scene);

        const restored = makeFakeScene();
        loadGame(restored);
        expect(restored.quarter).toBe(3);
        expect(restored.gameClock).toBe(42.5);
    });
});

describe('saveGame validation', () => {
    it('rejects corrupt JSON without throwing', () => {
        localStorage.setItem('buzzbowl:save:StandardGame', '{not json');
        expect(loadGame(makeFakeScene())).toBe(false);
        expect(hasSave('StandardGame')).toBe(false);
    });

    it('rejects a save with a mismatched version', () => {
        saveGame(makeFakeScene());
        const raw = JSON.parse(localStorage.getItem('buzzbowl:save:StandardGame'));
        raw.v = 999;
        localStorage.setItem('buzzbowl:save:StandardGame', JSON.stringify(raw));

        expect(hasSave('StandardGame')).toBe(false);
        expect(loadGame(makeFakeScene())).toBe(false);
    });

    it('rejects a formation value that is not in config.json', () => {
        saveGame(makeFakeScene({ formation: 'Gun' }));
        const raw = JSON.parse(localStorage.getItem('buzzbowl:save:StandardGame'));
        raw.formation = 'NotARealFormation';
        localStorage.setItem('buzzbowl:save:StandardGame', JSON.stringify(raw));

        expect(hasSave('StandardGame')).toBe(false);
        expect(loadGame(makeFakeScene())).toBe(false);
    });

    it('hasSave and loadGame never disagree', () => {
        expect(hasSave('StandardGame')).toBe(false);
        saveGame(makeFakeScene());
        expect(hasSave('StandardGame')).toBe(true);
        expect(loadGame(makeFakeScene())).toBe(true);
    });
});

describe('clearSave', () => {
    it('removes the save so hasSave and loadGame both go false', () => {
        saveGame(makeFakeScene());
        expect(hasSave('StandardGame')).toBe(true);

        clearSave(makeFakeScene());
        expect(hasSave('StandardGame')).toBe(false);
        expect(loadGame(makeFakeScene())).toBe(false);
    });
});

describe('pending possession change on resume', () => {
    it('applies possession flip when save has scored=true (touchdown deferred)', () => {
        saveGame(makeFakeScene({
            possession: 'Home', targetEndzone: 'Right', offenseMovingRight: true,
            down: 2, scored: true, turnoverOnDowns: false,
        }));

        const loaded = makeFakeScene({ scored: false, turnoverOnDowns: false });
        loadGame(loaded);

        expect(loaded.possession).toBe('Away');
        expect(loaded.targetEndzone).toBe('Left');
        expect(loaded.offenseMovingRight).toBe(false);
        expect(loaded.down).toBe(1);
        expect(loaded.scored).toBe(false);
    });

    it('applies possession flip when save has turnoverOnDowns=true (turnover deferred)', () => {
        saveGame(makeFakeScene({
            possession: 'Home', targetEndzone: 'Right', offenseMovingRight: true,
            down: 1, scored: false, turnoverOnDowns: true,
            lineOfScrimmage: { x: 430 }, firstDownMarker: { x: 900 },
        }));

        const loaded = makeFakeScene({ scored: false, turnoverOnDowns: false });
        loadGame(loaded);

        expect(loaded.possession).toBe('Away');
        expect(loaded.targetEndzone).toBe('Left');
        expect(loaded.offenseMovingRight).toBe(false);
        expect(loaded.down).toBe(1);
        expect(loaded.lineOfScrimmage.x).toBe(430);
        expect(loaded.turnoverOnDowns).toBe(false);
    });

    it('does nothing for a normal save with no pending flags', () => {
        saveGame(makeFakeScene({
            possession: 'Away', targetEndzone: 'Left', offenseMovingRight: false,
            down: 2,
        }));

        const loaded = makeFakeScene();
        loadGame(loaded);

        expect(loaded.possession).toBe('Away');
        expect(loaded.down).toBe(2);
    });
});
