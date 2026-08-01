import gameConfig from "./configLoader.js";

const debugConfig = gameConfig.debug ?? {};

const categoryEnabled = (name) =>
    debugConfig.enabled === true && debugConfig.categories?.[name] === true;

const resolve = (args) => args.map((arg) => (typeof arg === "function" ? arg() : arg));

export const log = (category, ...args) => {
    if (categoryEnabled(category)) console.log(`[DEBUG:${category}]`, ...resolve(args));
};
export const warn = (...args) => console.warn("[WARN]", ...resolve(args));
export const error = (...args) => console.error("[ERROR]", ...resolve(args));
