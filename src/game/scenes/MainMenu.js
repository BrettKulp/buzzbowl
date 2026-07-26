import { Scene } from "phaser";
import { Button } from "../Button";
import config from "../configLoader.js";

export class MainMenu extends Scene {

    constructor() {
        super("MainMenu");
        this.standardGameButton = null;
        this.canvasWidth = config.canvas.width;
        this.canvasHeight = config.canvas.height;
    }
     
    preload() {

    }

    create() {
        new Button(this, this.canvasWidth / 2,this.canvasHeight / 2 , "Standard Game", { width: 500, height: 80, fontSize: 50 })
            .onClick(() => this.switchScene("StandardGame"));
    }
     
    update(time, delta) {

    }

    switchScene(name) {
        this.scene.sleep();
        if (this.scene.isSleeping(name)) {
            this.scene.wake(name);
        } else {
            this.scene.launch(name);
        }
    }
}
