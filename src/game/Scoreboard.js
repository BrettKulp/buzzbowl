export class Scoreboard {
    constructor(scene, config) {
        const { canvasWidth, homeScore, awayScore, homeColor, awayColor, downLabels, down, downX } = config;

        const centerX = canvasWidth / 2;

        scene.add.rectangle(centerX - 250, 35, 50, 50, homeColor);
        scene.add.rectangle(centerX + 250, 35, 50, 50, awayColor);

        scene.add.text(centerX - 170, 35, "Home", { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        scene.add.text(centerX + 170, 35, "Away", { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);

        this.homeScoreText = scene.add.text(centerX - 170, 78, homeScore, { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        this.awayScoreText = scene.add.text(centerX + 170, 78, awayScore, { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);

        scene.add.text(downX, 35, "Down", { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
        this.downText = scene.add.text(downX, 75, downLabels[down], { fontSize: "33px", fill: "#fff", fontStyle: "bold" }).setOrigin(0.5);
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
