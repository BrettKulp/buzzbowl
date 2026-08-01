import { describe, it, expect, beforeEach } from 'vitest';
import { saveSettings, loadSettings, saveTeamColors, loadTeamColors } from '../../src/game/gameSettings.js';
import config from '../../src/game/configLoader.js';

beforeEach(() => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
    };
});

describe('gameSettings round-trip', () => {
    it('returns null when nothing has been saved', () => {
        expect(loadSettings()).toBeNull();
    });

    it('restores every saved setting', () => {
        saveSettings({
            quarterMode: 'plays', quarterLength: 90, quarterPlayCount: 8,
            stuckTimeoutEnabled: false, stuckTimeoutSeconds: 10,
            stuckBackwardEnabled: true, stuckBackwardYards: 8,
        });

        const loaded = loadSettings();
        expect(loaded.quarterMode).toBe('plays');
        expect(loaded.quarterLength).toBe(90);
        expect(loaded.quarterPlayCount).toBe(8);
        expect(loaded.stuckTimeoutEnabled).toBe(false);
        expect(loaded.stuckTimeoutSeconds).toBe(10);
        expect(loaded.stuckBackwardEnabled).toBe(true);
        expect(loaded.stuckBackwardYards).toBe(8);
    });

    it('does not write settings unless saveSettings is called (no auto-persist)', () => {
        expect(localStorage.getItem('buzzbowl:settings:StandardGame')).toBeNull();
    });
});

describe('gameSettings validation', () => {
    it('rejects corrupt JSON without throwing', () => {
        localStorage.setItem('buzzbowl:settings:StandardGame', '{not json');
        expect(loadSettings()).toBeNull();
    });

    it('rejects a mismatched version', () => {
        saveSettings({ quarterMode: 'time' });
        const raw = JSON.parse(localStorage.getItem('buzzbowl:settings:StandardGame'));
        raw.v = 999;
        localStorage.setItem('buzzbowl:settings:StandardGame', JSON.stringify(raw));

        expect(loadSettings()).toBeNull();
    });

    it('rejects a quarterMode value outside time/plays', () => {
        saveSettings({ quarterMode: 'time' });
        const raw = JSON.parse(localStorage.getItem('buzzbowl:settings:StandardGame'));
        raw.quarterMode = 'NotARealMode';
        localStorage.setItem('buzzbowl:settings:StandardGame', JSON.stringify(raw));

        expect(loadSettings()).toBeNull();
    });

    it('rejects numeric fields outside their configured bounds', () => {
        saveSettings({ quarterLength: config.standardGame.quarterLengthSeconds.default });
        const raw = JSON.parse(localStorage.getItem('buzzbowl:settings:StandardGame'));
        raw.quarterLength = config.standardGame.quarterLengthSeconds.max + 1000;
        localStorage.setItem('buzzbowl:settings:StandardGame', JSON.stringify(raw));

        expect(loadSettings()).toBeNull();
    });
});

describe('team colors round-trip', () => {
    // Kept in a separate storage bucket from the Standard-Game settings above, since colors
    // apply to Free Play too.
    it('returns null when nothing has been saved', () => {
        expect(loadTeamColors()).toBeNull();
    });

    it('restores saved colors', () => {
        const [, navy] = Object.entries(config.teamColorPalette)[0];
        const [, black] = Object.entries(config.teamColorPalette)[1];
        saveTeamColors({ homeColor: navy, awayColor: black });

        const loaded = loadTeamColors();
        expect(loaded.homeColor).toBe(navy);
        expect(loaded.awayColor).toBe(black);
    });

    it('does not write until saveTeamColors is called (no auto-persist)', () => {
        expect(localStorage.getItem('buzzbowl:settings:TeamColors')).toBeNull();
    });

    it('does not collide with the Standard Game settings bucket', () => {
        saveSettings({ quarterMode: 'plays' });
        expect(loadTeamColors()).toBeNull();
    });
});

describe('team colors validation', () => {
    it('rejects a color not in the configured palette', () => {
        const [, navy] = Object.entries(config.teamColorPalette)[0];
        saveTeamColors({ homeColor: navy });
        const raw = JSON.parse(localStorage.getItem('buzzbowl:settings:TeamColors'));
        raw.homeColor = 0x123456;
        localStorage.setItem('buzzbowl:settings:TeamColors', JSON.stringify(raw));

        expect(loadTeamColors()).toBeNull();
    });

    it('rejects corrupt JSON without throwing', () => {
        localStorage.setItem('buzzbowl:settings:TeamColors', '{not json');
        expect(loadTeamColors()).toBeNull();
    });
});
