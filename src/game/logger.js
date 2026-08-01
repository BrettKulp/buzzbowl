import gameConfig from "./configLoader.js";

const debugConfig = gameConfig.debug;

const masterEnabled = typeof debugConfig === "object" ? debugConfig.enabled : debugConfig;

const categoryEnabled = (name) =>
    masterEnabled && debugConfig.categories?.[name] === true;

const resolve = (args) => args.map((arg) => (typeof arg === "function" ? arg() : arg));

const makeLogger = (method) => (category, ...args) => {
    if (categoryEnabled(category)) console[method](`[DEBUG:${category}]`, ...resolve(args));
};

export const log = makeLogger("log");
export const warn = (...args) => {
    if (categoryEnabled("warn")) console.warn("[WARN]", ...resolve(args));
};
export const error = (...args) => console.error("[ERROR]", ...resolve(args));
