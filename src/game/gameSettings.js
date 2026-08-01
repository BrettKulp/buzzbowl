import config from "./configLoader.js";
import { warn } from "./logger";

const VERSION = 1;
const STANDARD_GAME_KEY = "buzzbowl:settings:StandardGame";
const TEAM_COLORS_KEY = "buzzbowl:settings:TeamColors";

const STANDARD_GAME_FIELDS = [
    "quarterMode", "quarterLength", "quarterPlayCount",
    "stuckTimeoutEnabled", "stuckTimeoutSeconds",
    "stuckBackwardEnabled", "stuckBackwardYards",
];

const TEAM_COLOR_FIELDS = ["homeColor", "awayColor"];
const VALID_TEAM_COLORS = Object.values(config.teamColorPalette);

function inRange(value, { min, max }) {
    return value >= min && value <= max;
}

function readJSON(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        warn(`Ignoring unreadable settings at ${key}:`, e);
        return null;
    }
}

function writeJSON(key, fields, values) {
    const data = { v: VERSION };
    for (const field of fields) {
        if (values[field] !== undefined) data[field] = values[field];
    }
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        warn(`Could not save settings at ${key}:`, e);
    }
}

function isValidStandardGame(data) {
    if (!data || data.v !== VERSION) return false;
    if ("quarterMode" in data && !["time", "plays"].includes(data.quarterMode)) return false;
    const sg = config.standardGame;
    if ("quarterLength" in data && !inRange(data.quarterLength, sg.quarterLengthSeconds)) return false;
    if ("quarterPlayCount" in data && !inRange(data.quarterPlayCount, sg.quarterPlayCount)) return false;
    if ("stuckTimeoutSeconds" in data && !inRange(data.stuckTimeoutSeconds, sg.stuckTimeout)) return false;
    if ("stuckBackwardYards" in data && !inRange(data.stuckBackwardYards, sg.stuckBackwardDrift)) return false;
    return true;
}

function isValidTeamColors(data) {
    if (!data || data.v !== VERSION) return false;
    if ("homeColor" in data && !VALID_TEAM_COLORS.includes(data.homeColor)) return false;
    if ("awayColor" in data && !VALID_TEAM_COLORS.includes(data.awayColor)) return false;
    return true;
}

export function saveSettings(settings) {
    writeJSON(STANDARD_GAME_KEY, STANDARD_GAME_FIELDS, settings);
}

export function loadSettings() {
    const data = readJSON(STANDARD_GAME_KEY);
    return isValidStandardGame(data) ? data : null;
}

// Team colors apply to both Standard Game and Free Play, so they're kept in a separate
// storage bucket from the Standard-Game-only settings above.
export function saveTeamColors(colors) {
    writeJSON(TEAM_COLORS_KEY, TEAM_COLOR_FIELDS, colors);
}

export function loadTeamColors() {
    const data = readJSON(TEAM_COLORS_KEY);
    return isValidTeamColors(data) ? data : null;
}
