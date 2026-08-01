import { describe, it, expect } from 'vitest';
import config from '../../src/game/configLoader.js';

const offenseFormations = Object.entries(config.formations.offense);
const defenseFormations = Object.entries(config.formations.defense);
const allFormations = [...offenseFormations, ...defenseFormations];

const playerIds = Array.from({ length: 22 }, (_, i) => i + 1);

describe('config.json formations', () => {
    // createPlayers() builds one map keyed by player id from the offensive formation and
    // another from the defensive one, then reads BOTH off every id 1-22. An id that only
    // one side defines throws a bare TypeError during scene boot.
    it('gives every player id 1-22 both an offensive and a defensive position', () => {
        for (const [offenseName, offense] of offenseFormations) {
            for (const [defenseName, defense] of defenseFormations) {
                const assigned = {};
                for (const [posName, pos] of Object.entries(offense.positions)) {
                    assigned[pos.homePlayerId] = { ...assigned[pos.homePlayerId], offense: posName };
                    assigned[pos.awayPlayerId] = { ...assigned[pos.awayPlayerId], offense: posName };
                }
                for (const [posName, pos] of Object.entries(defense.positions)) {
                    assigned[pos.homePlayerId] = { ...assigned[pos.homePlayerId], defense: posName };
                    assigned[pos.awayPlayerId] = { ...assigned[pos.awayPlayerId], defense: posName };
                }

                const incomplete = playerIds.filter(
                    (id) => !assigned[id] || !assigned[id].offense || !assigned[id].defense
                );
                expect(incomplete, `${offenseName} + ${defenseName} leaves ids unassigned`).toEqual([]);
            }
        }
    });

    it('assigns home ids 1-11 and away ids 12-22 exactly once per formation', () => {
        for (const [name, formation] of allFormations) {
            const positions = Object.values(formation.positions);
            const home = positions.map((p) => p.homePlayerId).sort((a, b) => a - b);
            const away = positions.map((p) => p.awayPlayerId).sort((a, b) => a - b);

            expect(home, `${name} home ids`).toEqual(playerIds.slice(0, 11));
            expect(away, `${name} away ids`).toEqual(playerIds.slice(11));
        }
    });

    // A ballCarrier typo means nobody holds the ball and the play is unwinnable, silently.
    it('names a ballCarrier that exists in the same formation', () => {
        for (const [name, formation] of offenseFormations) {
            expect(Object.keys(formation.positions), `${name} ballCarrier`).toContain(
                formation.ballCarrier
            );
        }
    });

    // A backedUp typo silently disables the goal-line crowding fix.
    it('keys every backedUp override to a real position', () => {
        for (const [name, formation] of allFormations) {
            const positions = Object.keys(formation.positions);
            for (const key of Object.keys(formation.backedUp ?? {})) {
                expect(positions, `${name} backedUp.${key}`).toContain(key);
            }
        }
    });

    // A canReceivePass typo means that receiver can never be thrown to, which reads as a
    // gameplay quirk rather than a bug.
    it('lists only real offensive positions in players.canReceivePass', () => {
        const everyOffensivePosition = new Set(
            offenseFormations.flatMap(([, f]) => Object.keys(f.positions))
        );
        for (const position of config.players.canReceivePass) {
            expect([...everyOffensivePosition], 'canReceivePass').toContain(position);
        }
    });
});

describe('config.json standardGame bounds', () => {
    // The config screen cycles these values by `step` between `min` and `max`; a bad bound
    // would make the screen's default unreachable or its step a no-op.
    const numericBounds = {
        quarterLengthSeconds: config.standardGame.quarterLengthSeconds,
        quarterPlayCount: config.standardGame.quarterPlayCount,
        stuckTimeout: config.standardGame.stuckTimeout,
        stuckBackwardDrift: config.standardGame.stuckBackwardDrift,
    };

    it('keeps default within [min, max] and step positive for every tunable setting', () => {
        for (const [name, bounds] of Object.entries(numericBounds)) {
            expect(bounds.default, `${name}.default`).toBeGreaterThanOrEqual(bounds.min);
            expect(bounds.default, `${name}.default`).toBeLessThanOrEqual(bounds.max);
            expect(bounds.step, `${name}.step`).toBeGreaterThan(0);
        }
    });

    it('sets a valid initial quarterMode', () => {
        expect(['time', 'plays']).toContain(config.standardGame.quarterMode);
    });
});

describe('configLoader', () => {
    it('converts hex colors to integers without touching string arrays', () => {
        expect(config.colors.home).toBe(0x000088);
        expect(config.colors.ballCarrier).toBe(0xaa5511);
        for (const [name, value] of Object.entries(config.colors)) {
            expect(typeof value, `colors.${name}`).toBe('number');
        }

        // parseHexColors deliberately skips arrays; "simplifying" that guard would mangle
        // the receiver list into something Player.canReceivePass can never match.
        expect(config.players.canReceivePass.every((p) => typeof p === 'string')).toBe(true);
    });
});

describe('config.json teamColorPalette', () => {
    // teamColorPalette is a plain object (not an array) specifically so parseHexColors'
    // array-skipping guard (tested above) doesn't leave its hex strings unconverted.
    it('converts every palette entry to an integer', () => {
        for (const [name, value] of Object.entries(config.teamColorPalette)) {
            expect(typeof value, `teamColorPalette.${name}`).toBe('number');
        }
    });

    // The Preferences screen's default home/away selection must land on a real palette
    // entry, or its cycling selector would silently show the wrong name for the default color.
    it('includes the default home and away colors', () => {
        const paletteValues = Object.values(config.teamColorPalette);
        expect(paletteValues).toContain(config.colors.home);
        expect(paletteValues).toContain(config.colors.away);
    });
});
