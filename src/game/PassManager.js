import config from "./configLoader.js";
import { log } from "./logger";
import { getAllPlayers } from "./helpers";

const passingConfig = config.passing;

// Slingshot inversion: the throw lands on the opposite side of the origin from the drag
// point, scaled by drag distance. Field clamp last -- landing spots are guaranteed on-field
// so resolution never needs an out-of-bounds rule.
export function aimToTarget(origin, dragX, dragY, bounds, tuning) {
    const dx = dragX - origin.x;
    const dy = dragY - origin.y;
    const dragDistance = Math.hypot(dx, dy);
    if (dragDistance < tuning.minDragPixels) return null;

    const throwDistance = Math.min(dragDistance * tuning.dragToDistanceMultiplier, tuning.maxRangePixels);
    const scale = throwDistance / dragDistance;

    const x = Math.max(bounds.left, Math.min(bounds.right, origin.x - dx * scale));
    const y = Math.max(bounds.top, Math.min(bounds.bottom, origin.y - dy * scale));

    return { x, y };
}

// Nearest player to the landing spot wins it. Offensive players not on the canReceivePass
// list (including the QB) are skipped entirely; any defender is eligible to intercept.
export function findPassOutcome(landing, players, { catchRadiusPixels, possession }) {
    let nearest = null;
    let nearestDistSq = Infinity;

    for (const player of players) {
        const isOffense = player.team === possession;
        if (isOffense && !player.canReceivePass) continue;

        const dx = player.x - landing.x;
        const dy = player.y - landing.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearest = player;
        }
    }

    if (!nearest || nearestDistSq > catchRadiusPixels ** 2) {
        return { outcome: "Incomplete", player: null };
    }

    return { outcome: nearest.team === possession ? "Catch" : "Interception", player: nearest };
}

export class PassManager {
    constructor(game) {
        this.game = game;

        this.ball = game.add.circle(0, 0, passingConfig.ballRadiusPixels, config.colors.ball);
        this.ball.setDepth(9998);
        this.ball.setVisible(false);

        this.aimGraphics = game.add.graphics();
        this.aimGraphics.setDepth(9998);

        this.isAiming = false;
        this.aimingPlayer = null;
        this.aimOrigin = null;
        this.aimTarget = null;
        this.flight = null;
    }

    canAim(gameObject) {
        const game = this.game;
        return game.playPaused
            && !game.playPausedBeforeSnap
            && !game.activeResultPopup
            && !game.reviewMode
            && game.playType === "Pass"
            && gameObject?.entityType === "Player"
            && gameObject.offensivePosition === "QB"
            && gameObject.hasBall
            && gameObject.teamHasPossession(game);
    }

    tryBeginAim(gameObject) {
        if (!this.canAim(gameObject)) return false;

        this.isAiming = true;
        this.aimingPlayer = gameObject;
        this.aimOrigin = { x: gameObject.x, y: gameObject.y };
        this.aimTarget = null;
        this.aimGraphics.clear();
        return true;
    }

    updateAim(gameObject, dragX, dragY) {
        if (!this.isAiming || gameObject !== this.aimingPlayer) return false;

        this.aimTarget = aimToTarget(this.aimOrigin, dragX, dragY, this.fieldBounds(), passingConfig);
        this.drawPreview();
        return true;
    }

    commitAim(gameObject) {
        if (!this.isAiming || gameObject !== this.aimingPlayer) return false;

        this.isAiming = false;
        if (!this.aimTarget) this.aimGraphics.clear();
        return true;
    }

    fieldBounds() {
        const game = this.game;
        return {
            left: game.margin,
            right: game.margin + game.fieldWidth,
            top: game.fieldY,
            bottom: game.fieldY + game.fieldHeight,
        };
    }

    drawPreview() {
        const g = this.aimGraphics;
        g.clear();
        if (!this.aimTarget) return;

        const { x: ox, y: oy } = this.aimOrigin;
        const { x: tx, y: ty } = this.aimTarget;
        const dx = tx - ox;
        const dy = ty - oy;
        const distance = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.floor(distance / passingConfig.aimDotSpacingPixels));

