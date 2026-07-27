import { StandardGameScene } from './scenes/StandardGameScene';
import { FreePlayScene } from './scenes/FreePlayScene';
import { MainMenu } from "./scenes/MainMenu";
import { AUTO, Game } from 'phaser';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    parent: 'game-container',
    backgroundColor: '#333333',
    resolution: Math.min(window.devicePixelRatio || 1, 1.5),
    antialias: true, // Keep anti-aliasing for smooth shapes/lines
    // pixelArt: true, // Keep commented out
    roundPixels: false, // Keep false for smooth movement and rotation
    physics: {
        default: 'matter',
        matter: {
            debug: false,
            gravity: { y: 0 },
            setBounds: true,
            plugins: {
                attractors: true
            }
        }
    },
    scale: {
        mode: Phaser.Scale.FIT, // Still use FIT to scale to container
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1600,
        height: 900,
        parent: 'game-container',
    },
    scene: [
        MainMenu,
        FreePlayScene,
        StandardGameScene,
    ],
    audio: false,
};

const StartGame = (parent) => {
    return new Game({ ...config, parent });
}

export default StartGame;
