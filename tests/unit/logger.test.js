import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The logger reads configLoader at module load, so each test re-imports it with a fresh
// mock config. `vi.doMock` (not hoisted) is applied right before the dynamic import.
const mockConfig = { debug: { enabled: false, categories: {} } };

async function importLogger() {
    vi.resetModules();
    vi.doMock('../../src/game/configLoader.js', () => ({ default: mockConfig }));
    return import('../../src/game/logger.js');
}

describe('logger gating', () => {
    let consoleLog;
    let consoleWarn;
    let consoleError;

    beforeEach(() => {
        consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('error() and warn() still emit when debug is disabled', async () => {
        mockConfig.debug = { enabled: false, categories: {} };
        const logger = await importLogger();

        logger.error('boom');
        expect(consoleError).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalledWith('[ERROR]', 'boom');

        logger.warn('careful');
        expect(consoleWarn).toHaveBeenCalledTimes(1);
        expect(consoleWarn).toHaveBeenCalledWith('[WARN]', 'careful');

        logger.log('play', 'snap');
        expect(consoleLog).not.toHaveBeenCalled();
    });

    it('a category set to false stays silent while its neighbor logs', async () => {
        mockConfig.debug = { enabled: true, categories: { play: false, stuck: true } };
        const logger = await importLogger();

        logger.log('play', 'snap');
        logger.log('stuck', 'motionless');
        expect(consoleLog).toHaveBeenCalledTimes(1);
        expect(consoleLog).toHaveBeenCalledWith('[DEBUG:stuck]', 'motionless');
    });

    it('an unknown category defaults to off', async () => {
        mockConfig.debug = { enabled: true, categories: {} };
        const logger = await importLogger();

        logger.log('typoCategory', 'x');
        expect(consoleLog).not.toHaveBeenCalled();
    });
});
