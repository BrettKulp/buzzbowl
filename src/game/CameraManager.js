import { getBallCarrierX } from "./helpers";
import { log } from "./logger";

export class CameraManager {
    constructor(game) {
        this.game = game;
    }

    updateCameraPosition() {
        if (!this.game.playStarted) {
            // TODO need to ease to new camera position when the play starts instead of snapping
            return;
        }

        if (this.game.passManager.ballInFlight()) {
            this.centerOnInFlightBallX();
        } else {
            this.centerOnBallCarrierX();
        }
        log("camera", () => `centered on x=${this.game.camera.midPoint.x}`);
    }

    centerOnBallCarrierX() {
        let ballCarrierX = getBallCarrierX(this.game);

        if (!ballCarrierX) 
            return;

        this.setCameraPosition(ballCarrierX)
    }

    centerOnInFlightBallX() {
        this.setCameraPosition(this.game.passManager.ball.x);
    }

    setCameraPosition(x, _y = 450) {
        let newX = x;
        let newY = _y;
        if (x < 600) {
            newX = 600;
        }

        if (x > 1000) {
            newX = 1000;
        }

        this.game.camera.centerOn(newX, newY);
    }
}
