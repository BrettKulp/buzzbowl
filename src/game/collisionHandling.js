import { log } from "./logger";

function describeCollider(obj, body) {
    return obj ? (obj.entityType || obj.name || obj.constructor?.name || "unknown") : (body?.label || "unknown");
}

// Shared by the collisionstart (new contact) and collisionactive (ongoing contact) event
// handlers. Only the new-contact path logs the general collision line -- collisionactive
// re-evaluates the same pair every tick, so logging there would flood the console.
export function handleCollisionPairs(game, event, isStart) {
    // scored guard: the play keeps simulating through the touchdown celebration window
    // with the carrier still inside the endzone sensor, and collisionactive would
    // otherwise re-fire the touchdown (and re-award the points) every tick.
    if (!game.playStarted || game.scored) {
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

        if (isStart) {
            log("collision", () =>
                `collision: A=${describeCollider(gameObjectA, bodyA)} B=${describeCollider(gameObjectB, bodyB)}`
            );
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

        if (otherPlayer?.team !== ballCarrier.team) {
            log("collisionWithBallCarrier", () => {
                const elapsedMs = game.snapAt != null ? (game.time.now - game.snapAt).toFixed(0) : "?";
                return `collision: elapsedMs=${elapsedMs} ballCarrier=id=${ballCarrier.id} team=${ballCarrier.team} x=${ballCarrier.x.toFixed(1)} ` +
                    `otherPlayer=${otherPlayer ? `id=${otherPlayer.id} team=${otherPlayer.team} entityType=${otherPlayer.entityType} x=${otherPlayer.x?.toFixed?.(1)}` : "none"}`;
            });
        }

        if (otherPlayer?.entityType === 'SideLine') {
            game.handleTackle(ballCarrier, otherPlayer, "SideLine");
            break;
        }

        if (otherPlayer?.entityType === 'EndZone' &&
            ((game.targetEndzone === "Right" && otherPlayer.name === "RightEndZone") ||
                (game.targetEndzone === "Left" && otherPlayer.name === "LeftEndZone"))) {
            game.handleTackle(ballCarrier, otherPlayer, "Touchdown");
            game.nextPlayButton.enable();
            break;
        }

        if (
            otherPlayer?.team &&
            ballCarrier.team !== otherPlayer.team
        ) {
            game.handleTackle(ballCarrier, otherPlayer);
            break;
        }
    }
}
