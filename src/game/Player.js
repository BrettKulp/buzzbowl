import Phaser from "phaser";
import gameConfig from "./configLoader.js";
import { log, error } from "./logger";

export class Player extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, config) {
        super(scene, x, y, 60, 40, config.color);
        scene.add.existing(this);

        const awayInitialBaseAngle = Math.PI;

        this.initialX = config.initialX;
        this.initialY = config.initialY;
        this.origX = config.initialX;
        this.origY = config.initialY;
        this.baseAngle = config.team === "Home" ? 0 : awayInitialBaseAngle;
        this.currentAngle = this.baseAngle;
        this.initialVeerMomentum = (Math.random() - 0.5) * 0.01;
        this.veerMomentum = this.initialVeerMomentum;
        this.initialVeerTargetDirection = Math.random() < 0.5 ? 1 : -1;
        this.veerTargetDirection = this.initialVeerTargetDirection;
        this.hasBall = config.hasBall;
        this.offensivePosition = config.offensivePosition;
        this.defensivePosition = config.defensivePosition;
        this.team = config.team;
        this.entityType = "Player";
        this.id = config.id;
        this.side = config.team === "Home" ? "Offense" : "Defense";
        this.isSelected = false;
        this.canReceivePass = config.canReceivePass || false;

        this.targetCircle = scene.add.circle(x, y, 7, gameConfig.colors.targetCircle);
        this.targetCircle.setVisible(false);

