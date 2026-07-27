import { Scene } from "phaser";
import { Button } from "../Button";
import config from "../configLoader.js";
import { InfoButton } from "../InfoButton";

export class MainMenu extends Scene {

    constructor() {
        super("MainMenu");
        this.standardGameButton = null;
        this.canvasWidth = config.canvas.width;
        this.canvasHeight = config.canvas.height;

        this.buttonHeight = 80;
    }
     
    preload() {

    }

    create() {
        this.cameras.main.setBackgroundColor(config.colors.uiBackground);

        const standardGameButton = new Button(this, this.canvasWidth / 2,this.canvasHeight / 2 , "Standard Game", { width: 500, height: this.buttonHeight, fontSize: 50 })
            .onClick(() => this.switchScene("StandardGame"));
        
        const standardGameInfoButton = new InfoButton(this, standardGameButton, "2 minute quarters. You set both teams formations");
        standardGameInfoButton.onClick(() => standardGameInfoButton.toggleTooltip());

        const freePlayButton = new Button(this, this.canvasWidth / 2,(this.canvasHeight / 2) +  (2 * this.buttonHeight) , "Free Play", { width: 500, height: this.buttonHeight, fontSize: 50 })
            .onClick(() => this.switchScene("FreePlay"));

        const freePlayInfoButton = new InfoButton(this, freePlayButton, "Free Play. No tracked quarters. Set both teams and change possession whenever you want. Experiment!");
        freePlayInfoButton.onClick(() => freePlayInfoButton.toggleTooltip());


        this.add.text(this.canvasWidth / 2, 100, "Buzz Bowl", { fontSize: "72px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        this.add.text(this.canvasWidth / 2, 200, "footbal simulation game", { fontSize: "32px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
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
