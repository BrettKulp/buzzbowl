import Phaser from "phaser";
import { getBallCarrierX } from "./helpers";
import { log } from "./logger";

export class CameraManager {
    constructor(game) {
        this.game = game;
    }

    updateCameraPosition(overridePlayStartedCheck = false) {
        if (this.game.playPaused && !overridePlayStartedCheck) {
            return;
        }

        const ballCarrierX = getBallCarrierX(this.game);

        if (overridePlayStartedCheck) {
            this.instantCenterOn(ballCarrierX);
            this.game.cameraCenteredOnBallCarrierPreSnap = true;
            return;
        }

        if (!this.game.playStarted && this.game.cameraCenteredOnBallCarrierPreSnap) {
            return;
        }

        const targetX = this.game.passManager.ballInFlight()
            ? this.game.passManager.ball.x
            : ballCarrierX;

        this.setCameraPosition(targetX);

        log("camera", () => `centered on x=${this.game.camera.midPoint.x}`);
    }

    instantCenterOn(x, _y = 450) {
        if (!x) return;

        const clampedX = Phaser.Math.Clamp(x, 600, 1000);
        this.game.camera.centerOn(clampedX, _y);
    }

    setCameraPosition(x, _y = 450) {
        if (!x) return;

        const targetX = Phaser.Math.Clamp(x, 600, 1000);
        const targetY = _y;
        const lerpFactor = 0.05;
        const currentX = this.game.camera.scrollX + this.game.camera.width / 2;
        const currentY = this.game.camera.scrollY + this.game.camera.height / 2;

        const newX = Phaser.Math.Linear(currentX, targetX, lerpFactor);
        const newY = Phaser.Math.Linear(currentY, targetY, lerpFactor);

        this.game.camera.centerOn(newX, newY);
    }
}
