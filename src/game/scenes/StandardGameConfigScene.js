import { Scene } from "phaser";
import { Button } from "../Button";
import config from "../configLoader.js";
import { loadSettings, saveSettings, loadTeamColors, saveTeamColors, clearSettings, hasCustomSettings } from "../gameSettings.js";
import { hasSave } from "../saveGame";

const ROW_LABEL_X = 400;
// The arrows sit 150px either side of the centred value rather than 100px: the widest values
// ("Play Count", "Sky Blue") render ~170px at VALUE_STYLE, so the old 60px-wide arrow buttons at
// +/-100 overlapped and clipped their first and last letters.
const ARROW_LEFT_X = 850;
const VALUE_X = 1000;
const ARROW_RIGHT_X = 1150;
const SWATCH_X = 1250;
const SWATCH_SIZE = 40;
// Clear of the last row's swatch (which ends at 720) so the buttons don't crowd the settings.
const BUTTON_ROW_Y = 800;
const RESTORE_ROW_Y = 862;
// Wide enough for "Start New Game" at this font size, and offset far enough apart to leave a
// visible gap between the two buttons when both are shown.
const BUTTON_STYLE = { width: 320, height: 56, fontSize: 34 };
const BUTTON_PAIR_OFFSET = 175;
// Deliberately smaller than the two play buttons -- it's a rarely-wanted escape hatch, not
// something to invite a mis-click on its way to Start New Game.
const RESTORE_STYLE = { width: 240, height: 42, fontSize: 22 };
const ARROW_STYLE = { fontSize: "36px", fill: "#fff", fontStyle: "bold" };
const LABEL_STYLE = { fontSize: "28px", fill: "#fff", fontStyle: "bold" };
const VALUE_STYLE = { fontSize: "30px", fill: "#fff", fontStyle: "bold" };

function clampToStep(value, { min, max, step }) {
    const clamped = Math.min(max, Math.max(min, value));
    return Math.round(clamped / step) * step;
}

