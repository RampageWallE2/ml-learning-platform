import Phaser from 'phaser'; 
import { WorldScene } from '../scenes/world.scene'; 

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    backgroundColor: '#1d1d1d',

    parent: 'phaser-container',

    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
    },

    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                x: 0,
                y: 0
            },
            debug: false
        }
    },
    scene: [
        WorldScene
    ]
}
