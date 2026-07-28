import { BaseGameScene } from "./BaseGameScene";
import config from "../configLoader.js";
import { yardsToPixels } from "../helpers";

export class StandardGameScene extends BaseGameScene {
    constructor() {
        super("StandardGame");

        this.quarter = 1;
        this.quarterLength = 5; // seconds 
        this.gameClock = this.quarterLength;
        this.clockRunning = false;
        this.halftime = false;
        this.endQuarterAfterPlay = false;

        this.clockText = null;
        this.quarterText = null;
    }

    createModeUI() {
        this.quarterText = this.add.text(
            this.canvasWidth / 2, 25,
            `Q${this.quarter}`,
            { fontSize: "30px", fill: "#fff", fontStyle: "bold" }
        ).setOrigin(0.5);

        this.clockText = this.add.text(
            this.canvasWidth / 2, 60,
            this.formatTime(this.gameClock),
            { fontSize: "40px", fill: "#fff", fontStyle: "bold" }
        ).setOrigin(0.5);
    }

    updateMode(time, delta) {
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
        this.clockRunning = true;
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
            this.formationManager.toggleOffensiveFormation();
            this.formationManager.toggleDefensiveFormation();
        }

        this.gameClock = this.quarterLength;
        this.quarterText.setText(`Q${this.quarter}`);
        this.clockText.setText(this.formatTime(this.gameClock));
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
    }
}
