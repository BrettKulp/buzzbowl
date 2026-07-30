import config from "./configLoader.js";
import { warn } from "./logger";

const VERSION = 1;

const KEYS = [
    "possession", "down", "homeScore", "awayScore",
    "offenseMovingRight", "targetEndzone",
    "formation", "defensiveFormation", "playType",
    "quarter", "gameClock",
];

const VALID = {
    possession: ["Home", "Away"],
    playType: ["Run", "Pass"],
};

const storageKey = (sceneKey) => `buzzbowl:save:${sceneKey}`;

function isValid(data) {
    if (!data || data.v !== VERSION) return false;
    for (const [key, allowed] of Object.entries(VALID)) {
        if (key in data && !allowed.includes(data[key])) return false;
    }
    if ("formation" in data && !(data.formation in config.formations.offense)) return false;
    if ("defensiveFormation" in data && !(data.defensiveFormation in config.formations.defense)) return false;
    return true;
}

function readSave(sceneKey) {
    try {
        const raw = localStorage.getItem(storageKey(sceneKey));
        if (!raw) return null;
        const data = JSON.parse(raw);
        return isValid(data) ? data : null;
    } catch (e) {
        warn("Ignoring unreadable save:", e);
        return null;
    }
}

export function saveGame(scene) {
    const data = { v: VERSION, losX: scene.lineOfScrimmage.x, firstDownX: scene.firstDownMarker.x };
    for (const key of KEYS) {
        if (scene[key] !== undefined) data[key] = scene[key];
    }
    try {
        localStorage.setItem(storageKey(scene.scene.key), JSON.stringify(data));
    } catch (e) {
        warn("Could not save game:", e);
    }
}

export function loadGame(scene) {
    const data = readSave(scene.scene.key);
    if (!data) return false;

    for (const key of KEYS) {
        if (data[key] !== undefined) scene[key] = data[key];
    }
    scene.lineOfScrimmage.x = data.losX;
    scene.firstDownMarker.x = data.firstDownX;
    return true;
}

export function hasSave(sceneKey) {
    return readSave(sceneKey) !== null;
}

export function clearSave(scene) {
    try {
        localStorage.removeItem(storageKey(scene.scene.key));
    } catch (e) {
        warn("Could not clear save:", e);
    }
}
