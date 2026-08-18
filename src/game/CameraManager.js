import { getBallCarrierX } from "./helpers";
import { log } from "./logger";

export class CameraManager {
    constructor(game) {
        this.game = game;
    }

    // TODO if it is a pass qb needs 30 yaards to pull back to do a full powered pass
    // TODO make camera smoother when completing a pass or starting once player crossed the centerX
    updateCameraPosition(overridePlayStartedCheck = false) {
        if (!this.game.playStarted && !overridePlayStartedCheck && this.game.cameraCenteredOnBallCarrierPreSnap) {
            return;
        }

        if ((this.game.offenseMovingRight && (getBallCarrierX(this.game) > this.game.camera.centerX)) || (!this.game.offenseMovingRight && (getBallCarrierX(this.game) < this.game.camera.centerX))) {

            if (this.game.passManager.ballInFlight()) {
                this.centerOnInFlightBallX();
            } else {
                this.centerOnBallCarrierX();
            }
        }

        if (overridePlayStartedCheck) {
            this.game.cameraCenteredOnBallCarrierPreSnap = true;
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
