import Phaser from 'phaser';

import { BaseWorldScene } from '../../../../core/base-world.scene';

import { getObjectLayerOrThrow, getTiledRectangle } from '../../../../core/tiled/tiled.utils';

import { TilemapBuildResult } from '../tiled/tilemap-config.types';

import { WORLD_MAP_CONFIG } from './world.map.config';

export class WorldScene extends BaseWorldScene {
  private controlCenterInterior?: Phaser.GameObjects.Zone;

  private controlCenterRoof?: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

  private isInsideControlCenter = false;

  constructor() {
    super('WorldScene', WORLD_MAP_CONFIG);
  }

  protected override onSceneCreated(buildResult: TilemapBuildResult): void {
    const controlCenterRoof = buildResult.layers.get('Upper/ControlCenterRoof');

    if (!controlCenterRoof) {
      throw new Error('No se encontró Upper/ControlCenterRoof');
    }

    this.controlCenterRoof = controlCenterRoof;

    this.createInteriorZones(buildResult.map);
  }

  protected override onSceneUpdated(): void {
    this.updateControlCenterInterior();
  }

  private createInteriorZones(map: Phaser.Tilemaps.Tilemap): void {
    const objectLayer = getObjectLayerOrThrow(map, 'InteriorZones');

    const interiorObject = objectLayer.objects.find(
      (object) => object.name === 'control-center-interior',
    );

    if (!interiorObject) {
      throw new Error('No existe control-center-interior en Tiled');
    }

    const rectangle = getTiledRectangle(interiorObject);

    if (!rectangle) {
      throw new Error('control-center-interior no tiene dimensiones válidas');
    }

    this.controlCenterInterior = this.add.zone(
      rectangle.centerX,
      rectangle.centerY,
      rectangle.width,
      rectangle.height,
    );
  }

  private enterControlCenter(): void {
    this.controlCenterRoof?.setVisible(false);
  }

  private exitControlCenter(): void {
    this.controlCenterRoof?.setVisible(true);
  }

  private updateControlCenterInterior(): void {
    if (!this.controlCenterInterior) {
      return;
    }

    const playerBounds = this.playerController.sprite.getBounds();

    const interiorBounds = this.controlCenterInterior.getBounds();

    const isInside = Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, interiorBounds);

    if (isInside && !this.isInsideControlCenter) {
      console.log('ENTRÓ AL CENTRO DE CONTROL');

      this.controlCenterRoof?.setAlpha(0.15);
    }

    if (!isInside && this.isInsideControlCenter) {
      console.log('SALIÓ DEL CENTRO DE CONTROL');

      this.controlCenterRoof?.setAlpha(1);
    }

    this.isInsideControlCenter = isInside;
  }
}
