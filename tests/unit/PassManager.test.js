import { describe, it, expect } from 'vitest';
import { aimToTarget, findPassOutcome } from '../../src/game/PassManager.js';
import config from '../../src/game/configLoader.js';

const tuning = config.passing;
const wideBounds = { left: -10000, right: 10000, top: -10000, bottom: 10000 };

describe('aimToTarget', () => {
    it('projects the target forward of the QB on a backward drag', () => {
        const origin = { x: 500, y: 450 };
        // Drag left (away from the intended throw direction) -- the throw must land to the right.
        const target = aimToTarget(origin, origin.x - 50, origin.y, wideBounds, tuning);

        expect(target).not.toBeNull();
        expect(target.x).toBeGreaterThan(origin.x);
        expect(target.y).toBeCloseTo(origin.y);
    });

    it('scales throw distance with drag distance, clamped at maxRangePixels', () => {
        const origin = { x: 500, y: 450 };

        const shortDrag = 50;
        const short = aimToTarget(origin, origin.x - shortDrag, origin.y, wideBounds, tuning);
        expect(Math.abs(short.x - origin.x)).toBeCloseTo(shortDrag * tuning.dragToDistanceMultiplier);

        const hugeDrag = aimToTarget(origin, origin.x - 10000, origin.y, wideBounds, tuning);
        expect(Math.abs(hugeDrag.x - origin.x)).toBeCloseTo(tuning.maxRangePixels);
    });

    it('clamps the landing spot inside the field rect', () => {
        const origin = { x: 500, y: 450 };
        const tightBounds = { left: 490, right: 510, top: 440, bottom: 460 };

        const target = aimToTarget(origin, origin.x - 200, origin.y, tightBounds, tuning);

        expect(target.x).toBe(tightBounds.right);
        expect(target.y).toBeGreaterThanOrEqual(tightBounds.top);
        expect(target.y).toBeLessThanOrEqual(tightBounds.bottom);
    });

    it('returns null for a drag under minDragPixels, so a click cannot commit a lob', () => {
        const origin = { x: 500, y: 450 };
        const target = aimToTarget(origin, origin.x - (tuning.minDragPixels - 1), origin.y, wideBounds, tuning);
        expect(target).toBeNull();
    });
});

describe('findPassOutcome', () => {
    const receiver = (overrides) => ({ team: 'Home', canReceivePass: true, ...overrides });

    it('gives the catch to the nearest eligible receiver inside the radius', () => {
        const players = [
            receiver({ id: 'near', x: 500, y: 450 + 5 }),
            receiver({ id: 'far', x: 500, y: 450 + tuning.catchRadiusPixels - 5 }),
        ];

        const result = findPassOutcome({ x: 500, y: 450 }, players, {
            catchRadiusPixels: tuning.catchRadiusPixels,
            possession: 'Home',
        });

        expect(result.outcome).toBe('Catch');
        expect(result.player.id).toBe('near');
    });

    it('rules an interception when a defender is nearer than any receiver', () => {
        const players = [
            receiver({ id: 'receiver', team: 'Home', x: 500, y: 450 + 20 }),
            { id: 'defender', team: 'Away', canReceivePass: false, x: 500, y: 450 + 5 },
        ];

        const result = findPassOutcome({ x: 500, y: 450 }, players, {
            catchRadiusPixels: tuning.catchRadiusPixels,
            possession: 'Home',
        });

        expect(result.outcome).toBe('Interception');
        expect(result.player.id).toBe('defender');
    });

    it('is incomplete when nobody is within the catch radius', () => {
        const players = [
            receiver({ id: 'receiver', x: 500, y: 450 + tuning.catchRadiusPixels + 1 }),
        ];

        const result = findPassOutcome({ x: 500, y: 450 }, players, {
            catchRadiusPixels: tuning.catchRadiusPixels,
            possession: 'Home',
        });

        expect(result.outcome).toBe('Incomplete');
        expect(result.player).toBeNull();
    });

    it('never lets an ineligible offensive player (OL, QB) catch the ball', () => {
        const players = [
            { id: 'ol', team: 'Home', canReceivePass: false, x: 500, y: 450 },
            { id: 'qb', team: 'Home', canReceivePass: false, x: 500, y: 450 + 2 },
        ];

        const result = findPassOutcome({ x: 500, y: 450 }, players, {
            catchRadiusPixels: tuning.catchRadiusPixels,
            possession: 'Home',
        });

        expect(result.outcome).toBe('Incomplete');
        expect(result.player).toBeNull();
    });
});
