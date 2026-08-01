import { BaseGameScene } from "./BaseGameScene";
import config from "../configLoader.js";
import { yardsToPixels } from "../helpers";
import { clearSave } from "../saveGame";
import { loadSettings } from "../gameSettings.js";
export class StandardGameScene extends BaseGameScene {
    constructor() {
        super("StandardGame");
        const sg = config.standardGame;
        this.quarterMode = sg.quarterMode;
        this.quarterLength = sg.quarterLengthSeconds.default; // seconds
        this.quarterPlayCount = sg.quarterPlayCount.default;
        this.stuckTimeoutEnabled = sg.stuckTimeout.enabledByDefault;
        this.stuckTimeoutSeconds = sg.stuckTimeout.default;
        this.stuckBackwardEnabled = sg.stuckBackwardDrift.enabledByDefault;
        this.stuckBackwardYards = sg.stuckBackwardDrift.default;
        this.playsThisQuarter = 0;
        this.clockText = null;
        this.quarterText = null;
    }

    init(data) {
        super.init(data);
        if (!data?.resume) {
            this.quarter = 1;
            const s = loadSettings() ?? {};
            const sg = config.standardGame;
            this.quarterMode = s.quarterMode ?? sg.quarterMode;
            this.quarterLength = s.quarterLength ?? sg.quarterLengthSeconds.default;
            this.quarterPlayCount = s.quarterPlayCount ?? sg.quarterPlayCount.default;
            this.stuckTimeoutEnabled = s.stuckTimeoutEnabled ?? sg.stuckTimeout.enabledByDefault;
            this.stuckTimeoutSeconds = s.stuckTimeoutSeconds ?? sg.stuckTimeout.default;
            this.stuckBackwardEnabled = s.stuckBackwardEnabled ?? sg.stuckBackwardDrift.enabledByDefault;
            this.stuckBackwardYards = s.stuckBackwardYards ?? sg.stuckBackwardDrift.default;
            this.gameClock = this.quarterLength;
            this.playsThisQuarter = 0;
        }
        this.clockRunning = false;
        this.halftime = false;
        this.endQuarterAfterPlay = false;
    }

    createModeUI() {
        this.quarterText = this.add.text(
            this.canvasWidth / 2, 25,
            `Q${this.quarter}`,
            { fontSize: "30px", fill: "#fff", fontStyle: "bold" }
        ).setOrigin(0.5);

        this.clockText = this.add.text(
            this.canvasWidth / 2, 60,
            this.quarterMode === "time" ? this.formatTime(this.gameClock) : this.formatPlayCount(),
            { fontSize: "40px", fill: "#fff", fontStyle: "bold" }
        ).setOrigin(0.5);
    }

    formatPlayCount() {
        return `Play ${this.playsThisQuarter}/${this.quarterPlayCount}`;
    }

    updateMode(time, delta) {
        if (this.quarterMode !== "time") return;
        if (!this.clockRunning || !this.playStarted) return;

        this.gameClock -= delta / 1000;
        this.updateClock();
    }

    updateClock() {
        if (this.gameClock <= 0) {
            this.gameClock = 0;
            if (!this.endQuarterAfterPlay) {
                this.endQuarterAfterPlay = true;
                this.clockRunning = false;
            }
        }

        this.clockText.setText(this.formatTime(this.gameClock));
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    nextPlay() {
        if (this.endQuarterAfterPlay) {
            this.endQuarter();
            this.endQuarterAfterPlay = false;
        }
        super.nextPlay();
    }

    startPlay() {
        super.startPlay();
        if (this.quarterMode === "time") {
            this.clockRunning = true;
        } else {
            this.playsThisQuarter++;
            this.clockText.setText(this.formatPlayCount());
            if (this.playsThisQuarter >= this.quarterPlayCount) {
                this.endQuarterAfterPlay = true;
            }
        }
    }

    pausePlay(ballCarrierDown) {
        super.pausePlay(ballCarrierDown);
        this.clockRunning = false;
    }

    endQuarter() {
        this.pausePlay();

        if (this.quarter === 2) {
            this.halftime = true;
            this.quarter = 3;
            this.swapTeamDirection({
                team: "Away",
                direction: false,
                startLOS: this.canvasWidth - this.lineOfScrimmage.x
            });
            this.down = 1;
            this.scoreboard.updateDown(this.downLabels[this.down]);
            this.playStateManager.resetAllPlayerColors();
            this.playStateManager.setDefensiveTeamColor();
            this.playStateManager.resetPlayState();
            this.playStateManager.forEachPlayer((player) => {
                if (player && player.resetPosition) {
                    player.resetPosition(this);
                }
            });
            this.checkBallCarrier();
            this.startButton.enable();
            this.nextPlayButton.disable();
        } else if (this.quarter === 4) {
            this.gameOver();
            return;
        } else {
            this.quarter++;
            this.swapTeamDirection();
            this.playStateManager.forEachPlayer((player) => {
                if (player && player.resetPosition) {
                    player.resetPosition(this);
                }
            });
        }

        this.gameClock = this.quarterLength;
        this.playsThisQuarter = 0;
        this.quarterText.setText(`Q${this.quarter}`);
        this.clockText.setText(this.quarterMode === "time" ? this.formatTime(this.gameClock) : this.formatPlayCount());
    }
  
    swapTeamDirection({ team, direction, startLOS } = {}) {
        if (team) {
            this.possession = team;
        }

        if (direction !== undefined) {
            this.offenseMovingRight = direction;
        } else {
            this.offenseMovingRight = !this.offenseMovingRight;
        }
        this.targetEndzone = this.offenseMovingRight ? "Right" : "Left";

        if (startLOS !== undefined) {
            this.lineOfScrimmage.x = startLOS;
        } else {
            this.lineOfScrimmage.x = this.canvasWidth - this.lineOfScrimmage.x;
        }
        this.lineOfScrimmage.marker.updateX(this.lineOfScrimmage.x);
        this.updateLOSBarrier(this.lineOfScrimmage.x);

        const dirMult = this.offenseMovingRight ? 1 : -1;
        this.firstDownMarker.x = this.lineOfScrimmage.x + dirMult * yardsToPixels(config.field.yardsToFirstDown);
        this.firstDownMarker.marker.updateX(this.firstDownMarker.x);
    }
    gameOver() {
        // TODO: show final score / game over screen
        this.quarterText.setText("FINAL");
        clearSave(this);
    }
}
