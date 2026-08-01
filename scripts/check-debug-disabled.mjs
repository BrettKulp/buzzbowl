// Pre-commit guard: debug logging must be off in committed config. Checks the staged copy
// of config.json (what's actually being committed); if it isn't staged, checks the working
// tree, since a commit of everything else would still ship the current file later.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const configPath = "src/game/config.json";

let source;
try {
    source = execFileSync("git", ["show", `:${configPath}`], { encoding: "utf8" });
} catch {
    source = readFileSync(configPath, "utf8");
}

const config = JSON.parse(source);

if (config.debug?.enabled !== false) {
    console.error(
        `\nCommit blocked: "debug.enabled" is ${config.debug?.enabled} in ${configPath}.\n` +
        `Debug logging must be off in committed config -- set it back to false.\n`
    );
    process.exit(1);
}
