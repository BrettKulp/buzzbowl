import gameConfig from "./configLoader.js";

export const log = gameConfig.debug ? console.log.bind(console) : () => {};
export const warn = gameConfig.debug ? console.warn.bind(console) : () => {};
export const error = (...args) => console.error(...args);
