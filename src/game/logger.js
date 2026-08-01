import gameConfig from "./configLoader.js";

const debugConfig = gameConfig.debug;

const masterEnabled = typeof debugConfig === "object" ? debugConfig.enabled : debugConfig;

const categoryEnabled = (name) =>
    masterEnabled && (!debugConfig.categories || debugConfig.categories[name] !== false);

const resolve = (args) => args.map((arg) => (typeof arg === "function" ? arg() : arg));

const makeLogger = (method) => (category, ...args) => {
    if (categoryEnabled(category)) console[method](`[DEBUG:${category}]`, ...resolve(args));
};

export const log = makeLogger("log");
export const warn = makeLogger("warn");
export const error = makeLogger("error");
