import config from "./configLoader.js";
import { yardsToPixels, pixelsToYards, getOffensivePlayers, getDefensivePlayers, getAllPlayers, deselectAllPlayers } from "./helpers.js";
import { log } from "./logger";

export class PlayStateManager {
    constructor(game) {
        this.game = game;
    }

    startPlay() {
        if (this.game.playStarted) return;

        deselectAllPlayers(this.game);
        this.game.playStarted = true;
        this.game.playPaused = false;
        this.game.playPausedBeforeSnap = false;
        this.game.lineOfScrimmage.previousX = this.game.lineOfScrimmage.x;
        this.game.snapAt = this.game.time.now;
        this.game.playRecorder.start();

        const snapBallCarrier = getOffensivePlayers(this.game).find(p => p.hasBall);
        this.resetBallCarrierTracking(snapBallCarrier);
        log("play", () =>
            `startPlay: possession=${this.game.possession} down=${this.game.down} ` +
            `LOS=${this.game.lineOfScrimmage.x.toFixed(1)} playType=${this.game.playType} ` +
            `ballCarrier=${snapBallCarrier ? `id=${snapBallCarrier.id} x=${snapBallCarrier.x.toFixed(1)}` : "none"}`
        );

        this.game.setLOSBarrierSensor(true);

        this.game.startButton.disable();
        this.game.nextPlayButton.disable();
        this.game.pauseButton.enable();
        this.game.updateScrambleButton();

        this.forEachPlayer((player) => {
            if (player && player.makeDynamic) {
                player.makeDynamic();
            }
        });
}

    pausePlay(ballCarrierDown) {
        // Above the guard below: ballCarrierDown means the play is over, which is true even
        // if it was already paused -- an incomplete pass can be thrown from a paused play,
        // and leaving the recorder running there makes the next snap append to this play.
        // A mid-play Pause passes no ballCarrierDown, so it keeps recording as intended.
        if (ballCarrierDown) {
            this.game.endPlayRecording();
            // After endPlayRecording(): PlayRecorder.stop() reads passManager.ballInFlight()
            // for the final frame, so tearing the ball down first would record ball: null and
            // undo that. Same ordering lesson as the comment on endPlayRecording() itself.
            this.game.clearPass();
        }

        if (!this.game.playStarted) return;

        this.game.playStarted = false;
        this.game.playPaused = true;

        this.game.setLOSBarrierSensor(false);

        this.forEachPlayer((player) => {
            if (player && player.stop) {
                player.stop();
            }
        });

        if (!ballCarrierDown) {
            this.game.startButton.enable();
        }
        this.game.pauseButton.disable();
    }

    changePossession(keepLOS = false) {
        this.game.clearPass();

        log("play", () =>
            `changePossession: ${this.game.possession} -> ${this.game.possession === "Home" ? "Away" : "Home"} ` +
            `keepLOS=${keepLOS} LOS=${this.game.lineOfScrimmage.x.toFixed(1)}`
        );

        this.game.possession = this.game.possession === "Home" ? "Away" : "Home";
        this.game.targetEndzone = this.game.targetEndzone === "Right" ? "Left" : "Right";
        this.game.offenseMovingRight = this.game.targetEndzone === "Right";
        this.game.down = 1;

        this.resetAllPlayerColors();

        this.game.lineOfScrimmage.previousX = this.game.lineOfScrimmage.x;

        if (!keepLOS) {
            const losResetX = this.game.targetEndzone === "Right"
                ? this.game.canvasWidth * 0.38
                : this.game.canvasWidth * 0.62;
            this.game.lineOfScrimmage.x = losResetX;
            this.game.lineOfScrimmage.marker.updateX(losResetX);
            this.game.updateLOSBarrier(losResetX);
        }

        const fdDirection = this.game.targetEndzone === "Right" ? 1 : -1;
        const fdX = this.game.lineOfScrimmage.x + fdDirection * yardsToPixels(config.field.yardsToFirstDown);
        this.game.firstDownMarker.x = fdX;
        this.game.firstDownMarker.marker.updateX(fdX);

        this.game.scoreboard.updateDown(this.game.downLabels[this.game.down]);

        this.forEachPlayer((player) => {
            if (player && player.resetPosition) {
                player.resetPosition(this.game);
            }
        });

        this.game.checkBallCarrier();

        this.setDefensiveTeamColor();

        this.resetPlayState();
        if (this.game.updateScrambleButton) {
            this.game.updateScrambleButton();
        }
        this.game.startButton.enable();
        this.game.nextPlayButton.disable();
    }
    
