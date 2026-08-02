// Pre-commit guard: debug logging must be off in committed config. Reads the staged copy of
// config.json -- the index is what actually ships -- so local debugging with the working tree
// left enabled stays unblocked as long as config.json isn't staged.
import { execFileSync } from "node:child_process";

const configPath = "src/game/config.json";

const config = JSON.parse(execFileSync("git", ["show", `:${configPath}`], { encoding: "utf8" }));

if (config.debug?.enabled !== false) {
    console.error(
        `\nCommit blocked: "debug.enabled" is ${config.debug?.enabled} in ${configPath}.\n` +
        `Debug logging must be off in committed config -- set it back to false.\n`
    );
    process.exit(1);
}
