import { getBallCarrierX } from "./helpers";

export class CameraManager {
    constructor(game) {
        this.game = game;
    }

    centerXonBallCarrier() {
        if (!this.game.playStarted) return;
        
        let x = getBallCarrierX(this.game);
        console.log("getBallCarrierX", x);
        this.game.camera.centerOn(x, 450);

    }
}