        g.fillStyle(config.colors.aimPreview, 1);
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            g.fillCircle(ox + dx * t, oy + dy * t, 3);
        }

        g.lineStyle(2, config.colors.catchReticle, 1);
        g.strokeCircle(tx, ty, passingConfig.catchRadiusPixels);
    }

    launchIfAimed() {
        if (!this.aimTarget) return;
        const game = this.game;

        // Cleared unconditionally from here down: the preview/reticle are aiming UI, done
        // being useful the moment a throw is committed to launching -- whether it actually
        // launches below or the carrier lookup fails and this bails out.
        this.aimGraphics.clear();

        const carrier = getAllPlayers(game).find((p) => p.hasBall && p.teamHasPossession(game));
        if (!carrier) {
            this.aimTarget = null;
            return;
        }

        const target = this.aimTarget;
        const distance = Math.hypot(target.x - carrier.x, target.y - carrier.y);

        carrier.setHasBall(false);

        this.flight = {
            originX: carrier.x,
            originY: carrier.y,
            targetX: target.x,
            targetY: target.y,
            distance,
            traveled: 0,
        };

        this.ball.setPosition(carrier.x, carrier.y);
        this.ball.setScale(1);
        this.ball.setVisible(true);

        log("pass", () =>
            `launch: from=(${carrier.x.toFixed(1)},${carrier.y.toFixed(1)}) ` +
            `to=(${target.x.toFixed(1)},${target.y.toFixed(1)}) dist=${distance.toFixed(1)}`
        );

        this.aimTarget = null;
    }

    // ponytail: flat lerp with a sin(t*pi) scale pulse standing in for height -- a top-down
    // zero-g field has no ground shadow, so a real y-offset arc reads as a wobble rather than a
    // throw. Set passing.arcScale to 0 to disable; add a shadow sprite if the lob ever needs to
    // read as genuinely airborne.
    advance(delta) {
        if (!this.flight) return;

        this.flight.traveled += passingConfig.ballSpeedPixelsPerSecond * (delta / 1000);
        const t = this.flight.distance > 0 ? Math.min(1, this.flight.traveled / this.flight.distance) : 1;

        const x = this.flight.originX + (this.flight.targetX - this.flight.originX) * t;
        const y = this.flight.originY + (this.flight.targetY - this.flight.originY) * t;
        this.ball.setPosition(x, y);
        this.ball.setScale(1 + passingConfig.arcScale * Math.sin(t * Math.PI));

        if (t >= 1) this.resolve();
    }

    // Nothing after a handleTackle call here may read or write this.flight, this.aimTarget or
    // the ball -- handleTackle -> pausePlay(true) -> clearPass() -> reset() already tore all
    // three down by the time it returns.
    resolve() {
        const game = this.game;
        const landing = { x: this.flight.targetX, y: this.flight.targetY };
        const { outcome, player } = findPassOutcome(landing, getAllPlayers(game), {
            catchRadiusPixels: passingConfig.catchRadiusPixels,
            possession: game.possession,
        });

        log("pass", () =>
            `resolve: outcome=${outcome} player=${player ? `id=${player.id} team=${player.team}` : "none"}`
        );

        if (outcome === "Catch") {
            player.setHasBall(true);
            // The QB is exempt from stuck-detection while holding the ball on a Pass play, so
            // its anchors are still sitting at his snap-time position -- re-anchor them to the
            // catch spot or a checkdown/screen behind that point reads as an instant "Stuck".
            game.resetBallCarrierTracking(player);
            this.ball.setVisible(false);
            this.aimGraphics.clear();
            this.flight = null;
            return;
        }

        if (outcome === "Interception") {
            player.setHasBall(true);
            game.handleTackle(player, null, "Interception");
            return;
        }

        game.handleTackle(null, null, "Incomplete");
        game.showIncompleteNextPlay();
    }

    reset() {
        this.isAiming = false;
        this.aimingPlayer = null;
        this.aimOrigin = null;
        this.aimTarget = null;
        this.flight = null;
        this.ball.setVisible(false);
        this.aimGraphics.clear();
    }

    ballInFlight() {
        return this.flight ? { x: this.ball.x, y: this.ball.y, scale: this.ball.scaleX } : null;
    }

    applyRecordedBall(frame) {
        if (frame) {
            this.ball.setPosition(frame.x, frame.y);
            this.ball.setScale(frame.scale);
            this.ball.setVisible(true);
        } else {
            this.ball.setVisible(false);
        }
    }
}
