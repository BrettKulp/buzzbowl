import { Scene } from "phaser";
import { Player } from "../Player";
import { Button } from "../Button";
import { EndZone } from "../EndZone";
import { Popup } from "../Popup";
import { Scoreboard } from "../Scoreboard";
import { FieldMarker } from "../FieldMarker";
import config from "../configLoader.js";
import { log } from "../logger";
import { yardsToPixels, getHomePlayers, getAwayPlayers, getAllPlayers, deselectAllPlayers } from "../helpers";
import { FormationManager } from "../FormationManager";
import { PlayStateManager } from "../PlayStateManager";

export class StandardGame extends Scene {
    constructor() {
        super("StandardGame");
        this.home = null;
        this.away = null;
        this.vibrationStrength = config.physics.vibrationStrength;
        this.possession = "Home";
        
        this.awayColor = config.colors.away;
        this.homeColor = config.colors.home;
        this.ballCarrierColor = config.colors.ballCarrier;

        // Canvas dimensions and layout
        this.canvasWidth = config.canvas.width;
        this.canvasHeight = config.canvas.height;
        this.scoreboardHeight = config.layout.scoreboardHeight;
        this.controlsHeight = config.layout.controlsHeight;
        
        // Field dimensions
        this.margin = config.layout.margin;
        this.fieldHeight = this.canvasHeight - this.scoreboardHeight - this.controlsHeight - this.margin * 2;
        this.fieldWidth = this.canvasWidth - this.margin * 2;
        
        // Adjust field position to account for scoreboard area
        this.fieldY = this.scoreboardHeight + this.margin;
        this.centerY = this.fieldY + this.fieldHeight / 2;
        
        // Line of scrimmage as an object
        this.lineOfScrimmage = {
            x: config.field.lineOfScrimmageX,
            previousX: null,
            marker: null
        };

        this.firstDownMarker = {
            x: this.lineOfScrimmage.x + yardsToPixels(config.field.yardsToFirstDown),
            marker: null
        }

        this.scored = false;
        this.framesAfterScore = 40;
        this.playType = "Run";
	    this.defensiveFormation = "4-3";
        this.startY = this.centerY; 
        this.QBPassOffset = config.players.qbPassOffset;
        
        // UI elements
        this.startButton = null;
        this.pauseButton = null;
        this.nextPlayButton = null;
        this.resetButton = null;
        this.playTypeButtons = null;
        this.playTypeText = "Run";
        this.defensiveFormationText = "4-3";
        this.formation = "I";
        this.formationText = null;

        // --- Veering Parameters ---
        this.maxVeerAngle = config.veering.maxAngle;
        this.veerCorrectionRate = config.veering.correctionRate;
        this.veerInertiaFactor = config.veering.inertiaFactor;
        this.maxVeerMomentum = config.veering.maxMomentum;
        this.veerTargetFlipChance = config.veering.targetFlipChance;

        // --- Game State ---
        this.playStarted = false;
        this.playPaused = false;
        this.playPausedBeforeSnap = true;
        this.passAttempted = false;
        this.turnoverOnDowns = false;
        this.offenseMovingRight = true;
        this.targetEndzone = "Right"; // which endzone the offense is attacking
        this.possession = "Home";
        this.down = 1;
        this.downLabels = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
        this.scramble = false;
        this.homeScore = 0;
        this.awayScore = 0;

        // --- Drag State ---
        this.draggedPlayer = null;
        this.draggingRotationHandle = null;

        // Managers (initialized after scene is ready)
        this.formationManager = null;
        this.playStateManager = null;
    }

    preload() {
        this.load.image('rotationArrows', 'assets/rotationArrows.png');
    }

    create() {
        this.formationManager = new FormationManager(this);
        this.playStateManager = new PlayStateManager(this);

        this.createField();
        this.createPlayers();
        this.setupEventHandlers();
        this.createUI();
        this.downLabel = "Down";
        
        
        // Set initial game state
        this.playStarted = false;
        this.playPaused = false;
        this.playPausedBeforeSnap = true;
        
        // Set up initial formations and play type
        this.changePlayType();
        this.changePlayType(); // Call twice to reset to current type
        this.changeDefensiveFormation();
        this.changeDefensiveFormation();
        this.changeformation();
        this.changeformation();
        
    }
    
