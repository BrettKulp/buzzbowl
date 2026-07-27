import { Button } from "../Button";
import config from "../configLoader.js";
import { BaseGameScene } from "./BaseGameScene";

export class FreePlayScene extends BaseGameScene {
    constructor() {
        super("FreePlay");
    }

    createModeUI() {
        const arrowStyle = { fontSize: "36px", fill: "#fff", fontStyle: "bold" };

        new Button(this, this.canvasWidth - 300, 40, "Change Pos", { width: 250, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changePossession());
    }
}
