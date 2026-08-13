import config from "./configLoader.js";
import { error } from "./logger";
import { deselectAllPlayers, getOffensivePlayers, getDefensivePlayers } from "./helpers";

export class FormationManager {
    constructor(game) {
        this.game = game;
    }

    toggleOffensiveFormation() {
        deselectAllPlayers(this.game);
        // Teleports every offensive player (QB included) to new coordinates below, which would
        // otherwise leave a pending aim's origin/target, or an in-flight ball's landing spot,
        // pointing at wherever everyone used to stand.
        this.game.clearPass();
        this.game.formation = this.game.formation === "I" ? "Gun" : "I";
        if (this.game.formationText) {
            this.game.formationText.setText(this.game.formation);
        }

        const offenseBackedup = this.game.targetEndzone === "Right"
            ? this.game.lineOfScrimmage.x < 280
            : this.game.lineOfScrimmage.x > 1320;

        const dirMult = this.game.targetEndzone === "Right" ? 1 : -1;
        const losX = this.game.lineOfScrimmage.x;
        const offPlayers = getOffensivePlayers(this.game);
        const formationConfig = config.formations.offense[this.game.formation];

        try {
            offPlayers.forEach((player) => {
                this.resetPlayerAngle(player);

                if (player.targetCircle) {
                    player.targetCircle.setVisible(false);
                }

                let posConfig = formationConfig.positions[player.offensivePosition];
                if (!posConfig) posConfig = { xOffset: 0, yOffset: 0 };

                if (offenseBackedup && formationConfig.backedUp && formationConfig.backedUp[player.offensivePosition]) {
                    posConfig = formationConfig.backedUp[player.offensivePosition];
                }

                const newX = this.clampToField(
                    losX + posConfig.xOffset * dirMult
                );
                const newY = player.origY + posConfig.yOffset;

                player.initialX = newX;
                player.initialY = newY;
                player.setPosition(newX, newY);
                if (player.body) {
                    this.game.matter.body.setPosition(player.body, { x: newX, y: newY });
                }

                this.setPlayerBallCarrier(player, formationConfig.ballCarrier);

                if (this.game.playType === "Pass" && player.canReceivePass) {
                    player.targetCircle.setPosition(player.x, player.y);
                    player.targetCircle.setVisible(true);
                }
            });
        } catch (e) {
            error("Error processing offensive formation:", e);
        }
        this.game.checkBallCarrier();
    }

    toggleDefensiveFormation() {
        deselectAllPlayers(this.game);
        // Teleports every defender below -- a pending aim's target or an in-flight ball would
        // otherwise resolve against stale defender positions.
        this.game.clearPass();
        this.game.defensiveFormation = this.game.defensiveFormation === "4-3" ? "Dime" : "4-3";
        if (this.game.defensiveFormationText) {
            this.game.defensiveFormationText.setText(this.game.defensiveFormation);
        }

        const defPlayers = getDefensivePlayers(this.game);
        const defTeamColor = this.getDefensiveColor();
        const losX = this.game.lineOfScrimmage.x;
        const dirMult = this.game.targetEndzone === "Right" ? 1 : -1;
        const formationConfig = config.formations.defense[this.game.defensiveFormation];

        try {
            defPlayers.forEach((player) => {
                const posConfig = formationConfig.positions[player.defensivePosition];
                if (!posConfig) return;

                this.resetPlayerAngle(player);

                const finalX = this.clampToField(
                    losX + posConfig.xOffset * dirMult
                );
                const finalY = player.origY + posConfig.yOffset;

                player.initialX = finalX;
                player.initialY = finalY;
                player.setPosition(finalX, finalY);
                if (player.body) {
                    this.game.matter.body.setPosition(player.body, { x: finalX, y: finalY });
                }
                player.fillColor = defTeamColor;
            });
        } catch (e) {
            error("Error processing defensive formation:", e);
        }
    }

    togglePlayType() {
        deselectAllPlayers(this.game);
        this.game.clearPass();
        this.game.playType = this.game.playType === "Run" ? "Pass" : "Run";
        if (this.game.playTypeText) {
            this.game.playTypeText.setText(this.game.playType);
        }
        if (this.game.updateScrambleButton) {
            this.game.updateScrambleButton();
        }

        const ballCarrierPosition = this.game.playType === "Pass" ? "QB" : "RB";
        const offPlayers = getOffensivePlayers(this.game);
        const offColor = this.getOffensiveColor();

        try {
            offPlayers.forEach((player) => {
                if (player.teamHasPossession(this.game)) {
                    player.hasBall = player.offensivePosition === ballCarrierPosition;
                }

                this.applyBallCarrierColor(player, offColor);
                player.updateTargetCircle();
            });
        } catch (e) {
            error("Error processing play type:", e);
        }
    }

    checkBallCarrier() {
        const ballCarrierPosition = this.game.playType === "Run" ? "RB" : "QB";
        const offPlayers = getOffensivePlayers(this.game);
        const offColor = this.getOffensiveColor();

        try {
            offPlayers.forEach((player) => {
                if (player.teamHasPossession(this.game)) {
                    player.hasBall = player.offensivePosition === ballCarrierPosition;
                }
                this.applyBallCarrierColor(player, offColor);
            });
        } catch (e) {
            error("Error processing checkBallCarrier:", e);
        }
    }

    resetPlayerAngle(player) {
        player.currentAngle = player.baseAngle;
        if (player.body) {
            this.game.matter.body.setAngle(player.body, player.baseAngle);
        } else {
            player.setRotation(player.baseAngle);
        }
    }

    setPlayerBallCarrier(player, ballCarrierPosition) {
        if (player.offensivePosition === ballCarrierPosition) {
            player.hasBall = true;
            player.fillColor = this.game.ballCarrierColor;
        } else {
            player.hasBall = false;
            player.fillColor = this.getOffensiveColor();
        }
    }

    applyBallCarrierColor(player, offColor) {
        if (player.hasBall) {
            player.fillColor = this.game.ballCarrierColor;
        } else {
            player.fillColor = offColor;
        }
    }

    getOffensiveColor() {
        return this.game.possession === "Home" ? this.game.homeColor : this.game.awayColor;
    }

    getDefensiveColor() {
        return this.game.possession === "Home" ? this.game.awayColor : this.game.homeColor;
    }

    clampToField(x) {
        const left = this.game.margin + 5;
        const right = this.game.margin + this.game.fieldWidth - 5;
        return Math.max(left, Math.min(right, x));
    }
}
