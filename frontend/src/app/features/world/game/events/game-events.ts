import Phaser from 'phaser';

export type LessonProgressSnapshot = Readonly<{
    currentLessonId: string | null;
    completedLessonIds: readonly string[];
}>;

export type OpenLessonRequest = Readonly<{
    lessonId: string;
}>;

export type SceneLoadingSnapshot = Readonly<{
    sceneKey: string;
    phase: 'loading' | 'preparing' | 'ready' | 'error';
    /** Progress of Phaser's resource queue, from 0 to 1; not elapsed time. */
    progress: number;
}>;

export const gameEvents = new Phaser.Events.EventEmitter();

export const GameEvents = {
    OPEN_LESSON: 'open-lesson',
    OPEN_DIALOGUE: 'open-dialogue',

    SCENE_CHANGED: 'scene-changed',
    SCENE_LOADING: 'scene-loading',
    LESSON_PROGRESS_CHANGED: 'lesson-progress-changed',

    LOCK_PLAYER: 'lock-player',
    UNLOCK_PLAYER: 'unlock-player'
} as const;
