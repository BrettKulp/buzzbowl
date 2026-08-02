import { describe, it, expect } from 'vitest';
import { makeFakeGame, makeFakePlayer } from '../fakes/makeFakeGame.js';
import { handleCollisionPairs } from '../../src/game/collisionHandling.js';

// The scene's pass-completion handler hands the ball to the receiver deterministically when
// the 0.7 random gate passes; these tests pick up right after that, with the catch already
// made and possession changed. The bug (#27) was that tackle detection only listened to
// collisionstart, which fires once when a contact *begins* -- a receiver already touching a
// defender or the sideline at the catch had that contact's collisionstart fire before either
// body held the ball, and nothing re-evaluated the pair when possession changed. These tests
// exercise the collisionactive path (one tick, no run), which is what the fix added.
describe('handleCollisionPairs', () => {
    it('rules a receiver down on the catch when they are already touching the sideline', () => {
        const receiver = makeFakePlayer({
            id: 2,
            team: 'Home',
            offensivePosition: 'WR_1',
            canReceivePass: true,
            x: 650,
        });
        const game = makeFakeGame({ players: [receiver] });

        // Pass is 100% complete: possession has transferred to the receiver and the play is
        // live. The receiver is already pressed against the sideline, so the contact predates
        // the possession change and produced no usable collisionstart.
        game.playStarted = true;
        receiver.hasBall = true;

        const sideline = { entityType: 'SideLine', name: 'TopSideline', id: 'sideline', x: 650 };
        const receiverBody = { gameObject: receiver };
        const sidelineBody = { gameObject: sideline };

        // One collisionactive tick -- the very next frame after the catch, not a run.
        handleCollisionPairs(game, { pairs: [{ bodyA: receiverBody, bodyB: sidelineBody }] });

        expect(game.handleTackle).toHaveBeenCalledWith(receiver, sideline, 'SideLine');
    });

    it('tackles the carrier on an ongoing contact with an opposing player', () => {
        const receiver = makeFakePlayer({ id: 2, team: 'Home', x: 650 });
        const defender = makeFakePlayer({ id: 12, team: 'Away', x: 650 });
        const game = makeFakeGame({ players: [receiver, defender] });

        game.playStarted = true;
        receiver.hasBall = true;

        handleCollisionPairs(game, {
            pairs: [{ bodyA: { gameObject: receiver }, bodyB: { gameObject: defender } }],
        });

        expect(game.handleTackle).toHaveBeenCalledWith(receiver, defender);
    });

    it('does not re-fire a touchdown once the play has been scored', () => {
        const receiver = makeFakePlayer({ id: 2, team: 'Home', x: 800 });
        const endzone = { entityType: 'EndZone', name: 'RightEndZone', id: 'rightEndZone', x: 1455 };
        const game = makeFakeGame({ players: [receiver] });

        // The play keeps simulating through the touchdown celebration window with the carrier
        // still inside the endzone sensor, and collisionactive re-fires the pair every tick.
        game.playStarted = true;
        receiver.hasBall = true;
        game.scored = true;

        handleCollisionPairs(game, {
            pairs: [{ bodyA: { gameObject: receiver }, bodyB: { gameObject: endzone } }],
        });

        expect(game.handleTackle).not.toHaveBeenCalled();
        expect(game.nextPlayButton.enable).not.toHaveBeenCalled();
    });

    it('ignores collisions before the play starts', () => {
        const receiver = makeFakePlayer({ id: 2, team: 'Home' });
        const defender = makeFakePlayer({ id: 12, team: 'Away' });
        const game = makeFakeGame({ players: [receiver, defender] });

        receiver.hasBall = true;

        handleCollisionPairs(game, {
            pairs: [{ bodyA: { gameObject: receiver }, bodyB: { gameObject: defender } }],
        });

        expect(game.handleTackle).not.toHaveBeenCalled();
    });
});
