import Phaser from 'phaser';
import { HubScene } from '../scenes/hub/hub.scene';
import { OpenPitScene } from '../scenes/open-pit/open-pit.scene';
import { SurfaceSelectionScene } from '../scenes/surface-selection/surface-selection.scene';
import { Zone02Scene } from '../scenes/zone-02/zone-02.scene';
import { Zone03Scene } from '../scenes/zone-03/zone-03.scene';
import { Zone04Scene } from '../scenes/zone-04/zone-04.scene';
import { QuarriesScene } from '../scenes/quarries/quarries.scene';
import {
  WORLD_SESSION_REGISTRY_KEY,
  type WorldSceneKey,
  type WorldSessionSnapshot,
} from '../../../../core/world-session/world-session.types';
import { orderWorldSceneKeys } from '../../../../core/world-session/world-scene-order';

type WorldSceneConstructor = new () => Phaser.Scene;

const WORLD_SCENES: Record<WorldSceneKey, WorldSceneConstructor> = {
  HubScene,
  SurfaceSelectionScene,
  OpenPitScene,
  QuarriesScene,
  Zone02Scene,
  Zone03Scene,
  Zone04Scene,
};

const baseGameConfig: Phaser.Types.Core.GameConfig = {
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
        y: 0,
      },
      debug: false,
    },
  },
};

export function createGameConfig(
  restoredSession: WorldSessionSnapshot | null = null,
): Phaser.Types.Core.GameConfig {
  const initialScene = restoredSession?.sceneKey ?? 'HubScene';
  const orderedSceneKeys = orderWorldSceneKeys(initialScene);
  const orderedScenes = orderedSceneKeys.map((key) => WORLD_SCENES[key]);

  return {
    ...baseGameConfig,
    scene: orderedScenes,
    callbacks: restoredSession
      ? {
          preBoot: (game) => {
            game.registry.set(WORLD_SESSION_REGISTRY_KEY, restoredSession);
          },
        }
      : undefined,
  };
}
