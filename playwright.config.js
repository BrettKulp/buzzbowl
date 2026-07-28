import { defineConfig, devices } from '@playwright/test';

// A dedicated port, deliberately clear of Vite's default. vite.config.js sets no `server`
// block, so `npm run dev` silently walks upward from 5173 when ports are busy -- which
// would leave Playwright either waiting on a URL nothing is bound to, or driving an
// unrelated dev server. Sitting 100 ports away keeps that walk from ever reaching us, and
// --strictPort turns a clash into a loud failure instead of a silent redirect.
const PORT = 5273;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['html'], ['list']] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