        this.debugText = null;
        this.debugText = scene.add.text(x, y, String(this.id), {
            fontSize: "22px",
            fill: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(10000);

        if (config.hasBall) {
            this.fillColor = gameConfig.colors.ballCarrier;
        }

        config.group.add(this);
        scene.matter.add.gameObject(this, { ...config.physicsConfig });

        this.setInteractive({ useHandCursor: true });
        scene.input.setDraggable(this);

        if (this.body) {
            scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
            scene.matter.body.setAngularVelocity(this.body, 0);
        }

        this.rotationHandle = scene.add.circle(x, y + 40, 8, gameConfig.colors.rotationHandle);
        this.rotationHandle.setVisible(false);
        this.rotationHandle.setInteractive({ useHandCursor: true });
        this.rotationHandle.player = this;
        this.rotationHandle.setDepth(100);
        scene.input.setDraggable(this.rotationHandle);
    }

    setHasBall(hasBall) {
        this.hasBall = hasBall;
        if (hasBall) {
            this.fillColor = gameConfig.colors.ballCarrier
        } else {
            this.fillColor = this.team === "Home" ? gameConfig.colors.home : gameConfig.colors.away;
        }
    }

    stop() {
        if (this.body) {
            try {
                this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
                this.scene.matter.body.setAngularVelocity(this.body, 0);
            } catch (e) {
                error("Error stopping player:", e);
            }
        }
    }

    makeDynamic() {
        if (this.body && this.body.isStatic) {
            try {
                this.scene.matter.body.setStatic(this.body, false);
            } catch (e) {
                // ignore
            }
        }
    }

    resetPosition(game) {
        try {
            this.scene.matter.body.setStatic(this.body, false);
            this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
            this.scene.matter.body.setAngle(this.body, this.baseAngle);
            this.scene.matter.body.setAngularVelocity(this.body, 0);
            this.setAngle(Phaser.Math.RadToDeg(this.baseAngle));
            this.currentAngle = this.baseAngle;
            this.veerMomentum = this.initialVeerMomentum;
            this.veerTargetDirection = this.initialVeerTargetDirection;

            const losX = game.lineOfScrimmage.x;
            const isOffense = this.team === game.possession;

            let targetX, targetY;

            if (isOffense) {
                const dirMult = game.targetEndzone === "Right" ? 1 : -1;
                const formationConfig = gameConfig.formations.offense[game.formation];
                let posConfig = formationConfig.positions[this.offensivePosition] || { xOffset: 0, yOffset: 0 };

                const offenseBackedup = game.targetEndzone === "Right"
                    ? losX < 280
                    : losX > 1320;
                if (offenseBackedup && formationConfig.backedUp && formationConfig.backedUp[this.offensivePosition]) {
                    posConfig = formationConfig.backedUp[this.offensivePosition];
                }

                targetX = losX + posConfig.xOffset * dirMult;
                targetY = this.origY + posConfig.yOffset;

                const fieldLeftBound = game.margin + 5;
                const fieldRightBound = game.margin + game.fieldWidth - 5;
                targetX = Math.max(fieldLeftBound, Math.min(fieldRightBound, targetX));
            } else {
                const dirMult = game.targetEndzone === "Right" ? 1 : -1;
                const formationConfig = gameConfig.formations.defense[game.defensiveFormation];
                const posConfig = formationConfig.positions[this.defensivePosition] || { xOffset: 0, yOffset: 0 };

                targetX = losX + posConfig.xOffset * dirMult;
                targetY = this.origY + posConfig.yOffset;
            }
            
            if (!this.teea)
            this.setPosition(targetX, targetY);
            this.initialX = targetX;
            this.initialY = targetY;
            if (this.body) {
                this.scene.matter.body.setPosition(this.body, { x: targetX, y: targetY });
            }
        } catch (e) {
            error("Error resetting player state:", e);
        }
    }


    teamHasPossession(game) {
        return this.team === game.possession;
    }

    applyFormation(xOffset, yOffset, losX, directionMultiplier) {
        const finalX = losX + xOffset * directionMultiplier;
        const finalY = this.origY + yOffset;

        this.initialX = finalX;
        this.initialY = finalY;

        this.setPosition(finalX, finalY);
        if (this.body) {
            this.scene.matter.body.setPosition(this.body, { x: finalX, y: finalY });
        }
    }

    setTeamColor(color) {
        this.fillColor = color;
    }

    updateVeer(dt, params) {
        if (!this.body || !this.active) return null;

        let currentAngle = this.currentAngle;
        let momentum = this.veerMomentum;
        let targetDir = this.veerTargetDirection;
        const movementBaseAngle = currentAngle;

        if (Math.random() < params.veerTargetFlipChance * dt) {
            targetDir *= -1;
            this.veerTargetDirection = targetDir;
        }

        const targetMomentum = targetDir * params.maxVeerMomentum;
        const correction = (targetMomentum - momentum) * params.veerCorrectionRate * dt;
        momentum += correction;
        momentum *= Math.pow(params.veerInertiaFactor, dt);
        momentum = Phaser.Math.Clamp(momentum, -params.maxVeerMomentum, params.maxVeerMomentum);
        this.veerMomentum = momentum;

        currentAngle += momentum * dt;

        let deviation = Phaser.Math.Angle.ShortestBetween(movementBaseAngle, currentAngle);
        deviation = Phaser.Math.Clamp(deviation, -params.maxVeerAngle, params.maxVeerAngle);
        currentAngle = movementBaseAngle + deviation;

        this.currentAngle = currentAngle;
        this.scene.matter.body.setAngle(this.body, currentAngle);

        return { currentAngle, movementBaseAngle };
    }

    applyMovementForce(dt, baseForceMagnitude, teamSign, directionSign, vibrationStrength) {
        const currentAngle = this.currentAngle;

        const forceX = Math.cos(currentAngle) * baseForceMagnitude * teamSign * directionSign;
        const forceY = Math.sin(currentAngle) * baseForceMagnitude * teamSign * directionSign;

        this.scene.matter.body.applyForce(this.body, this.body.position, { x: forceX, y: forceY });

        const randomForceX = (Math.random() - 0.5) * 2 * vibrationStrength * dt;
        const randomForceY = (Math.random() - 0.5) * 2 * vibrationStrength * dt;
        this.scene.matter.applyForce(this, { x: randomForceX, y: randomForceY });
    }

    deselect() {
        this.isSelected = false;
        if (this._testDot) {
            this._testDot.destroy();
            this._testDot = null;
        }
    }

    resetColor() {
        if (this.hasBall) {
            this.fillColor = gameConfig.colors.ballCarrier;
        } else {
            this.fillColor = this.team === "Home" ? gameConfig.colors.home : gameConfig.colors.away;
        }
    }

    setBaseAngle(angle) {
        this.baseAngle = angle;
        this.currentAngle = angle;
        if (this.body) {
            this.scene.matter.body.setAngle(this.body, angle);
        } else {
            this.setRotation(angle);
        }
    }

    updateDebugText() {
        if (this.debugText) {
            this.debugText.setPosition(this.x, this.y);
        }
    }

    logPlayer() {
        log("--- Player Info ---");
        log("id:", this.id);
        log("team:", this.team);
        log("side:", this.side);
        log("entityType:", this.entityType);
        log("offensivePosition:", this.offensivePosition);
        log("defensivePosition:", this.defensivePosition);
        log("hasBall:", this.hasBall);
        log("canReceivePass:", this.canReceivePass);
        log("isSelected:", this.isSelected);
        log("x:", this.x, "y:", this.y);
        log("initialX:", this.initialX, "initialY:", this.initialY);
        log("origX:", this.origX, "origY:", this.origY);
        log("baseAngle:", this.baseAngle);
        log("currentAngle:", this.currentAngle);
        log("initialVeerMomentum:", this.initialVeerMomentum);
        log("veerMomentum:", this.veerMomentum);
        log("initialVeerTargetDirection:", this.initialVeerTargetDirection);
        log("veerTargetDirection:", this.veerTargetDirection);
        log("fillColor:", this.fillColor);
        log("-------------------");
    }
}