    nextPlay() {
        log("play", () =>
            `nextPlay: scored=${this.game.scored} turnoverOnDowns=${this.game.turnoverOnDowns} ` +
            `down=${this.game.down} possession=${this.game.possession}`
        );

        if (this.game.scored) {
            this.changePossession();
        }

        if (this.game.turnoverOnDowns) {
            this.game.turnoverOnDowns = false;
            this.changePossession(true);
        }

        this.pausePlay();
        this.game.hideUIPopups();
        // Covers the review-leak path: exitReviewMode() replays the play's last recorded
        // frame, which now includes the airborne ball of an incomplete pass, and nothing else
        // takes it back down before the next snap.
        this.game.clearPass();
        this.game.playPausedBeforeSnap = true;
        this.game.playStarted = false;
        this.game.playPaused = false;
        this.game.framesAfterScore = 40;

        log("play", () => `new lOS: ${this.game.lineOfScrimmage.x}`);

        this.forEachPlayer((player) => {
            if (player && player.resetPosition) {
                player.resetPosition(this.game);
            }
        });

        this.game.checkBallCarrier();

        this.forEachPlayer((player) => player.updateTargetCircle());

        this.game.scramble = false;
        if (this.game.updateScrambleButton) {
            this.game.updateScrambleButton();
        }

        this.game.startButton.enable();
        this.game.nextPlayButton.disable();
        this.game.playStarted = false;
    }

    handleTackle(ballCarrier, tackler, type) {
        this.game.playPausedBeforeSnap = false;

        const elapsedMs = this.game.snapAt != null ? (this.game.time.now - this.game.snapAt).toFixed(0) : "?";
        const traveled = ballCarrier ? (ballCarrier.x - this.game.lineOfScrimmage.previousX).toFixed(1) : "n/a";
        log("play", () =>
            `handleTackle type=${type || "Tackle"} elapsedMs=${elapsedMs} ` +
            `ballCarrier=${ballCarrier ? `id=${ballCarrier.id} team=${ballCarrier.team} x=${ballCarrier.x.toFixed(1)}` : "none"} ` +
            `tackler=${tackler ? `id=${tackler.id} team=${tackler.team} entityType=${tackler.entityType}` : "none"} ` +
            `traveledSinceSnap=${traveled}px LOS=${this.game.lineOfScrimmage.x.toFixed(1)}`
        );

        if (ballCarrier?.logPlayer) ballCarrier.logPlayer();
        if (tackler?.logPlayer) tackler.logPlayer();

        let tackleX;

        if (ballCarrier) {
            tackleX = ballCarrier.x.toFixed(2);
        } else if (type === "Incomplete") {
            tackleX = this.game.lineOfScrimmage.x;
        }

        if (type === "Touchdown") {
            this.handleTouchdown();
        } else if (type === "Interception") {
            this.handleInterception(ballCarrier);
        } else {
            this.handleNonTouchdown(tackleX, type);
        }
    }

