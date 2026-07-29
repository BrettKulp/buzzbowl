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

        return () => {
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
