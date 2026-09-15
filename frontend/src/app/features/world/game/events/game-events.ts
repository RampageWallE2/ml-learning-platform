import Phaser from 'phaser';

export type LessonProgressSnapshot = Readonly<{
    currentLessonId: string | null;
    completedLessonIds: readonly string[];
}>;

export const gameEvents = new Phaser.Events.EventEmitter();

export const GameEvents = {
    OPEN_LESSON: 'open-lesson',
    OPEN_DIALOGUE: 'open-dialogue',

    SCENE_CHANGED: 'scene-changed',
    LESSON_PROGRESS_CHANGED: 'lesson-progress-changed',

    LOCK_PLAYER: 'lock-player',
    UNLOCK_PLAYER: 'unlock-player'
} as const;