function formatClock(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export class StandardGameConfigScene extends Scene {
    constructor() {
        super("StandardGameConfig");
        this.canvasWidth = config.canvas.width;
        this.canvasHeight = config.canvas.height;
    }

    create() {
        this.cameras.main.setBackgroundColor(config.colors.uiBackground);

        const sg = config.standardGame;
        const saved = loadSettings() ?? {};
        this.quarterMode = saved.quarterMode ?? sg.quarterMode;
        this.quarterLength = saved.quarterLength ?? sg.quarterLengthSeconds.default;
        this.quarterPlayCount = saved.quarterPlayCount ?? sg.quarterPlayCount.default;
        this.stuckTimeoutEnabled = saved.stuckTimeoutEnabled ?? sg.stuckTimeout.enabledByDefault;
        this.stuckTimeoutSeconds = saved.stuckTimeoutSeconds ?? sg.stuckTimeout.default;
        this.stuckBackwardEnabled = saved.stuckBackwardEnabled ?? sg.stuckBackwardDrift.enabledByDefault;
        this.stuckBackwardYards = saved.stuckBackwardYards ?? sg.stuckBackwardDrift.default;

        this.palette = Object.entries(config.teamColorPalette);
        const savedColors = loadTeamColors() ?? {};
        // Keyed by the same "Home"/"Away" strings player.team uses. Each entry gains its `text`
        // and `swatch` display objects when createColorRow() builds it.
        this.teamColorRows = {
            Home: { color: savedColors.homeColor ?? config.colors.home },
            Away: { color: savedColors.awayColor ?? config.colors.away },
        };

        this.add.text(this.canvasWidth / 2, 60, "Preferences", {
            fontSize: "48px", fill: "#fff", fontStyle: "bold"
        }).setOrigin(0.5);

        this.add.text(this.canvasWidth / 2, 110, "Standard Game quarter length and house rules, plus team colors for both modes", {
            fontSize: "22px", fill: "#ccc"
        }).setOrigin(0.5);

        // Same position/size as the in-game "Menu" button (BaseGameScene.createUI()) so the
        // e2e menu round-trip test's hardcoded click coordinate still lands on a menu button.
        new Button(this, this.canvasWidth - 100, 40, "Menu", { width: 100, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.scene.start("MainMenu"));

        // Rows are 80px apart, except a sub-setting sits 70px under the toggle it belongs to.
        this.createQuarterModeRow(170);
        this.createQuarterValueRow(250);
        this.createStuckTimeoutRow(330);
        this.createStuckSecondsRow(400);
        this.createStuckBackwardRow(480);
        this.createStuckYardsRow(550);
        this.createColorRow(630, "Home");
        this.createColorRow(700, "Away");

        // Sits with the rows it describes, since the buttons below it now run to the canvas edge.
        this.add.text(this.canvasWidth / 2, 746, "Changes save automatically.", {
            fontSize: "20px", fill: "#999", fontStyle: "italic"
        }).setOrigin(0.5);

        // Both mirror the main menu's buttons: Start New Game is a fresh game, Resume Game
        // continues the save, so a game in progress survives a detour through Preferences. Resume
        // only exists when there is something to resume, same condition MainMenu.create() uses.
        // Cleared first: scene instances are reused across scene.start(), so finishing a game
        // (which clears the save) would otherwise leave a stale button from an earlier visit.
        this.resumeGameButton = null;
        const canResume = hasSave("StandardGame");
        this.startGameButton = new Button(
            this,
            canResume ? this.canvasWidth / 2 - BUTTON_PAIR_OFFSET : this.canvasWidth / 2,
            BUTTON_ROW_Y, "Start New Game", BUTTON_STYLE
        ).onClick(() => this.scene.start("StandardGame", { resume: false }));
        if (canResume) {
            this.resumeGameButton = new Button(this, this.canvasWidth / 2 + BUTTON_PAIR_OFFSET, BUTTON_ROW_Y, "Resume Game", BUTTON_STYLE)
                .onClick(() => this.scene.start("StandardGame", { resume: true }));
        }

        // Only offered when there is something to restore -- on a default setup it would be a
        // no-op. Clearing storage and restarting is enough: with nothing saved, create() re-reads
        // every default straight from config.json, so there is no second copy of the defaults to
        // drift, and the rebuilt screen drops this button on its own.
        this.restoreDefaultsButton = null;
        if (hasCustomSettings()) {
            this.restoreDefaultsButton = new Button(this, this.canvasWidth / 2, RESTORE_ROW_Y, "Restore Defaults", RESTORE_STYLE)
                .onClick(() => {
                    clearSettings();
                    this.scene.restart();
                });
        }
    }

    createQuarterModeRow(y) {
        this.add.text(ROW_LABEL_X, y, "Quarter Mode", LABEL_STYLE).setOrigin(0, 0.5);
        new Button(this, ARROW_LEFT_X, y, "<", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.toggleQuarterMode());
        this.quarterModeText = this.add.text(VALUE_X, y, this.formatQuarterMode(), VALUE_STYLE).setOrigin(0.5);
        new Button(this, ARROW_RIGHT_X, y, ">", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.toggleQuarterMode());
    }

    createQuarterValueRow(y) {
        this.quarterValueLabelText = this.add.text(ROW_LABEL_X, y, this.quarterValueLabel(), LABEL_STYLE).setOrigin(0, 0.5);
        new Button(this, ARROW_LEFT_X, y, "<", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.adjustQuarterValue(-1));
        this.quarterValueText = this.add.text(VALUE_X, y, this.formatQuarterValue(), VALUE_STYLE).setOrigin(0.5);
        new Button(this, ARROW_RIGHT_X, y, ">", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.adjustQuarterValue(1));
    }

    createStuckTimeoutRow(y) {
        this.add.text(ROW_LABEL_X, y, "Stall Timeout", LABEL_STYLE).setOrigin(0, 0.5);
        new Button(this, ARROW_LEFT_X, y, "<", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.toggleStuckTimeoutEnabled());
        this.stuckTimeoutEnabledText = this.add.text(VALUE_X, y, this.formatOnOff(this.stuckTimeoutEnabled), VALUE_STYLE).setOrigin(0.5);
        new Button(this, ARROW_RIGHT_X, y, ">", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.toggleStuckTimeoutEnabled());
    }

    createStuckSecondsRow(y) {
        this.add.text(ROW_LABEL_X, y, "  Motionless Seconds", LABEL_STYLE).setOrigin(0, 0.5);
        new Button(this, ARROW_LEFT_X, y, "<", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.adjustStuckSeconds(-1));
        this.stuckSecondsText = this.add.text(VALUE_X, y, this.formatStuckSeconds(), VALUE_STYLE).setOrigin(0.5);
        new Button(this, ARROW_RIGHT_X, y, ">", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.adjustStuckSeconds(1));
    }

    createStuckBackwardRow(y) {
        this.add.text(ROW_LABEL_X, y, "Backward Drift", LABEL_STYLE).setOrigin(0, 0.5);
        new Button(this, ARROW_LEFT_X, y, "<", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.toggleStuckBackwardEnabled());
        this.stuckBackwardEnabledText = this.add.text(VALUE_X, y, this.formatOnOff(this.stuckBackwardEnabled), VALUE_STYLE).setOrigin(0.5);
        new Button(this, ARROW_RIGHT_X, y, ">", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.toggleStuckBackwardEnabled());
    }

    createStuckYardsRow(y) {
        this.add.text(ROW_LABEL_X, y, "  Backward Yards", LABEL_STYLE).setOrigin(0, 0.5);
        new Button(this, ARROW_LEFT_X, y, "<", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.adjustStuckYards(-1));
        this.stuckYardsText = this.add.text(VALUE_X, y, this.formatStuckYards(), VALUE_STYLE).setOrigin(0.5);
        new Button(this, ARROW_RIGHT_X, y, ">", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.adjustStuckYards(1));
    }

    createColorRow(y, team) {
        const row = this.teamColorRows[team];
        this.add.text(ROW_LABEL_X, y, `${team} Color`, LABEL_STYLE).setOrigin(0, 0.5);
        new Button(this, ARROW_LEFT_X, y, "<", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.cycleColor(team, -1));
        row.text = this.add.text(VALUE_X, y, this.paletteNameOf(row.color), VALUE_STYLE).setOrigin(0.5);
        new Button(this, ARROW_RIGHT_X, y, ">", { width: 60, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.cycleColor(team, 1));
        row.swatch = this.add.rectangle(SWATCH_X, y, SWATCH_SIZE, SWATCH_SIZE, row.color)
            .setStrokeStyle(2, 0xffffff);
    }

    toggleQuarterMode() {
        this.quarterMode = this.quarterMode === "time" ? "plays" : "time";
        this.quarterModeText.setText(this.formatQuarterMode());
        this.quarterValueLabelText.setText(this.quarterValueLabel());
        this.quarterValueText.setText(this.formatQuarterValue());
        this.persist();
    }

    adjustQuarterValue(direction) {
        const sg = config.standardGame;
        if (this.quarterMode === "time") {
            const bounds = sg.quarterLengthSeconds;
            this.quarterLength = clampToStep(this.quarterLength + direction * bounds.step, bounds);
        } else {
            const bounds = sg.quarterPlayCount;
            this.quarterPlayCount = clampToStep(this.quarterPlayCount + direction * bounds.step, bounds);
        }
        this.quarterValueText.setText(this.formatQuarterValue());
        this.persist();
    }

    toggleStuckTimeoutEnabled() {
        this.stuckTimeoutEnabled = !this.stuckTimeoutEnabled;
        this.stuckTimeoutEnabledText.setText(this.formatOnOff(this.stuckTimeoutEnabled));
        this.persist();
    }

    adjustStuckSeconds(direction) {
        const bounds = config.standardGame.stuckTimeout;
        this.stuckTimeoutSeconds = clampToStep(this.stuckTimeoutSeconds + direction * bounds.step, bounds);
        this.stuckSecondsText.setText(this.formatStuckSeconds());
        this.persist();
    }

    toggleStuckBackwardEnabled() {
        this.stuckBackwardEnabled = !this.stuckBackwardEnabled;
        this.stuckBackwardEnabledText.setText(this.formatOnOff(this.stuckBackwardEnabled));
        this.persist();
    }

    adjustStuckYards(direction) {
        const bounds = config.standardGame.stuckBackwardDrift;
        this.stuckBackwardYards = clampToStep(this.stuckBackwardYards + direction * bounds.step, bounds);
        this.stuckYardsText.setText(this.formatStuckYards());
        this.persist();
    }

    cycleColor(team, direction) {
        const row = this.teamColorRows[team];
        const other = this.teamColorRows[team === "Home" ? "Away" : "Home"];
        row.color = this.paletteColorAfter(row.color, direction, other.color);
        row.text.setText(this.paletteNameOf(row.color));
        row.swatch.setFillStyle(row.color);
        this.persistColors();
    }

    // Falling back to the first entry can only happen for a color outside the palette, which
    // loadTeamColors() rejects and tests/unit/config.test.js forbids for the config defaults.
    paletteIndexOf(colorInt) {
        const index = this.palette.findIndex(([, hex]) => hex === colorInt);
        return index === -1 ? 0 : index;
    }

    // `exclude` is the other team's color: skipping it is what stops both teams being set to the
    // same one, which would leave 22 identically-colored players and two matching scoreboard
    // swatches. Terminates for any palette of 2+ entries.
    paletteColorAfter(colorInt, direction, exclude) {
        let index = this.paletteIndexOf(colorInt);
        do {
            index = (index + direction + this.palette.length) % this.palette.length;
        } while (this.palette[index][1] === exclude);
        return this.palette[index][1];
    }

    paletteNameOf(colorInt) {
        return this.palette[this.paletteIndexOf(colorInt)][0];
    }

    formatQuarterMode() {
        return this.quarterMode === "time" ? "Time" : "Play Count";
    }

    quarterValueLabel() {
        return this.quarterMode === "time" ? "Quarter Length" : "Plays per Quarter";
    }

    formatQuarterValue() {
        return this.quarterMode === "time" ? formatClock(this.quarterLength) : `${this.quarterPlayCount}`;
    }

    formatStuckSeconds() {
        return `${this.stuckTimeoutSeconds}s`;
    }

    formatStuckYards() {
        return `${this.stuckBackwardYards}yd`;
    }

    formatOnOff(enabled) {
        return enabled ? "On" : "Off";
    }

    buildSettings() {
        return {
            quarterMode: this.quarterMode,
            quarterLength: this.quarterLength,
            quarterPlayCount: this.quarterPlayCount,
            stuckTimeoutEnabled: this.stuckTimeoutEnabled,
            stuckTimeoutSeconds: this.stuckTimeoutSeconds,
            stuckBackwardEnabled: this.stuckBackwardEnabled,
            stuckBackwardYards: this.stuckBackwardYards,
        };
    }

    persist() {
        saveSettings(this.buildSettings());
    }

    persistColors() {
        saveTeamColors({
            homeColor: this.teamColorRows.Home.color,
            awayColor: this.teamColorRows.Away.color,
        });
    }
}
