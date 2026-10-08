import { BaseWorldScene } from '../../../../../core/base-world.scene';
import { buildOpenPitMinimap } from '../../../../../core/minimap/minimap-data';
import { findSpawnPoint } from '../../../../../core/tiled/tiled.utils';
import type { TiledPoint } from '../../../../../core/tiled/tiled.types';
import type { TilemapBuildResult } from '../../tiled/tilemap-config.types';
import { gameEvents, GameEvents, type MinimapPlayerPosition, type DialogueCompletedRequest } from '../../events/game-events';
import { OPEN_PIT_INTRO } from '../../../lessons/data/open-pit-intro.data';

import { OPEN_PIT_MAP_CONFIG } from './open-pit.map.config';

export class OpenPitScene extends BaseWorldScene {
  private minimapReady = false;
  private lastMinimapUpdate = 0;
  private lastMinimapPosition: MinimapPlayerPosition | null = null;
  private introArrival: TiledPoint | null = null;

  constructor() {
    super('OpenPitScene', OPEN_PIT_MAP_CONFIG);
  }

  protected override onSceneCreated({ map }: TilemapBuildResult): void {
    this.introArrival = findSpawnPoint(map, 'pit-intro-arrival');
    gameEvents.on(GameEvents.DIALOGUE_COMPLETED, this.handleDialogueCompleted);
    const data = buildOpenPitMinimap(map);
    this.minimapReady = data !== null;
    this.lastMinimapPosition = null;
    gameEvents.emit(GameEvents.MINIMAP_MAP_CHANGED, data);
    this.publishMinimapPosition();
  }

  protected override onSceneUpdated(): void {
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
    this.introArrival = null;
    this.minimapReady = false;
    this.lastMinimapPosition = null;
    gameEvents.emit(GameEvents.MINIMAP_MAP_CHANGED, null);
  }

  private readonly handleDialogueCompleted = (request: DialogueCompletedRequest): void => {
    if (request.sceneKey === 'OpenPitScene' && request.dialogueId === OPEN_PIT_INTRO.id && this.introArrival) {
      this.teleportPlayer(this.introArrival);
    }
  };
}
