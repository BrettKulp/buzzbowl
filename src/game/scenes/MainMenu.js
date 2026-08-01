import { Scene } from "phaser";
import { Button } from "../Button";
import config from "../configLoader.js";
import { InfoButton } from "../InfoButton";
import { hasSave } from "../saveGame";
import { loadSettings, loadTeamColors } from "../gameSettings.js";

export class MainMenu extends Scene {

    constructor() {
        super("MainMenu");
        this.standardGameButton = null;
        this.preferencesButton = null;
        this.canvasWidth = config.canvas.width;
        this.canvasHeight = config.canvas.height;

        this.buttonHeight = 80;
    }
     
    preload() {

    }

    create() {
        this.cameras.main.setBackgroundColor(config.colors.uiBackground);

        if (hasSave("StandardGame")) {
            new Button(this, this.canvasWidth / 2, (this.canvasHeight / 2) - (2 * this.buttonHeight), "Resume Game", { width: 500, height: this.buttonHeight, fontSize: 50 })
                .onClick(() => this.switchScene("StandardGame", true));
        }

        this.standardGameButton = new Button(this, this.canvasWidth / 2,this.canvasHeight / 2 , "Standard Game", { width: 500, height: this.buttonHeight, fontSize: 50 })
            .onClick(() => this.switchScene("StandardGame"));

        const standardGameInfoButton = new InfoButton(this, this.standardGameButton, "You set both teams' formations. Quarter length, play count, and house rules come from Preferences below.");
        standardGameInfoButton.onClick(() => standardGameInfoButton.toggleTooltip());

        const freePlayButton = new Button(this, this.canvasWidth / 2,(this.canvasHeight / 2) +  (2 * this.buttonHeight) , "Free Play", { width: 500, height: this.buttonHeight, fontSize: 50 })
            .onClick(() => this.switchScene("FreePlay"));

        const freePlayInfoButton = new InfoButton(this, freePlayButton, "Free Play. No tracked quarters. Set both teams and change possession whenever you want. Experiment!");
        freePlayInfoButton.onClick(() => freePlayInfoButton.toggleTooltip());


        this.add.text(this.canvasWidth / 2, 100, "Buzz Bowl", { fontSize: "72px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        this.add.text(this.canvasWidth / 2, 200, "footbal simulation game", { fontSize: "32px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);

        const usingCustomSettings = loadSettings() !== null || loadTeamColors() !== null;
        this.add.text(this.canvasWidth / 2, this.canvasHeight - 130,
            usingCustomSettings ? "Using custom settings" : "Using default settings",
            { fontSize: "22px", fill: "#ccc" }
        ).setOrigin(0.5);

        this.preferencesButton = new Button(this, this.canvasWidth / 2, this.canvasHeight - 60, "Preferences", { width: 300, height: 60, fontSize: 32 })
            .onClick(() => this.switchScene("StandardGameConfig"));
    }

    switchScene(name, resume = false) {
        this.scene.start(name, { resume });
    }
}
