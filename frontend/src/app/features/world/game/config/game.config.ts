import Phaser from 'phaser';
import { HubScene } from '../scenes/hub/hub.scene';
import { OpenPitScene } from '../scenes/open-pit/open-pit.scene';
import { SurfaceSelectionScene } from '../scenes/surface-selection/surface-selection.scene';
import { Zone02Scene } from '../scenes/zone-02/zone-02.scene';
import { Zone03Scene } from '../scenes/zone-03/zone-03.scene';
import { Zone04Scene } from '../scenes/zone-04/zone-04.scene';
import { QuarriesScene } from '../scenes/quarries/quarries.scene';

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
        y: 0,
      },
      debug: false,
    },
  },
  scene: [
    HubScene,
    SurfaceSelectionScene,
    OpenPitScene,
    QuarriesScene,
    Zone02Scene,
    Zone03Scene,
    Zone04Scene,
  ],
};