    handleInterception(interceptor) {
        this.game.lineOfScrimmage.previousX = this.game.lineOfScrimmage.x;
        // Spotted exactly where the pick happened, with no direction nudge: handleNonTouchdown's
        // `+ losDir * 30` leans toward the endzone the *old* offense was attacking, which is
        // backwards once possession flips. Same 145/1455 clamp as handleNonTouchdown -- a pick
        // in the endzone becomes a touchback by clamp rather than by a rule.
        const newLOS = Math.max(145, Math.min(1455, interceptor.x));
        this.game.lineOfScrimmage.x = newLOS;
        this.game.lineOfScrimmage.marker.updateX(newLOS);
        this.game.updateLOSBarrier(newLOS);

        // down=1 here, not just via changePossession(true) in nextPlay: handleTackle saves
        // immediately, and loadGame's turnoverOnDowns branch does not reset the down (only
        // `scored` does). Without this, a refresh at the popup resumes on 3rd-and-whatever.
        this.game.down = 1;
        this.game.scoreboard.updateDown(this.game.downLabels[this.game.down]);

        // Reuses the turnover-on-downs handshake: nextPlay() consumes it as
        // changePossession(true), which flips possession and keeps the LOS set above. The name
        // says "on downs"; this is a pick.
        this.game.turnoverOnDowns = true;

        this.game.showInterceptionUI();
        this.game.nextPlayButton.enable();
        this.pausePlay(true);
        this.game.playStarted = false;
    }

    checkBallCarrierMotion(ballCarrier) {
        if ((!this.game.stuckTimeoutEnabled && !this.game.stuckBackwardEnabled) ||
            (ballCarrier.offensivePosition === "QB" && ballCarrier.teamHasPossession(this.game) && this.game.playType === "Pass")) {
            return;
        }

        this.checkStuckMotionless(ballCarrier);
        this.checkStuckBackwards(ballCarrier);
    }

    checkStuckMotionless(ballCarrier) {
        if (!this.game.stuckTimeoutEnabled) return;

        const now = this.game.time.now;
        const x = ballCarrier.x;
        const epsilon = config.standardGame.stuckMotionEpsilonPixels;

        // Anchor-based jitter guard: compare against the position recorded when the
        // still-timer was last reset, not the previous tick. Comparing tick-to-tick would let
        // slow, real creep (sub-epsilon each frame, real movement over a second) never reset
        // the timer.
        if (this.game.ballCarrierStillAtX == null || Math.abs(x - this.game.ballCarrierStillAtX) > epsilon) {
            this.game.ballCarrierStillSince = now;
            this.game.ballCarrierStillAtX = x;
        }

        const motionlessMs = now - this.game.ballCarrierStillSince;
        if (motionlessMs >= this.game.stuckTimeoutSeconds * 1000) {
            log("stuck", () => `motionless ${(motionlessMs / 1000).toFixed(1)}s at x=${x.toFixed(1)}`);
            this.game.handleTackle(ballCarrier, null, "Stuck");
        }
    }

    checkStuckBackwards(ballCarrier) {
        if (!this.game.stuckBackwardEnabled) return;

        const x = ballCarrier.x;
        const movingRight = this.game.targetEndzone === "Right";
        if (this.game.ballCarrierFurthestX == null ||
            (movingRight ? x > this.game.ballCarrierFurthestX : x < this.game.ballCarrierFurthestX)) {
            this.game.ballCarrierFurthestX = x;
        }

        const backwardPx = movingRight
            ? this.game.ballCarrierFurthestX - x
            : x - this.game.ballCarrierFurthestX;
        if (backwardPx >= yardsToPixels(this.game.stuckBackwardYards)) {
            log("stuck", () => `drifted ${pixelsToYards(backwardPx)}yd back from furthest point`);
            this.game.handleTackle(ballCarrier, null, "Stuck");
        }
    }

    // Anchors both stuck-detection trackers to a given ball carrier's current position. Called
    // at snap, and again whenever a pass completion hands the ball to a new carrier -- the QB
    // is exempt from checkBallCarrierMotion entirely while holding the ball on a Pass play, so
    // without this the anchors stay frozen at his snap-time position, and a receiver caught
    // behind that stale point (a checkdown/screen) would fail the backward-drift check on the
    // very next tick despite not having moved at all.
    resetBallCarrierTracking(carrier) {
        this.game.ballCarrierStillSince = this.game.time.now;
        this.game.ballCarrierStillAtX = carrier ? carrier.x : null;
        this.game.ballCarrierFurthestX = carrier ? carrier.x : null;
    }

