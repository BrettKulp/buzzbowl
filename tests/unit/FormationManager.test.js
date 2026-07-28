import { describe, it, expect } from 'vitest';
import { FormationManager } from '../../src/game/FormationManager.js';
import config from '../../src/game/configLoader.js';
import { makeFakeGame, makeFakePlayer } from '../fakes/makeFakeGame.js';

// A full offensive roster for the home team plus one defender, so formation maths runs
// against the real config offsets rather than a single contrived player.
function makeRoster() {
    const offense = Object.keys(config.formations.offense.I.positions).map((position, i) =>
        makeFakePlayer({
            id: i + 1,
            team: 'Home',
            offensivePosition: position,
            defensivePosition: 'MLB',
            canReceivePass: config.players.canReceivePass.includes(position),
        })
    );
    const defender = makeFakePlayer({
        id: 12,
        team: 'Away',
        offensivePosition: 'RB',
        defensivePosition: 'MLB',
    });
    return [...offense, defender];
}

function setup(overrides) {
    const game = makeFakeGame({ players: makeRoster(), ...overrides });
    return { game, formations: new FormationManager(game) };
}

const findPlayer = (game, position) =>
    game.home.children.entries.find((p) => p.offensivePosition === position);

describe('formation offsets', () => {
    it('mirrors x offsets when the offense drives left', () => {
        const losX = 800;
        const { xOffset } = config.formations.offense.Gun.positions.QB;

        const right = setup({ targetEndzone: 'Right', lineOfScrimmage: losAt(losX) });
        right.formations.toggleOffensiveFormation(); // I -> Gun
        expect(findPlayer(right.game, 'QB').x).toBe(losX + xOffset);

        const left = setup({ targetEndzone: 'Left', lineOfScrimmage: losAt(losX) });
        left.formations.toggleOffensiveFormation();
        expect(findPlayer(left.game, 'QB').x).toBe(losX - xOffset);
    });

    // The backedUp overrides exist so the backfield doesn't spawn inside its own endzone.
    // Both the thresholds and their direction-dependence are easy to break silently.
    it('applies backedUp overrides only near the offense’s own goal line', () => {
        const backedUpRB = config.formations.offense.Gun.backedUp.RB;
        const normalRB = config.formations.offense.Gun.positions.RB;
        expect(backedUpRB.xOffset).not.toBe(normalRB.xOffset);

        const backedUp = setup({ targetEndzone: 'Right', lineOfScrimmage: losAt(200) });
        backedUp.formations.toggleOffensiveFormation();
        expect(findPlayer(backedUp.game, 'RB').x).toBe(200 + backedUpRB.xOffset);

        const midfield = setup({ targetEndzone: 'Right', lineOfScrimmage: losAt(800) });
        midfield.formations.toggleOffensiveFormation();
        expect(findPlayer(midfield.game, 'RB').x).toBe(800 + normalRB.xOffset);

        // Driving Left the band is at the other end of the field.
        const backedUpLeft = setup({ targetEndzone: 'Left', lineOfScrimmage: losAt(1400) });
        backedUpLeft.formations.toggleOffensiveFormation();
        expect(findPlayer(backedUpLeft.game, 'RB').x).toBe(1400 - backedUpRB.xOffset);
    });
});

describe('ball carrier', () => {
    it('hands off to the RB on a run and the QB on a pass', () => {
        const { game, formations } = setup({ playType: 'Run' });

        formations.togglePlayType(); // Run -> Pass
        expect(findPlayer(game, 'QB').hasBall).toBe(true);
        expect(findPlayer(game, 'RB').hasBall).toBe(false);

        formations.togglePlayType(); // Pass -> Run
        expect(findPlayer(game, 'RB').hasBall).toBe(true);
        expect(findPlayer(game, 'QB').hasBall).toBe(false);
    });

    // The same 22 player objects play offense and defense, each carrying both an
    // offensivePosition and a defensivePosition. hasBall leaking onto the defending team
    // is the resulting bug class.
    it('never gives the ball to the team without possession', () => {
        const { game, formations } = setup({ possession: 'Home', playType: 'Run' });
        const defender = game.away.children.entries[0];
        expect(defender.offensivePosition).toBe('RB'); // would qualify, if it were on offense

        formations.checkBallCarrier();

        expect(defender.hasBall).toBe(false);
        expect(findPlayer(game, 'RB').hasBall).toBe(true);
    });
});

function losAt(x) {
    return { x, previousX: null, marker: { updateX: () => {} } };
}
