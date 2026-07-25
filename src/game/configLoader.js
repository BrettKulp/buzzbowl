import raw from "./config.json";

function parseHexColors(obj) {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const key of Object.keys(obj)) {
            if (typeof obj[key] === "string" && /^#[0-9A-Fa-f]{6}$/.test(obj[key])) {
                obj[key] = parseInt(obj[key].slice(1), 16);
            } else {
                parseHexColors(obj[key]);
            }
        }
    }
    return obj;
}

const config = parseHexColors(raw);
export default config;
