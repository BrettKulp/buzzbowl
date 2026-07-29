import { describe, it, expect, vi } from 'vitest';
import { PlayStateManager } from '../../src/game/PlayStateManager.js';
import { makeFakeGame } from '../fakes/makeFakeGame.js';

function setup(overrides) {
    const game = makeFakeGame(overrides);
    return { game, plays: new PlayStateManager(game) };
}

describe('downs', () => {
    it('walks 1st through 4th', () => {
        const { game, plays } = setup();

        plays.incrementDown();
        expect(game.down).toBe(2);
        plays.incrementDown();
        expect(game.down).toBe(3);
        plays.incrementDown();
        expect(game.down).toBe(4);

        expect(game.scoreboard.updateDown).toHaveBeenLastCalledWith('4th');
        expect(game.turnoverOnDowns).toBe(false);
    });

    it('turns the ball over on downs after 4th', () => {
        const { game, plays } = setup({ down: 4 });

        plays.incrementDown();

        expect(game.down).toBe(1);
        expect(game.turnoverOnDowns).toBe(true);
    });
});

describe('scoring', () => {
    it('credits a touchdown to the team in possession', () => {
        const home = setup({ possession: 'Home' });
        home.plays.handleTouchdown();
        expect(home.game.homeScore).toBe(7);
        expect(home.game.awayScore).toBe(0);
        expect(home.game.scored).toBe(true);

        const away = setup({ possession: 'Away' });
        away.plays.handleTouchdown();
        expect(away.game.awayScore).toBe(7);
        expect(away.game.homeScore).toBe(0);
    });
});

describe('line of scrimmage after a tackle', () => {
    it('spots the ball 30px past the tackle toward the target endzone', () => {
        const right = setup({ targetEndzone: 'Right', lineOfScrimmage: losAt(600) });
        right.plays.handleNonTouchdown('700', 'Tackle');
        expect(right.game.lineOfScrimmage.x).toBe(730);

        // Driving Left the direction multiplier inverts; a sign error here moves the
        // offense backwards on every gain.
        const left = setup({ targetEndzone: 'Left', lineOfScrimmage: losAt(600) });
        left.plays.handleNonTouchdown('700', 'Tackle');
        expect(left.game.lineOfScrimmage.x).toBe(670);
    });

    it('clamps to the field at 145 and 1455', () => {
        const nearLeft = setup({ targetEndzone: 'Left', lineOfScrimmage: losAt(200) });
        nearLeft.plays.handleNonTouchdown('100', 'Tackle');
        expect(nearLeft.game.lineOfScrimmage.x).toBe(145);

        const nearRight = setup({ targetEndzone: 'Right', lineOfScrimmage: losAt(1400) });
        nearRight.plays.handleNonTouchdown('1450', 'Tackle');
        expect(nearRight.game.lineOfScrimmage.x).toBe(1455);
    });
});

describe('first downs', () => {
    it('resets the chains without spending a down when the marker is reached', () => {
        const { game, plays } = setup({
            targetEndzone: 'Right',
            lineOfScrimmage: losAt(600),
            firstDownMarker: { x: 700, marker: { updateX: () => {} } },
        });

        // Tackle at 690 spots the ball at 720, past the 700 marker.
        plays.handleNonTouchdown('690', 'Tackle');

        expect(game.down).toBe(1);
        expect(game.firstDownMarker.x).toBe(720 + 132 + 30);
    });

    it('spends a down when the ball is short of the marker', () => {
        const { game, plays } = setup({
            targetEndzone: 'Right',
            lineOfScrimmage: losAt(600),
            firstDownMarker: { x: 900, marker: { updateX: () => {} } },
        });

        plays.handleNonTouchdown('650', 'Tackle');

        expect(game.down).toBe(2);
        expect(game.firstDownMarker.x).toBe(900);
    });
});

describe('incomplete passes', () => {
    it('spends a down and leaves the ball where it was', () => {
        const { game, plays } = setup({ lineOfScrimmage: losAt(600) });

        plays.handleNonTouchdown(600, 'Incomplete');

        expect(game.down).toBe(2);
        expect(game.lineOfScrimmage.x).toBe(600);
        expect(game.lineOfScrimmage.marker.updateX).not.toHaveBeenCalled();
    });
});

describe('possession changes', () => {
    it('flips sides, resets the down and moves the ball back', () => {
        const { game, plays } = setup({ possession: 'Home', lineOfScrimmage: losAt(900), down: 3 });

        plays.changePossession();

        expect(game.possession).toBe('Away');
        expect(game.targetEndzone).toBe('Left');
        expect(game.offenseMovingRight).toBe(false);
        expect(game.down).toBe(1);
        expect(game.lineOfScrimmage.x).toBe(game.canvasWidth * 0.62);
        expect(game.firstDownMarker.x).toBe(game.canvasWidth * 0.62 - 132);
    });

    it('keeps field position on a turnover on downs', () => {
        const { game, plays } = setup({ possession: 'Home', lineOfScrimmage: losAt(900) });

        plays.changePossession(true);

        expect(game.possession).toBe('Away');
        expect(game.lineOfScrimmage.x).toBe(900);
        expect(game.firstDownMarker.x).toBe(900 - 132);
    });
});

function losAt(x) {
    return { x, previousX: null, marker: { updateX: vi.fn() } };
}
