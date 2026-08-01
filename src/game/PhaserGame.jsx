import { forwardRef, useLayoutEffect, useRef } from 'react';
import StartGame from './main';

export const PhaserGame = forwardRef(function PhaserGame(_props, ref) {
    const game = useRef();
    const containerRef = useRef();

    // Create the game inside a useLayoutEffect hook to avoid the game being created outside the DOM
    useLayoutEffect(() => {
        if (game.current === undefined && containerRef.current) {
            // Pass the actual DOM element instead of just the ID
            game.current = StartGame(containerRef.current);

            // Add a class to the canvas element created by Phaser
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas) {
                canvas.classList.add('phaser-canvas');
            }

            if (ref !== null) {
                ref.current = { game: game.current, scene: null };
            }
        }

        // Phaser's Scale.FIT only recalculates on a window 'resize'/'orientationchange' event or
        // its own ~500ms poll, and that poll rides the RAF loop the browser throttles in a
        // background tab. A game booted while its tab isn't visible can lock in a stale size
        // with no resize event ever firing to correct it, so force a recheck once it's shown.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                game.current?.scale.refresh();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (game.current) {
                game.current.destroy(true);
                game.current = undefined;
            }
        }
    }, [ref]);

    return (
        <div
            ref={containerRef}
            id="game-container"
            className="phaser-container"
        ></div>
    );
});
