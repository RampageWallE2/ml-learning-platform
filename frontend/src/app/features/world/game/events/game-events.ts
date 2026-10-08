import Phaser from 'phaser';
import type { MinimapMapData, MinimapPlayerPosition } from '../../../../core/minimap/minimap.types';
import type { DialogueRequest } from '../../components/dialogue/dialogue.types';

export type { MinimapMapData, MinimapPlayerPosition };

export type LessonProgressSnapshot = Readonly<{
  currentLessonId: string | null;
  completedLessonIds: readonly string[];
  openPitReportDelivered?: boolean;
  openPitIntroCompleted?: boolean | null;
}>;

export type OpenLessonRequest = Readonly<{
  lessonId: string;
}>;

export type DialogueCompletedRequest = Readonly<{
  dialogueId: string;
  sceneKey: string;
}>;

export type IntroGuidanceSnapshot = Readonly<{ sceneKey: string; active: boolean }>;

export type SceneLoadingSnapshot = Readonly<{
  sceneKey: string;
  phase: 'loading' | 'preparing' | 'ready' | 'error';
  /** Progress of Phaser's resource queue, from 0 to 1; not elapsed time. */
  progress: number;
}>;

export const GameEvents = {
  OPEN_LESSON: 'open-lesson',
  OPEN_DIALOGUE: 'open-dialogue',
  DIALOGUE_COMPLETED: 'dialogue-completed',
  INTRO_GUIDANCE_CHANGED: 'intro-guidance-changed',
  INTRO_GUIDANCE_DISMISSED: 'intro-guidance-dismissed',

  SCENE_CHANGED: 'scene-changed',
  SCENE_LOADING: 'scene-loading',
  LESSON_PROGRESS_CHANGED: 'lesson-progress-changed',
  MINIMAP_MAP_CHANGED: 'minimap-map-changed',
  MINIMAP_PLAYER_CHANGED: 'minimap-player-changed',

  LOCK_PLAYER: 'lock-player',
  UNLOCK_PLAYER: 'unlock-player',
} as const;

type GameEventArguments = {
  [GameEvents.OPEN_LESSON]: [request: OpenLessonRequest];
  [GameEvents.OPEN_DIALOGUE]: [request: DialogueRequest];
  [GameEvents.DIALOGUE_COMPLETED]: [request: DialogueCompletedRequest];
  [GameEvents.INTRO_GUIDANCE_CHANGED]: [snapshot: IntroGuidanceSnapshot];
  [GameEvents.INTRO_GUIDANCE_DISMISSED]: [sceneKey: string];
  [GameEvents.SCENE_CHANGED]: [sceneKey: string];
  [GameEvents.SCENE_LOADING]: [snapshot: SceneLoadingSnapshot];
  [GameEvents.LESSON_PROGRESS_CHANGED]: [snapshot: LessonProgressSnapshot];
  [GameEvents.MINIMAP_MAP_CHANGED]: [map: MinimapMapData | null];
  [GameEvents.MINIMAP_PLAYER_CHANGED]: [position: MinimapPlayerPosition];
  [GameEvents.LOCK_PLAYER]: [];
  [GameEvents.UNLOCK_PLAYER]: [];
};

type GameEventName = keyof GameEventArguments;
type GameEventListener<Event extends GameEventName> = (...args: GameEventArguments[Event]) => void;

/** Compile-time contract over the unchanged Phaser emitter. */
interface GameEventEmitter {
  emit<Event extends GameEventName>(event: Event, ...args: GameEventArguments[Event]): boolean;
  on<Event extends GameEventName>(
    event: Event,
    listener: GameEventListener<Event>,
    context?: unknown,
  ): this;
  once<Event extends GameEventName>(
    event: Event,
    listener: GameEventListener<Event>,
    context?: unknown,
  ): this;
  off<Event extends GameEventName>(
    event: Event,
    listener?: GameEventListener<Event>,
    context?: unknown,
    once?: boolean,
  ): this;
  addListener<Event extends GameEventName>(
    event: Event,
    listener: GameEventListener<Event>,
    context?: unknown,
  ): this;
  removeListener<Event extends GameEventName>(
    event: Event,
    listener?: GameEventListener<Event>,
    context?: unknown,
    once?: boolean,
  ): this;
  removeAllListeners(event?: GameEventName): this;
  listenerCount(event: GameEventName): number;
}

export const gameEvents: GameEventEmitter = new Phaser.Events.EventEmitter();
