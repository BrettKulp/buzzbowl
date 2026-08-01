import config from "./configLoader.js";
import { warn } from "./logger";

const VERSION = 1;
const STORAGE_KEY = "buzzbowl:settings:StandardGame";

const KEYS = [
    "quarterMode", "quarterLength", "quarterPlayCount",
    "stuckTimeoutEnabled", "stuckTimeoutSeconds",
    "stuckBackwardEnabled", "stuckBackwardYards",
];

const VALID = { quarterMode: ["time", "plays"] };

function inRange(value, { min, max }) {
    return value >= min && value <= max;
}

function isValid(data) {
    if (!data || data.v !== VERSION) return false;
    for (const [key, allowed] of Object.entries(VALID)) {
        if (key in data && !allowed.includes(data[key])) return false;
    }
    const sg = config.standardGame;
    if ("quarterLength" in data && !inRange(data.quarterLength, sg.quarterLengthSeconds)) return false;
    if ("quarterPlayCount" in data && !inRange(data.quarterPlayCount, sg.quarterPlayCount)) return false;
    if ("stuckTimeoutSeconds" in data && !inRange(data.stuckTimeoutSeconds, sg.stuckTimeout)) return false;
    if ("stuckBackwardYards" in data && !inRange(data.stuckBackwardYards, sg.stuckBackwardDrift)) return false;
    return true;
}

export function saveSettings(settings) {
    const data = { v: VERSION };
    for (const key of KEYS) {
        if (settings[key] !== undefined) data[key] = settings[key];
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        warn("Could not save settings:", e);
    }
}

export function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return isValid(data) ? data : null;
    } catch (e) {
        warn("Ignoring unreadable settings:", e);
        return null;
    }
}
