import { Scene } from "phaser";
import { Button } from "../Button";
import config from "../configLoader.js";
import { loadSettings, saveSettings } from "../gameSettings.js";

const ROW_LABEL_X = 400;
const ARROW_LEFT_X = 900;
const VALUE_X = 1000;
const ARROW_RIGHT_X = 1100;
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

        this.add.text(this.canvasWidth / 2, 60, "Preferences", {
            fontSize: "48px", fill: "#fff", fontStyle: "bold"
        }).setOrigin(0.5);

        this.add.text(this.canvasWidth / 2, 110, "Standard Game quarter length and house rules", {
            fontSize: "22px", fill: "#ccc"
        }).setOrigin(0.5);

        // Same position/size as the in-game "Menu" button (BaseGameScene.createUI()) so the
        // e2e menu round-trip test's hardcoded click coordinate still lands on a menu button.
        new Button(this, this.canvasWidth - 100, 40, "Menu", { width: 100, height: 60, labelStyle: ARROW_STYLE })
            .onClick(() => this.scene.start("MainMenu"));

        this.createQuarterModeRow(180);
        this.createQuarterValueRow(270);
        this.createStuckTimeoutRow(360);
        this.createStuckSecondsRow(440);
        this.createStuckBackwardRow(530);
        this.createStuckYardsRow(610);

        this.add.text(this.canvasWidth / 2, 750, "Changes save automatically.", {
            fontSize: "20px", fill: "#999", fontStyle: "italic"
        }).setOrigin(0.5);
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
}
