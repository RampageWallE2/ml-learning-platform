import { BaseWorldScene } from '../../../../../core/base-world.scene';
import { buildOpenPitMinimap } from '../../../../../core/minimap/minimap-data';
import { findSpawnPoint } from '../../../../../core/tiled/tiled.utils';
import type { TiledPoint } from '../../../../../core/tiled/tiled.types';
import type { TilemapBuildResult } from '../../tiled/tilemap-config.types';
import { gameEvents, GameEvents, type MinimapPlayerPosition, type DialogueCompletedRequest, type LessonProgressSnapshot } from '../../events/game-events';
import { OPEN_PIT_INTRO } from '../../../lessons/data/open-pit-intro.data';

import { OPEN_PIT_MAP_CONFIG } from './open-pit.map.config';

export class OpenPitScene extends BaseWorldScene {
  private minimapReady = false;
  private lastMinimapUpdate = 0;
  private lastMinimapPosition: MinimapPlayerPosition | null = null;
  private introArrival: TiledPoint | null = null;
  private entryResolved = false;
  private pendingArrival: TiledPoint | null = null;

  constructor() {
    super('OpenPitScene', OPEN_PIT_MAP_CONFIG);
  }

  protected override onSceneCreated({ map }: TilemapBuildResult): void {
    this.introArrival = findSpawnPoint(map, 'pit-intro-arrival');
    this.entryResolved = false;
    this.pendingArrival = null;
    gameEvents.on(GameEvents.DIALOGUE_COMPLETED, this.handleDialogueCompleted);
    gameEvents.on(GameEvents.LESSON_PROGRESS_CHANGED, this.handleEntryProgress);
    const data = buildOpenPitMinimap(map);
    this.minimapReady = data !== null;
    this.lastMinimapPosition = null;
    gameEvents.emit(GameEvents.MINIMAP_MAP_CHANGED, data);
    this.publishMinimapPosition();
  }

  protected override onSceneUpdated(): void {
    // Entry events arrive before the initial fade is done. Wait until input is
    // available rather than dropping the teleport or interrupting an activity.
    if (this.pendingArrival && !this.playerController.isLocked()) {
      const arrival = this.pendingArrival;
      this.pendingArrival = null;
      this.teleportPlayer(arrival);
    }
    if (this.minimapReady && this.time.now - this.lastMinimapUpdate >= 200) this.publishMinimapPosition();
  }

  private publishMinimapPosition(): void {
    if (!this.minimapReady) return;
    this.lastMinimapUpdate = this.time.now;
    const sprite = this.playerController.sprite;
    const key = sprite.anims.currentAnim?.key ?? '';
    const heading = key.endsWith('-right') ? 90 : key.endsWith('-down') ? 180 : key.endsWith('-left') ? 270 : 0;
    const position: MinimapPlayerPosition = {
      sceneKey: 'OpenPitScene', x: Math.round(sprite.x), y: Math.round(sprite.y), heading,
    };
    const previous = this.lastMinimapPosition;
    if (previous && previous.x === position.x && previous.y === position.y && previous.heading === heading) return;
    this.lastMinimapPosition = position;
    gameEvents.emit(GameEvents.MINIMAP_PLAYER_CHANGED, position);
  }

  protected override onSceneShutdown(): void {
    gameEvents.off(GameEvents.DIALOGUE_COMPLETED, this.handleDialogueCompleted);
    gameEvents.off(GameEvents.LESSON_PROGRESS_CHANGED, this.handleEntryProgress);
    this.introArrival = null;
    this.pendingArrival = null;
    this.entryResolved = false;
    this.minimapReady = false;
    this.lastMinimapPosition = null;
    gameEvents.emit(GameEvents.MINIMAP_MAP_CHANGED, null);
  }

  private readonly handleDialogueCompleted = (request: DialogueCompletedRequest): void => {
    if (request.sceneKey === 'OpenPitScene' && request.dialogueId === OPEN_PIT_INTRO.id && this.introArrival) {
      this.entryResolved = true;
      this.pendingArrival = this.introArrival;
    }
  };

  private readonly handleEntryProgress = (progress: LessonProgressSnapshot): void => {
    if (progress.openPitIntroCompleted === false || progress.openPitIntroCompleted === null) {
      this.pendingArrival = null;
    }
    if (this.entryResolved || typeof progress.openPitIntroCompleted !== 'boolean') return;
    this.entryResolved = true;
    if (progress.openPitIntroCompleted && !this.restoredPositionApplied) {
      this.pendingArrival = this.introArrival;
    }
  };
}
