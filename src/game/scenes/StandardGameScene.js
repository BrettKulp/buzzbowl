import { BaseGameScene } from "./BaseGameScene";
import config from "../configLoader.js";

export class StandardGameScene extends BaseGameScene {
    constructor() {
        super("StandardGame");

        this.quarter = 1;
        this.quarterLength = 120; // seconds 
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
            this.changePossession();
        } else if (this.quarter === 4) {
            this.gameOver();
            return;
        } else {
            this.quarter++;
        }

        this.gameClock = this.quarterLength;
        this.quarterText.setText(`Q${this.quarter}`);
        this.clockText.setText(this.formatTime(this.gameClock));
    }

    gameOver() {
        // TODO: show final score / game over screen
        this.quarterText.setText("FINAL");
    }
}