    handleTouchdown() {
        log("play", () => "Touchdown of " +
            (this.game.lineOfScrimmage.x - this.game.lineOfScrimmage.previousX).toFixed(2) + "px");

        this.game.showTouchdownUI();
        this.game.scored = true;

        if (this.game.possession === "Home") {
            this.game.homeScore += 7;
            this.game.scoreboard.updateScore("Home", this.game.homeScore);
        } else {
            this.game.awayScore += 7;
            this.game.scoreboard.updateScore("Away", this.game.awayScore);
        }
    }

    scramble() {
        this.game.scramble = true;
        this.updateTargetCircles();
        if (this.game.updateScrambleButton) {
            this.game.updateScrambleButton();
        }
    }

    updateTargetCircles() {
        const players = getOffensivePlayers(this.game);

        players.forEach((player) => {
            player.updateTargetCircle();
        });
    }

    handleNonTouchdown(tackleX, type) {
        if (type !== "Incomplete") {
            this.game.lineOfScrimmage.previousX = this.game.lineOfScrimmage.x;
            const losDir = this.game.targetEndzone === "Right" ? 1 : -1;
            let newLOS = Number(tackleX) + losDir * 30;
            if (newLOS < 145) newLOS = 145;
            if (newLOS > 1455) newLOS = 1455;

            this.game.lineOfScrimmage.x = newLOS;
            this.game.lineOfScrimmage.marker.updateX(newLOS);
            this.game.updateLOSBarrier(newLOS);

            const reachedFirstDown = this.game.targetEndzone === "Right"
                ? this.game.lineOfScrimmage.x >= this.game.firstDownMarker.x
                : this.game.lineOfScrimmage.x <= this.game.firstDownMarker.x;

            if (reachedFirstDown) {
                const fdX = newLOS + losDir * (yardsToPixels(10) + 30);
                this.game.firstDownMarker.x = fdX;
                this.game.firstDownMarker.marker.updateX(fdX);
                this.game.down = 1;
                this.game.scoreboard.updateDown(this.game.downLabels[this.game.down]);
            } else {
                this.incrementDown();
            }
            log("play", () =>
                `handleNonTouchdown: newLOS=${newLOS.toFixed(1)} firstDownMarker=${this.game.firstDownMarker.x.toFixed(1)} ` +
                `reachedFirstDown=${reachedFirstDown} down=${this.game.down} turnoverOnDowns=${this.game.turnoverOnDowns}`
            );
            this.game.showDownUI();
        } else if (type === "Incomplete") {
            this.incrementDown();
        }

        this.game.nextPlayButton.enable();
        this.pausePlay(true);
        this.game.playStarted = false;
    }

    incrementDown() {
        this.game.down++;
        if (this.game.down > 4) {
            this.game.down = 1;
            this.game.turnoverOnDowns = true;
        }
        this.game.scoreboard.updateDown(this.game.downLabels[this.game.down]);
    }

    forEachPlayer(callback) {
        getAllPlayers(this.game).forEach(callback);
    }

    resetAllPlayerColors() {
        getAllPlayers(this.game).forEach(player => {
            player.hasBall = false;
            player.fillColor = player.team === "Home" ? this.game.homeColor : this.game.awayColor;
            player.updateTargetCircle();
        });
    }

    setDefensiveTeamColor() {
        const defPlayers = getDefensivePlayers(this.game);
        const defTeamColor = this.game.possession === "Home" ? this.game.awayColor : this.game.homeColor;
        defPlayers.forEach(player => { player.fillColor = defTeamColor; });
    }

    resetPlayState() {
        this.game.scored = false;
        this.game.playStarted = false;
        this.game.playPaused = false;
        this.game.playPausedBeforeSnap = true;
        this.game.framesAfterScore = 120;
        this.game.scramble = false;
    }
}
