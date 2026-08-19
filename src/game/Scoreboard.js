export class Scoreboard {
    constructor(scene, config) {
        const { canvasWidth, homeScore, awayScore, homeColor, awayColor, downLabels, down, downX } = config;

        const centerX = canvasWidth / 2;

        this.homeColorRect = scene.add.rectangle(centerX - 250, 35, 50, 50, homeColor);
        this.awayColorRect = scene.add.rectangle(centerX + 250, 35, 50, 50, awayColor);

        this.homeLabel = scene.add.text(centerX - 170, 35, "Home", { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        this.awayLabel = scene.add.text(centerX + 170, 35, "Away", { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);

        this.homeScoreText = scene.add.text(centerX - 170, 78, homeScore, { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        this.awayScoreText = scene.add.text(centerX + 170, 78, awayScore, { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);

        this.downLabel = scene.add.text(downX, 35, "Down", { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        this.downText = scene.add.text(downX, 75, downLabels[down], { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
    }

    setScrollFactor(value) {
        this.homeColorRect.setScrollFactor(value);
        this.awayColorRect.setScrollFactor(value);
        this.homeLabel.setScrollFactor(value);
        this.awayLabel.setScrollFactor(value);
        this.homeScoreText.setScrollFactor(value);
        this.awayScoreText.setScrollFactor(value);
        this.downLabel.setScrollFactor(value);
        this.downText.setScrollFactor(value);
        return this;
    }

    updateScore(team, score) {
        if (team === "Home") {
            this.homeScoreText.setText(score);
        } else {
            this.awayScoreText.setText(score);
        }
    }

    updateDown(downLabel) {
        this.downText.setText(downLabel);
    }
}