    createField() {
        const c = config.colors;
        const endZoneWidth = config.layout.endZoneWidth;
        
        // Background for entire canvas
        this.add.rectangle(
            this.canvasWidth / 2,
            this.canvasHeight / 2,
            this.canvasWidth,
            this.canvasHeight,
            c.background
        );
        
        // Scoreboard area background
        this.add.rectangle(
            this.canvasWidth / 2, 
            this.scoreboardHeight / 2, 
            this.canvasWidth, 
            this.scoreboardHeight, 
            c.uiBackground
        );
        
        // Controls area background
        this.add.rectangle(
            this.canvasWidth / 2, 
            this.canvasHeight - this.controlsHeight / 2, 
            this.canvasWidth, 
            this.controlsHeight, 
            c.uiBackground
        );
        
        // Set up physics world bounds adjusted for field position
        this.matter.world.setBounds(
            this.margin, 
            this.fieldY, 
            this.fieldWidth, 
            this.fieldHeight
        );
        
        const field = this.add.graphics();
        field.fillStyle(c.field, 1);
        field.fillRect(this.margin, this.fieldY, this.fieldWidth, this.fieldHeight);
        
        // Field border and yard lines
        field.lineStyle(4, c.sideline, 1);
        field.strokeRect(this.margin, this.fieldY, this.fieldWidth, this.fieldHeight);

        const playableFieldWidth = 1320;
        const yardLineSpacing = playableFieldWidth / 10;
        
        for (let i = 0; i <= 12; i++) {
            let x;
            if (i === 0) {
                x = this.margin;
            } else if (i === 12) {
                x = this.margin + this.fieldWidth;
            } else {
                x = this.margin + endZoneWidth + (i - 1) * yardLineSpacing;
                field.lineStyle(2, c.sideline, 1);
                field.beginPath();
                field.moveTo(x, this.fieldY);
                field.lineTo(x, this.fieldY + this.fieldHeight);
                field.strokePath();
                
                for (let n = 0; n <= 9; n++) {
                    field.beginPath();
                    field.moveTo(
                        x + (yardLineSpacing / 10) * n,
                        this.fieldY + this.fieldHeight * 0.35
                    );
                    field.lineTo(
                        x + (yardLineSpacing / 10) * n,
                        this.fieldY + this.fieldHeight * 0.35 + 20
                    );
                    field.strokePath();
                    
                    field.beginPath();
                    field.moveTo(
                        x + (yardLineSpacing / 10) * n,
                        this.fieldY + this.fieldHeight * 0.65
                    );
                    field.lineTo(
                        x + (yardLineSpacing / 10) * n,
                        this.fieldY + this.fieldHeight * 0.65 + 20
                    );
                    field.strokePath();
                }
            }
        }
        
        // End zones
        field.fillStyle(c.endZone, 1);
        field.fillRect(
            this.margin + 2, 
            this.fieldY + 4, 
            endZoneWidth - 4, 
            this.fieldHeight - 8
        );
        field.fillRect(
            this.margin + this.fieldWidth - endZoneWidth - 6,
            this.fieldY + 4,
            endZoneWidth + 2,
            this.fieldHeight - 8
        );

        // Sidelines for collision detection
        new EndZone(this, 800, this.fieldY + 1, 1320, 4, {
            fillColor: c.sideline,
            name: "TopSideline",
            type: "SideLine",
            isStatic: true
        });
        new EndZone(this, 800, this.fieldY + this.fieldHeight - 1, 1320, 4, {
            fillColor: c.sideline,
            name: "BottomSideline",
            type: "SideLine",
            isStatic: true
        });

        // Sideline physics barriers
        const topBarrier = this.add.rectangle(800, this.fieldY + 1, 1320, 6);
        topBarrier.setVisible(false);
        this.matter.add.gameObject(topBarrier, { isStatic: true, isSensor: false });
        this.fieldBarriers = [topBarrier];

        const bottomBarrier = this.add.rectangle(800, this.fieldY + this.fieldHeight - 1, 1320, 6);
        bottomBarrier.setVisible(false);
        this.matter.add.gameObject(bottomBarrier, { isStatic: true, isSensor: false });
        this.fieldBarriers.push(bottomBarrier);

        // End zones
        new EndZone(this, 79, this.fieldY + this.fieldHeight / 2, 130, this.fieldHeight + 30, {
            stroke: true,
            name: "LeftEndZone"
        });
        new EndZone(this, 1519, this.fieldY + this.fieldHeight / 2, 130, this.fieldHeight + 30, {
            stroke: true,
            name: "RightEndZone"
        });

        this.lineOfScrimmage.marker = new FieldMarker(
            this,
            this.lineOfScrimmage.x,
            this.startY,
            this.fieldHeight - 4.5,
            c.lineOfScrimmage
        );

        const losBarrierRect = this.add.rectangle(
            this.lineOfScrimmage.x,
            this.startY,
            6,
            this.fieldHeight
        );
        losBarrierRect.setVisible(false);
        this.matter.add.gameObject(losBarrierRect, { isStatic: true, isSensor: false });
        this.lineOfScrimmage.barrier = losBarrierRect;

        this.firstDownMarker.marker = new FieldMarker(
            this,
            this.lineOfScrimmage.x + yardsToPixels(config.field.yardsToFirstDown),
            this.startY,
            this.fieldHeight,
            c.firstDown
        );

        // Scoreboard
        this.scoreboard = new Scoreboard(this, {
            canvasWidth: this.canvasWidth,
            homeScore: this.homeScore,
            awayScore: this.awayScore,
            homeColor: this.homeColor,
            awayColor: this.awayColor,
            downLabels: { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" },
            down: this.down,
            downX: 230
        });
    }
    
    createPlayers() {
        const losX = this.lineOfScrimmage.x;
        const centerY = this.centerY;

        this.home = this.add.group();
        this.away = this.add.group();

        const playerCategory = this.matter.world.nextCategory();

        const playerConfig = {
            friction: 0.1,
            frictionAir: 0.01,
            restitution: 0,
            density: 0.00125,
            angle: 0,
            collisionFilter: { category: playerCategory },
            isStatic: false,
        };

        const offConfig = config.formations.offense[this.formation];
        const defConfig = config.formations.defense[this.defensiveFormation];

        const playerMap = {};

        for (const [posName, posData] of Object.entries(offConfig.positions)) {
            if (!playerMap[posData.homePlayerId]) playerMap[posData.homePlayerId] = {};
            playerMap[posData.homePlayerId].offensePosition = posName;
            if (!playerMap[posData.awayPlayerId]) playerMap[posData.awayPlayerId] = {};
            playerMap[posData.awayPlayerId].offensePosition = posName;
        }

        for (const [posName, posData] of Object.entries(defConfig.positions)) {
            if (!playerMap[posData.homePlayerId]) playerMap[posData.homePlayerId] = {};
            playerMap[posData.homePlayerId].defensePosition = posName;
            if (!playerMap[posData.awayPlayerId]) playerMap[posData.awayPlayerId] = {};
            playerMap[posData.awayPlayerId].defensePosition = posName;
        }

        const canReceivePass = ["WR_1", "WR_2", "RB", "TE/FB", "TE"];

        for (let id = 1; id <= 11; id++) {
            const data = playerMap[id];
            const yOff = offConfig.positions[data.offensePosition].yOffset;

            new Player(this, losX, centerY + yOff, {
                color: this.homeColor,
                team: "Home",
                id: id,
                offensivePosition: data.offensePosition,
                defensivePosition: data.defensePosition,
                hasBall: offConfig.ballCarrier === data.offensePosition,
                canReceivePass: canReceivePass.includes(data.offensePosition),
                initialX: losX,
                initialY: centerY,
                group: this.home,
                physicsConfig: playerConfig,
            });
        }

        for (let id = 12; id <= 22; id++) {
            const data = playerMap[id];
            const yOff = offConfig.positions[data.offensePosition].yOffset;

            new Player(this, losX, centerY + yOff, {
                color: this.awayColor,
                team: "Away",
                id: id,
                offensivePosition: data.offensePosition,
                defensivePosition: data.defensePosition,
                hasBall: false,
                canReceivePass: canReceivePass.includes(data.offensePosition),
                initialX: losX,
                initialY: centerY,
                group: this.away,
                physicsConfig: playerConfig,
            });
        }

    }

    setupEventHandlers() {
        // Drag handlers
        this.input.on(
            "dragstart",
            (pointer, gameObject) => {
                if (!this.playStarted) {
                    this.draggedPlayer = gameObject;
                    gameObject.setAlpha(0.7);
                    if (gameObject.body) {
                        this.matter.body.setStatic(gameObject.body, true);
                    }
                } else {
                    this.draggedPlayer = null;
                }

                if (gameObject.player) {
                    this.rotatingPlayer = gameObject.player;
                }

                if (!this.playStarted && gameObject.name === 'testDot' && gameObject.player) {
                    this.draggingRotationHandle = {
                        dot: gameObject,
                        player: gameObject.player,
                        initialAngle: gameObject.player.currentAngle || 0
                    };
                    gameObject.setAlpha(0.7);
                }
            },
            this
        );

        this.input.on(
            "gameobjectdown",
            (pointer, gameObject) => {

                log("Object clicked:", gameObject.entityType);
                
                // Handle player selection for rotation
                if (!this.playStarted && gameObject.entityType === "Player") {
                    log("Player selected:", gameObject.x, gameObject.y);
                    log("Id: ", gameObject.id); 
                    log("off pos:", gameObject.offensivePosition);
                    log("Team has possession", gameObject.teamHasPossession(this));
                    log("Posseession", this.possession);
                    log("player has ball", gameObject.hasBall);
                    // Remove any existing dots from all players
                    deselectAllPlayers(this);
                    
                    // Get the player's current angle to position the dot correctly
                    const currentAngle = gameObject.currentAngle || 0;
                    
                    // Create a bright red dot positioned based on current angle
                    const arrowSprite = this.add.sprite(
                        gameObject.x + Math.cos(currentAngle) * 35, 
                        gameObject.y + Math.sin(currentAngle) * 35, 
                        'rotationArrows'
                    );
                    arrowSprite.setDepth(9999);
                    arrowSprite.setRotation(currentAngle + Math.PI / 2); // ← ADD THIS LINE
                    
                    // Make the sprite interactive and draggable
                    arrowSprite.setInteractive({ useHandCursor: true });
                    arrowSprite.name = 'testDot';
                    arrowSprite.player = gameObject;
                    this.input.setDraggable(arrowSprite);
                    
                    // Store on player using a simple property
                    gameObject._testDot = arrowSprite;
                    
                    log("Created arrow sprite:", arrowSprite);
                    // Mark the player as selected
                    gameObject.isSelected = true;
                }
                
                // Handle pass completion logic
                if (!this.passAttempted && 
                    gameObject.body && 
                    this.playType === "Pass" && 
                    gameObject.offensivePosition !== "QB" && 
                    (this.playStarted || this.playPaused) && gameObject.teamHasPossession(this) && !this.scramble) {
                    
                    const position = gameObject.offensivePosition;
                    
                    let offensivePlayers;

                    if (this.possession === "Home"){
                        offensivePlayers = getHomePlayers(this);
                    } else {
                        offensivePlayers = getAwayPlayers(this);
                    }
        
                    if (["WR_1", "WR_2", "RB", "TE/FB", "TE"].includes(position)) {
                        const rand = Math.random();
                        if (rand < 0.7) {
                            // Clear any previous ball carrier
                            const offTeamColor = this.possession === "Home" ? this.homeColor : this.awayColor;
                            offensivePlayers.forEach(player => {
                                if (player.hasBall) {
                                    player.hasBall = false;
                                    player.fillColor = offTeamColor;
                                }
                            });
                            
                            // Set the new ball carrier
                            gameObject.hasBall = true;
                            gameObject.fillColor = this.ballCarrierColor;
                        } else {
                            // incomplete pass
                            this.handleTackle(null, null, "Incomplete");
                            this.showIncompleteNextPlay();
                        }
                        
                        this.passAttempted = true;
                    }
                }
            }, 
            this
        );
        
        this.input.on(
            "drag",
            (pointer, gameObject, dragX, dragY) => {
                // Only handle player dragging
                if (
                    gameObject === this.draggedPlayer &&
                    !this.playStarted &&
                    !this.playPaused &&
                    this.playPausedBeforeSnap
                ) {
                    // Your existing position calculation code
                    const losX = this.lineOfScrimmage.x;
                    const team = gameObject.team;
                    let clampedX = dragX;
                    
                    // Position clamping (keep your existing code)
                    const halfSize = Math.max(gameObject.width, gameObject.height) / 2;
                    
                    const isOffense = team === this.possession;
                    if (this.targetEndzone === "Right") {
                        // Offense on left of LOS, defense on right
                        if (isOffense && clampedX + halfSize > losX) clampedX = losX - halfSize;
                        if (!isOffense && clampedX - halfSize < losX) clampedX = losX + halfSize;
                    } else {
                        // Offense on right of LOS, defense on left
                        if (isOffense && clampedX - halfSize < losX) clampedX = losX + halfSize;
                        if (!isOffense && clampedX + halfSize > losX) clampedX = losX - halfSize;
                    }

                    // Clamp to field boundaries
                    clampedX = Math.max(this.margin + halfSize, Math.min(this.margin + this.fieldWidth - halfSize, clampedX));
                    dragY = Math.max(this.fieldY + halfSize, Math.min(this.fieldY + this.fieldHeight - halfSize, dragY));
                    
                    // Update player position
                    gameObject.x = clampedX;
                    gameObject.y = dragY;
                    if (gameObject.body) {
                        this.matter.body.setPosition(gameObject.body, {
                            x: clampedX,
                            y: dragY,
                        });
                    }
                    
                    // Update target circle position
                    if (gameObject.targetCircle) {
                        gameObject.targetCircle.setPosition(clampedX, dragY);
                    }
                    
                    // Update the arrow sprite position based on player's current angle
                    if (gameObject._testDot) {
                        const currentAngle = gameObject.currentAngle || 0;
                        const distance = 35;
                        const newDotX = clampedX + Math.cos(currentAngle) * distance;
                        const newDotY = dragY + Math.sin(currentAngle) * distance;
                        gameObject._testDot.setPosition(newDotX, newDotY);
                        gameObject._testDot.setRotation(currentAngle + Math.PI / 2); // Keep sprite rotated
                    }
                }
                
                // Handle arrow sprite rotation dragging - only when play hasn't started
                if (!this.playStarted && this.draggingRotationHandle && gameObject === this.draggingRotationHandle.dot) {
                    const player = this.draggingRotationHandle.player;
                    
                    // Calculate angle from player center to mouse position
                    const deltaX = dragX - player.x;
                    const deltaY = dragY - player.y;
                    const angle = Math.atan2(deltaY, deltaX);
                    
                    // Keep the arrow sprite exactly 50px away from player center
                    const distance = 35;
                    const newDotX = player.x + Math.cos(angle) * distance;
                    const newDotY = player.y + Math.sin(angle) * distance;
                    
                    // Update sprite position AND rotation
                    gameObject.setPosition(newDotX, newDotY);
                    gameObject.setRotation(angle + Math.PI / 2); // ← FIXED THE TYPO HERE!
                    
                    // Update player's angle data
                    player.currentAngle = angle;
                    
                    // Rotate the player rectangle to face the arrow direction
                    if (player.body) {
                        this.matter.body.setAngle(player.body, angle);
                    } else {
                        // Fallback if no physics body
                        player.setRotation(angle);
                    }
                }
            },
            this
        );
        
        
        this.input.on(
            "dragend",
            (pointer, gameObject) => {
                if (gameObject.player) {
                    this.rotatingPlayer = null;
                    return;
                }

                if (gameObject === this.draggedPlayer && !this.playStarted) {
                    gameObject.setAlpha(1);
                    if (gameObject.body) {
                        this.matter.body.setStatic(gameObject.body, false);
                        this.matter.body.setVelocity(gameObject.body, { x: 0, y: 0 });
                        this.matter.body.setAngularVelocity(gameObject.body, 0);
                        this.matter.body.setPosition(gameObject.body, {
                            x: gameObject.x,
                            y: gameObject.y,
                        });
                    }
                }
                if (this.draggingRotationHandle && gameObject === this.draggingRotationHandle.dot) {
                    gameObject.setAlpha(1);
                    this.draggingRotationHandle = null;
                }
                this.draggedPlayer = null;
            },
            this
        );

        // Collision handler
        this.matter.world.on('collisionstart', (event) => {
            if (!this.playStarted) {
                return;
            }
        
            for (let i = 0; i < event.pairs.length; i++) {
                const bodyA = event.pairs[i].bodyA;
                const bodyB = event.pairs[i].bodyB;
        
                const gameObjectA = bodyA.gameObject;
                const gameObjectB = bodyB.gameObject;
        
                if ((!gameObjectA && !gameObjectB) || gameObjectA?.disabled === true || gameObjectB?.disabled === true) {
                    continue;
                }
        
                let ballCarrier = null;
                let otherPlayer = null;
        
                if (gameObjectA?.hasBall === true) {
                    ballCarrier = gameObjectA;
                    otherPlayer = gameObjectB;
                } else if (gameObjectB?.hasBall === true) {
                    ballCarrier = gameObjectB;
                    otherPlayer = gameObjectA;
                } else {
                    continue;
                }
      
                if (otherPlayer?.entityType === 'SideLine') {
                    this.handleTackle(ballCarrier, otherPlayer, "SideLine");
                    break;
                }

                if (otherPlayer?.entityType === 'EndZone' &&
                    ((this.targetEndzone === "Right" && otherPlayer.name === "RightEndZone") ||
                     (this.targetEndzone === "Left" && otherPlayer.name === "LeftEndZone"))) {
                    log("touchdown in collission detectin with right endzone");
                    this.handleTackle(ballCarrier, otherPlayer, "Touchdown");
                    this.nextPlayButton.enable();
                    this.pausePlay(true);
                    this.playStarted = false;
                    break;
                }

        
                if (
                    otherPlayer?.team &&
                    ballCarrier.team !== otherPlayer.team
                ) {
                    this.handleTackle(ballCarrier, otherPlayer);
                    break;
                }
            }
        });
        
        this.events.on("shutdown", () => {
            this.input.off("dragstart");
            this.input.off("drag");
            this.input.off("dragend");
        });
    }

    
    createUI() {
        const y = this.canvasHeight - this.controlsHeight / 2;
        const buttonWidth = 120;
        const buttonHeight = 75;
        const padding = 22;
        const playTypeSelectorX = 420;
        
        const playTypeSelectorWidth = 230;
        const arrowStyle = { fontSize: "36px", fill: "#fff", fontStyle: "bold" };
        
        // Formation controls
        new Button(this, 50, y + 25, "<", { width: 60, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changeformation());
        
        this.formationText = this.add.text(
            120, y + 25, this.formation,
            { fontSize: "33px", fill: "#fff", fontStyle: "bold" }
        ).setOrigin(0.5);
        
        new Button(this, 190, y + 25, ">", { width: 60, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changeformation());

        // chane formation button
        if (config.debug) {
            new Button(this, this.canvasWidth - 200, 20, "Change Possession", { width: 400, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changePossession());
        }

        // menu buttin TODO make it a settings button

            new Button(this, this.canvasWidth - 200, 50, "Menu", { width: 100, height: 60, labelStyle: arrowStyle })
            .onClick(() => {
                this.pausePlay();
                this.scene.sleep("StandardGame");
                if (this.scene.isSleeping("MainMenu")) {
                    this.scene.wake("MainMenu");
                } else {
                    this.scene.launch("MainMenu");
                }
            });
        
        // Play type controls
        new Button(this, 280, y + 25, "<", { width: 60, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changePlayType());
        
        this.playTypeText = this.add.text(
            360, y + 25, this.playType,
            { fontSize: "33px", fill: "#fff", fontStyle: "bold" }
        ).setOrigin(0.5);
        
        new Button(this, 440, y + 25, ">", { width: 60, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changePlayType());
        
        // Defensive formation controls
        new Button(this, 580, y + 25, "<", { width: 60, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changeDefensiveFormation());
        
        this.defensiveFormationText = this.add.text(
            657, y + 25, this.defensiveFormation,
            { fontSize: "33px", fill: "#fff", fontStyle: "bold" }
        ).setOrigin(0.5);
        
        new Button(this, 740, y + 25, ">", { width: 60, height: 60, labelStyle: arrowStyle })
            .onClick(() => this.changeDefensiveFormation());
        
        // Control buttons
        let nextX = 250 + playTypeSelectorX + playTypeSelectorWidth / 2 + padding + buttonWidth / 2;
    
        this.startButton = new Button(this, nextX, y + 25, 'Start', { width: buttonWidth, height: buttonHeight });
        this.startButton.onClick(() => {
            if (!this.playStarted) {
                this.startPlay();
            }
        });

        // Popups
        this.incompletePopup = new Popup(this, nextX, this.canvasHeight / 2, 'Incomplete');
        this.incompletePopup.onClick(() => {
            this.nextPlay();
            this.hideUIPopups();
        });

        this.downPopup = new Popup(this, nextX - 120, this.canvasHeight / 2, 'Down!');
        this.downPopup.onClick(() => {
            this.nextPlay();
            this.hideUIPopups();
        });

        this.turnoverPopup = new Popup(this, nextX - 120, this.canvasHeight / 2, 'Turnover on downs!', { width: 340 });
        this.turnoverPopup.onClick(() => {
            this.nextPlay();
            this.hideUIPopups();
        });

        this.touchdownPopup = new Popup(this, nextX - 120, this.canvasHeight / 2, 'Touchdown');
        this.touchdownPopup.onClick(() => {
            this.hideUIPopups();
            this.changePossession();
        });

        nextX += buttonWidth + padding;
        this.pauseButton = new Button(this, nextX, y + 25, 'Pause', { width: buttonWidth, height: buttonHeight });
        this.pauseButton.onClick(() => {
            if (this.playStarted) {
                this.pausePlay();
            }
        });
    
        nextX += buttonWidth + padding;
        this.nextPlayButton = new Button(this, nextX + 30, y + 25, 'Next Play', { width: buttonWidth + 55, height: buttonHeight });
        this.nextPlayButton.onClick(() => this.nextPlay());

        this.resetGameButton = new Button(this, nextX + 220, y + 25, 'Restart', { width: buttonWidth + 30, height: buttonHeight });
        this.resetGameButton.onClick(() => this.restart());

        this.nextPlayButton.disable();
    }
    

   update(time, delta) {
    const allPlayers = getAllPlayers(this);

    // Pre-snap: prevent any non-dragged player from crossing the LOS
    if (!this.playStarted && this.playPausedBeforeSnap) {
        const losX = this.lineOfScrimmage.x;
        const halfSize = 30; // half of player width (60)
        for (let i = 0; i < allPlayers.length; i++) {
            const player = allPlayers[i];
            if (!player || !player.active) continue;
            if (player === this.draggedPlayer) continue;

            const isOffense = player.teamHasPossession(this);
            const shouldBeLeft = (isOffense && this.offenseMovingRight) ||
                                 (!isOffense && !this.offenseMovingRight);

            let crossed = false;
            let newX;
            if (shouldBeLeft && player.x + halfSize > losX) {
                newX = losX - halfSize;
                crossed = true;
            } else if (!shouldBeLeft && player.x - halfSize < losX) {
                newX = losX + halfSize;
                crossed = true;
            }

            if (crossed) {
                log(
                    `[LOS Enforce] Player ${player.id} (${player.team}) pushed back from x=${player.x.toFixed(1)} to x=${newX.toFixed(1)} | LOS x=${losX}`
                );
                player.x = newX;
                if (player.body) {
                    this.matter.body.setPosition(player.body, { x: newX, y: player.y });
                    this.matter.body.setVelocity(player.body, { x: 0, y: 0 });
                }
            }
        }
    }

    // Single pass: update UI elements + movement forces
    const isPlaying = this.playStarted && !this.scored;
    let ballCarrier = null;

    for (let i = 0; i < allPlayers.length; i++) {
        const player = allPlayers[i];
        if (!player || !player.active) continue;

        // Rotation handle position
        if (player.rotationHandle && player.rotationHandle.visible) {
            const angle = player.currentAngle;
            player.rotationHandle.setPosition(
                player.x + Math.cos(angle) * 40,
                player.y + Math.sin(angle) * 40
            );
        }

        // Target circle + debug text
        if (player.targetCircle) {
            player.targetCircle.setPosition(player.x, player.y);
        }
        if (player.updateDebugText) {
            player.updateDebugText();
        }

        // Track ball carrier during play
        if (isPlaying && player.hasBall === true && player.teamHasPossession(this)) {
            ballCarrier = player;
        }
    }

    if (this.scored && this.framesAfterScore > 0) {
        this.framesAfterScore--;
        if (Number(this.framesAfterScore) < 1) {
            this.pausePlay();
        }
        return;
    }

    // Touchdown check
    if (ballCarrier) {
        const rightEndZoneLeft = 1454;
        const leftEndZoneRight = 144;
        if (this.targetEndzone === "Right" && ballCarrier.x > rightEndZoneLeft) {
            this.handleTackle(ballCarrier, null, "Touchdown");
            this.showTouchdownUI();
            this.scored = true;
        } else if (this.targetEndzone === "Left" && ballCarrier.x < leftEndZoneRight) {
            this.handleTackle(ballCarrier, null, "Touchdown");
            this.showTouchdownUI();
            this.scored = true;
        }
    }

    // Apply movement forces
    if (this.playStarted) {
        const baseForceMagnitude = 0.0004;
        const dt = delta / 16.667;
        const endzoneDir = this.targetEndzone === "Right" ? 1 : -1;

        for (let i = 0; i < allPlayers.length; i++) {
            const player = allPlayers[i];
            if (!player.body || !player.active) continue;

            const veerParams = {
                veerTargetFlipChance: this.veerTargetFlipChance,
                maxVeerMomentum: this.maxVeerMomentum,
                veerCorrectionRate: this.veerCorrectionRate,
                veerInertiaFactor: this.veerInertiaFactor,
                maxVeerAngle: this.maxVeerAngle
            };

            player.updateVeer(dt, veerParams);

            const teamSign = player.team === "Home" ? 1 : -1;
            let directionSign = player.teamHasPossession(this) ? endzoneDir : -endzoneDir;
            if (this.playType === "Pass" && player.offensivePosition === "QB" && player.teamHasPossession(this)) {
                directionSign = -.01 * endzoneDir;
            }
            player.applyMovementForce(dt, baseForceMagnitude, teamSign, directionSign, this.vibrationStrength);
            this.updateTargetCircle(player)

        }
    }
}

    updateTargetCircle(player) {
        log(player);
        //log("cheking target circle in update method", player.logPlayer())
            if (player.targetCircle && !this.playPaused && this.playType === "Pass" &&
               player.canReceivePass &&
                player.teamHasPossession(this) && !this.scramble) {
                player.targetCircle.setVisible(true);
                player.targetCircle.setPosition(player.x, player.y);
            }
            if (player.targetCircle && this.scramble) {
                player.targetCircle.setVisible(false);
            }

            if (!player.teamHasPossession(this) && player.targetCircle) {
                log("removeing target circle");
         //       player.logPlayer();
                player.targetCircle.setVisible(false);
            } else {
                log("not remogin target circle because player team does have possession",);
          //      player.logPlayer();
            }
    }

    hideUIPopups() {
        this.incompletePopup.hide();
        this.downPopup.hide();
        this.touchdownPopup.hide();
        this.turnoverPopup.hide();
        deselectAllPlayers(this);
    }
    
    showIncompleteNextPlay() {
        this.incompletePopup.show();
    }

    showTouchdownUI() {
        this.touchdownPopup.show();
    }

    showDownUI() {
        if (this.turnoverOnDowns) {
            this.turnoverPopup.show();
        } else {
            this.downPopup.show();
        }
    }

    updateLOSBarrier(x) {
        if (this.lineOfScrimmage.barrier && this.lineOfScrimmage.barrier.body) {
            this.lineOfScrimmage.barrier.x = x;
            this.matter.body.setPosition(this.lineOfScrimmage.barrier.body, { x, y: this.startY });
        }
    }

    setLOSBarrierSensor(isSensor) {
        if (this.lineOfScrimmage.barrier && this.lineOfScrimmage.barrier.body) {
            this.lineOfScrimmage.barrier.body.isSensor = isSensor;
        }
        if (this.fieldBarriers) {
            this.fieldBarriers.forEach(barrier => {
                if (barrier.body) barrier.body.isSensor = isSensor;
            });
        }
    }

    // --- Delegated methods ---

    changeformation() {
        this.formationManager.toggleOffensiveFormation();
    }

    changeDefensiveFormation() {
        this.formationManager.toggleDefensiveFormation();
    }

    changePlayType() {
        this.formationManager.togglePlayType();
    }

    checkBallCarrier() {
        this.formationManager.checkBallCarrier();
    }

    changePossession(keepLOS = false) {
        this.playStateManager.changePossession(keepLOS);
    }

    startPlay() {
        this.playStateManager.startPlay();
    }

    pausePlay(ballCarrierDown) {
        this.playStateManager.pausePlay(ballCarrierDown);
    }

    nextPlay() {
        this.playStateManager.nextPlay();
    }

    handleTackle(ballCarrier, tackler, type) {
        this.playStateManager.handleTackle(ballCarrier, tackler, type);
    }

    incrementDown() {
        this.playStateManager.incrementDown();
    }
}
