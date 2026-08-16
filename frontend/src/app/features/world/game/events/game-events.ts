import Phaser from 'phaser';

export const gameEvents = new Phaser.Events.EventEmitter();

export const GameEvents = {
    OPEN_LESSON: 'open-lesson',
    OPEN_DIALOGUE: 'open-dialogue',

    LOCK_PLAYER: 'lock-player',
    UNLOCK_PLAYER: 'unlock-player'
} as const;