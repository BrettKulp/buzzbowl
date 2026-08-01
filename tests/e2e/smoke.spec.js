import { test, expect } from '@playwright/test';

// The game is drawn entirely to a canvas, so there is no DOM to assert against. What
// these tests can prove is that it boots without erroring and that clicking through the
// menus actually changes what is on screen.

// React StrictMode double-mounts in dev, so Phaser boots twice and the first canvas is
// torn down. Take the surviving one.
//
// Not `.phaser-canvas`: PhaserGame.jsx tries to add that class immediately after
// StartGame(), but Phaser creates its canvas asynchronously, so the querySelector finds
// nothing and the class never lands. The app's own CSS targets `#game-container canvas`.
const canvasOf = (page) => page.locator('#game-container canvas').last();

/** Console errors and uncaught exceptions, collected for the life of the page. */
function watchForErrors(page) {
    const errors = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

async function openMenu(page) {
    const errors = watchForErrors(page);
    await page.goto('/');
    const canvas = canvasOf(page);
    await expect(canvas).toBeVisible();
    // Phaser needs a beat to boot and paint the menu.
    await expect(async () => {
        const box = await canvas.boundingBox();
        expect(box.width).toBeGreaterThan(0);
    }).toPass();
    await page.waitForTimeout(1000);
    return { canvas, errors };
}

test('loads the game without console errors', async ({ page }) => {
    const { canvas, errors } = await openMenu(page);

    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

test('starts a standard game from the menu', async ({ page }) => {
    const { canvas, errors } = await openMenu(page);
    const menuFrame = await canvas.screenshot();

    // Scale.FIT sizes the canvas element to the game's 1600x900 space, so the element
    // centre is the "Standard Game" button at (800, 450). It starts the game directly --
    // quarter/house-rule settings come from whatever's saved in Preferences, not a per-game
    // config screen.
    await canvas.click();
    await page.waitForTimeout(1500);

    const gameFrame = await canvas.screenshot();
    expect(gameFrame.equals(menuFrame)).toBe(false);
    expect(errors).toEqual([]);
});

test('opens Preferences from the main menu and returns', async ({ page }) => {
    const { canvas, errors } = await openMenu(page);
    const menuFrame = await canvas.screenshot();

    const box = await canvas.boundingBox();
    const atGameCoords = (x, y) => ({
        x: (x / 1600) * box.width,
        y: (y / 900) * box.height,
    });

    await canvas.click({ position: atGameCoords(800, 840) }); // Preferences
    await page.waitForTimeout(1000);
    const preferencesFrame = await canvas.screenshot();
    expect(preferencesFrame.equals(menuFrame)).toBe(false);

    await canvas.click({ position: atGameCoords(1500, 40) }); // Menu (back)
    await page.waitForTimeout(1000);
    const backAtMenuFrame = await canvas.screenshot();
    expect(backAtMenuFrame.equals(preferencesFrame)).toBe(false);
    expect(errors).toEqual([]);
});

// Both switchScene and the in-game Menu button go through `scene.start()`, which fully
// shuts down the outgoing scene and re-runs init/create on the target every time -- even if
// that scene was already running or previously left behind. Re-entering a scene this way is
// where leftover state (or listeners `shutdown` failed to tear down) would show up.
test('survives a round trip back through the menu into free play', async ({ page }) => {
    const { canvas, errors } = await openMenu(page);
    const menuFrame = await canvas.screenshot();

    await canvas.click(); // Standard Game
    await page.waitForTimeout(1500);
    const standardFrame = await canvas.screenshot();

    const box = await canvas.boundingBox();
    const atGameCoords = (x, y) => ({
        x: (x / 1600) * box.width,
        y: (y / 900) * box.height,
    });

    await canvas.click({ position: atGameCoords(1500, 40) }); // in-game Menu button
    await page.waitForTimeout(1000);
    const backAtMenuFrame = await canvas.screenshot();
    expect(backAtMenuFrame.equals(standardFrame)).toBe(false);

    await canvas.click({ position: atGameCoords(800, 610) }); // Free Play
    await page.waitForTimeout(1500);
    const freePlayFrame = await canvas.screenshot();

    // Differing from the menu alone would still pass if the Free Play click missed and we
    // were looking at the standard game. Both comparisons together pin down where we are.
    expect(freePlayFrame.equals(menuFrame)).toBe(false);
    expect(freePlayFrame.equals(standardFrame)).toBe(false);
    expect(errors).toEqual([]);
});
