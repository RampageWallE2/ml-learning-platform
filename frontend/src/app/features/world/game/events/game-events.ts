import Phaser from 'phaser';

export const gameEvents = new Phaser.Events.EventEmitter();

export const GameEvents = {
    OPEN_LESSON: 'open-lesson'
} as const;